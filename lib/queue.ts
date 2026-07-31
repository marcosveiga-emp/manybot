import { db } from "./supabase";
import { sendMessage } from "./instagram";

export interface QueueMessage {
  instagram_user_id: string;
  recipient_type: "id" | "comment_id";
  recipient_value: string;
  message: Record<string, unknown>;
}

export async function enqueue(msg: QueueMessage) {
  const { data, error } = await db
    .from("queue")
    .insert({
      instagram_user_id: msg.instagram_user_id,
      recipient_type: msg.recipient_type,
      recipient_value: msg.recipient_value,
      message: msg.message,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function enqueueMultiple(msgs: QueueMessage[]) {
  const { data, error } = await db
    .from("queue")
    .insert(
      msgs.map((m) => ({
        instagram_user_id: m.instagram_user_id,
        recipient_type: m.recipient_type,
        recipient_value: m.recipient_value,
        message: m.message,
        status: "pending",
      }))
    )
    .select();

  if (error) throw error;
  return data;
}

export async function claimNext(): Promise<{
  id: string;
  instagram_user_id: string;
  recipient_type: string;
  recipient_value: string;
  message: Record<string, unknown>;
} | null> {
  const { data, error } = await db.rpc("claim_next_message");
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function markSent(id: string) {
  await db.from("queue").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", id);
}

export async function markFailed(id: string, errorMsg: string) {
  await db
    .from("queue")
    .update({ status: "failed", error: errorMsg })
    .eq("id", id);
}

export async function drainQueue(token: string): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  const startTime = Date.now();
  const maxDuration = 45_000;
  const maxPerMinute = 25;

  while (sent + failed < maxPerMinute && Date.now() - startTime < maxDuration) {
    const msg = await claimNext();
    if (!msg) break;

    try {
      await sendMessage(msg.instagram_user_id, token, {
        recipient: { [msg.recipient_type]: msg.recipient_value },
        message: msg.message,
      });
      await markSent(msg.id);
      sent++;
    } catch (e) {
      await markFailed(msg.id, e instanceof Error ? e.message : "Unknown error");
      failed++;
    }

    await new Promise((r) => setTimeout(r, 250));
  }

  return { sent, failed };
}
