import { db } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AutomationsList } from "./list";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const authed = await getSession();
  if (!authed) redirect("/admin/login");

  const cookieStore = await cookies();
  const selectedId = cookieStore.get("selected_ig_account")?.value;

  let configQuery = db.from("config").select("access_token, instagram_user_id");
  if (selectedId) configQuery = configQuery.eq("instagram_user_id", selectedId);
  
  // Use maybeSingle to prevent error if no config exists
  const { data: config } = await configQuery.limit(1).maybeSingle();

  let autoQ = db.from("automations").select("*").order("created_at", { ascending: false });
  if (config?.instagram_user_id) {
    autoQ = autoQ.eq("instagram_user_id", config.instagram_user_id);
  }
  const { data: automations } = await autoQ;

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
