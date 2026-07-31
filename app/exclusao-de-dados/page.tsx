export default function ExclusaoDadosPage() {
  return (
    <div className="flex flex-col flex-1 items-center px-4 py-16">
      <main className="max-w-2xl w-full prose prose-zinc">
        <h1>Exclusao de Dados</h1>
        <p className="text-zinc-500">Ultima atualizacao: Julho 2026</p>

        <h2>Como solicitar a exclusao</h2>
        <p>
          Para solicitar a exclusao de todos os seus dados armazenados pelo
          Manybot, envie uma mensagem direta (DM) para a conta do Instagram que
          esta conectada ao sistema com a palavra &quot;EXCLUIR&quot; ou entre
          em contato pelo proprio Instagram.
        </p>

        <h2>Quais dados sao excluidos</h2>
        <ul>
          <li>Seu ID do Instagram e nome de usuario.</li>
          <li>Todas as mensagens e comentarios registrados.</li>
          <li>Historico de interacao com as automacoes.</li>
        </ul>

        <h2>Prazo</h2>
        <p>
          A exclusao e processada em ate 7 dias uteis apos a solicitacao. Voce
          recebera uma confirmacao por DM quando os dados forem removidos.
        </p>

        <h2>Contato</h2>
        <p>
          Envie uma DM para a conta conectada ao Manybot para qualquer duvida
          sobre exclusao de dados.
        </p>
      </main>
    </div>
  );
}
