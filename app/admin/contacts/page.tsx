import { db } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const authed = await getSession();
  if (!authed) redirect("/admin/login");

  const cookieStore = await cookies();
  const selectedId = cookieStore.get("selected_ig_account")?.value;

  let query = db
    .from("contacts")
    .select("*")
    .order("first_contact_at", { ascending: false })
    .limit(200);

  if (selectedId) query = query.eq("instagram_user_id", selectedId);

  const { data: contacts } = await query;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Contatos</h1>

      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="text-left px-4 py-3 font-medium text-zinc-600">
                Usuario
              </th>
              <th className="text-left px-4 py-3 font-medium text-zinc-600">
                ID Instagram
              </th>
              <th className="text-left px-4 py-3 font-medium text-zinc-600">
                Primeiro contato
              </th>
              <th className="text-left px-4 py-3 font-medium text-zinc-600">
                Ultima resposta
              </th>
            </tr>
          </thead>
          <tbody>
            {(contacts ?? []).map((c) => (
              <tr
                key={c.id}
                className="border-b border-zinc-100 hover:bg-zinc-50"
              >
                <td className="px-4 py-3 font-medium">
                  @{c.username ?? "desconhecido"}
                </td>
                <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                  {c.instagram_id.slice(0, 16)}...
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {c.first_contact_at
                    ? new Date(c.first_contact_at).toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })
                    : "-"}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {c.last_response_at
                    ? new Date(c.last_response_at).toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(contacts ?? []).length === 0 && (
          <p className="text-zinc-400 text-center py-12">
            Nenhum contato capturado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
