import { getSession } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex">
      <Sidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

async function Sidebar() {
  const authed = await getSession();

  return (
    <aside className="w-64 min-h-full bg-white border-r border-zinc-200 p-6 flex flex-col gap-6">
      <div>
        <Link href="/admin" className="text-xl font-bold tracking-tight">
          Manybot
        </Link>
      </div>
      <nav className="flex flex-col gap-1">
        <SidebarLink href="/admin">Dashboard</SidebarLink>
        <SidebarLink href="/admin/automations">Automacoes</SidebarLink>
        <SidebarLink href="/admin/contacts">Contatos</SidebarLink>
        <SidebarLink href="/admin/events">Eventos</SidebarLink>
      </nav>
      <div className="mt-auto">
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Voltar ao site
        </Link>
      </div>
    </aside>
  );
}

function SidebarLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors text-sm font-medium"
    >
      {children}
    </Link>
  );
}
