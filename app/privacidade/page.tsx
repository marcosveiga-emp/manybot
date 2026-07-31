export default function PrivacidadePage() {
  return (
    <div className="flex flex-col flex-1 items-center px-4 py-16">
      <main className="max-w-2xl w-full prose prose-zinc">
        <h1>Politica de Privacidade</h1>
        <p className="text-zinc-500">Ultima atualizacao: Julho 2026</p>

        <h2>1. Dados coletados</h2>
        <p>
          O Manybot coleta apenas dados necessarios para o funcionamento da
          automacao de mensagens do Instagram:
        </p>
        <ul>
          <li>
            ID do Instagram e nome de usuario de quem interage com seus posts.
          </li>
          <li>Conteudo de comentarios e mensagens que contem as palavras-chave configuradas.</li>
          <li>Token de acesso a API do Instagram (armazenado criptografado).</li>
        </ul>

        <h2>2. Uso dos dados</h2>
        <p>
          Os dados sao usados exclusivamente para enviar respostas automaticas
          (DMs) com base nas automacoes que voce configurou. Nenhum dado e
          compartilhado com terceiros ou usado para marketing externo.
        </p>

        <h2>3. Armazenamento</h2>
        <p>
          Os dados sao armazenados no banco de dados Supabase (PostgreSQL), com
          acesso restrito apenas ao servidor via chave de servico. O banco fica
          em regiao escolhida pelo proprietario da conta.
        </p>

        <h2>4. Seus direitos</h2>
        <p>
          Voce pode solicitar a exclusao de todos os seus dados a qualquer
          momento. Consulte a pagina de{" "}
          <a href="/exclusao-de-dados">Exclusao de Dados</a>.
        </p>

        <h2>5. Contato</h2>
        <p>
          Para duvidas sobre privacidade, entre em contato pelo Instagram do
          proprietario da conta conectada ao Manybot.
        </p>
      </main>
    </div>
  );
}
