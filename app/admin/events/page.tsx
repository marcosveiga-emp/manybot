import { db } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function EventsPage() {
  const authed = await getSession();
  if (!authed) redirect("/admin/login");

  const { data: events } = await db
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Eventos</h1>

      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="text-left px-4 py-3 font-medium text-zinc-600">
                Tipo
              </th>
              <th className="text-left px-4 py-3 font-medium text-zinc-600">
                Usuario
              </th>
              <th className="text-left px-4 py-3 font-medium text-zinc-600">
                Mensagem
              </th>
              <th className="text-left px-4 py-3 font-medium text-zinc-600">
                Keyword
              </th>
              <th className="text-left px-4 py-3 font-medium text-zinc-600">
                Processado
              </th>
              <th className="text-left px-4 py-3 font-medium text-zinc-600">
                Data
              </th>
            </tr>
          </thead>
          <tbody>
            {(events ?? []).map((e) => (
              <tr
                key={e.id}
                className="border-b border-zinc-100 hover:bg-zinc-50"
              >
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      e.event_type === "comment"
                        ? "bg-blue-100 text-blue-700"
                        : e.event_type === "story_reply"
                          ? "bg-pink-100 text-pink-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {e.event_type === "comment"
                      ? "Comentario"
                      : e.event_type === "story_reply"
                        ? "Story"
                        : "DM"}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium max-w-[120px] truncate">
                  @{e.sender_username ?? "anon"}
                </td>
                <td className="px-4 py-3 text-zinc-500 max-w-[200px] truncate">
                  {e.message_text ?? "-"}
                </td>
                <td className="px-4 py-3">
                  {e.matched_keyword ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                      {e.matched_keyword}
                    </span>
                  ) : (
                    <span className="text-zinc-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {e.processed ? (
                    <span className="text-green-600 text-xs">Sim</span>
                  ) : (
                    <span className="text-zinc-400 text-xs">Nao</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">
                  {e.created_at
                    ? new Date(e.created_at).toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(events ?? []).length === 0 && (
          <p className="text-zinc-400 text-center py-12">
            Nenhum evento registrado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
