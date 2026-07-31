import { db } from "@/lib/supabase";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function AdminDashboard() {
  const authed = await getSession();
  if (!authed) redirect("/admin/login");

  const { data: config } = await db
    .from("config")
    .select("*")
    .eq("id", 1)
    .single();

  const { count: automationCount } = await db
    .from("automations")
    .select("*", { count: "exact", head: true });

  const { data: automations } = await db
    .from("automations")
    .select("*")
    .eq("active", true);

  const { count: contactCount } = await db
    .from("contacts")
    .select("*", { count: "exact", head: true });

  const { count: queuePending } = await db
    .from("queue")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: todayEvents } = await db
    .from("events")
    .select("*", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const connected = !!config?.access_token;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-zinc-500 mb-8">
        Visao geral do seu Manybot
      </p>

      {!connected && (
        <div className="mb-8 p-6 rounded-xl bg-amber-50 border border-amber-200">
          <h2 className="font-semibold text-amber-800 mb-2">
            Instagram nao conectado
          </h2>
          <p className="text-amber-700 mb-4">
            Conecte sua conta do Instagram para comecar a usar as automacoes.
          </p>
          <Link
            href="/api/oauth"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-purple-600 px-6 text-white font-medium text-sm transition-opacity hover:opacity-90"
          >
            Conectar Instagram
          </Link>
        </div>
      )}

      {connected && config && (
        <div className="mb-8 p-6 rounded-xl bg-green-50 border border-green-200 flex items-center gap-4">
          {config.profile_picture_url && (
            <img
              src={config.profile_picture_url}
              alt=""
              className="w-12 h-12 rounded-full"
            />
          )}
          <div>
            <p className="font-semibold text-green-800">
              Conectado como @{config.instagram_username}
            </p>
            <p className="text-sm text-green-600">
              Token expira em{" "}
              {config.token_expires_at
                ? new Date(config.token_expires_at).toLocaleDateString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })
                : "desconhecido"}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Automacoes"
          value={automationCount ?? 0}
          sub={`${automations?.length ?? 0} ativas`}
        />
        <StatCard
          label="Contatos"
          value={contactCount ?? 0}
          sub="total capturados"
        />
        <StatCard
          label="Na fila"
          value={queuePending ?? 0}
          sub="mensagens pendentes"
        />
        <StatCard
          label="Eventos (24h)"
          value={todayEvents ?? 0}
          sub="ultimas 24 horas"
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-white border border-zinc-200">
      <p className="text-sm text-zinc-500 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs text-zinc-400 mt-1">{sub}</p>
    </div>
  );
}
