import { db } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AutomationsList } from "./list";

export default async function AutomationsPage() {
  const authed = await getSession();
  if (!authed) redirect("/admin/login");

  const { data: automations } = await db
    .from("automations")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: config } = await db
    .from("config")
    .select("access_token, instagram_user_id")
    .eq("id", 1)
    .single();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Automacoes</h1>
      <AutomationsList
        automations={automations ?? []}
        hasToken={!!config?.access_token}
      />
    </div>
  );
}
