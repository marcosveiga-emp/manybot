import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-4">
      <main className="flex flex-col items-center gap-8 max-w-lg text-center">
        <h1 className="text-4xl font-bold tracking-tight">Manybot</h1>
        <p className="text-lg text-zinc-600 leading-relaxed">
          Automatize respostas e DMs do seu Instagram.<br />
          Quando alguem comenta a palavra certa, seu link chega na hora.
        </p>
        <div className="flex gap-4">
          <Link
            href="/api/oauth"
            className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-8 text-white font-medium transition-opacity hover:opacity-90"
          >
            Conectar Instagram
          </Link>
          <Link
            href="/admin"
            className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 px-8 text-zinc-700 font-medium transition-colors hover:bg-zinc-100"
          >
            Acessar Painel
          </Link>
        </div>
        <div className="flex gap-6 mt-4 text-sm text-zinc-400">
          <Link href="/privacidade" className="hover:text-zinc-600">
            Politica de Privacidade
          </Link>
          <Link href="/exclusao-de-dados" className="hover:text-zinc-600">
            Exclusao de Dados
          </Link>
        </div>
      </main>
    </div>
  );
}
