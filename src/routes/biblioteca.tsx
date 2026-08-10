import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listarLivros } from "@/lib/livros.functions";
import { AdSlot } from "@/components/AdSlot";

const livrosQuery = queryOptions({
  queryKey: ["livros"],
  queryFn: () => listarLivros(),
});

export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca de Livros | QG Frases" },
      {
        name: "description",
        content:
          "Nossa biblioteca de indicações de livros: motivação, fé, relacionamentos e finanças. Escolha o seu próximo livro.",
      },
      { property: "og:title", content: "Biblioteca de Livros | QG Frases" },
      {
        property: "og:description",
        content: "Indicações de livros selecionados para quem gosta de ler.",
      },
      { property: "og:url", content: "https://pracinha.online/biblioteca" },
      { property: "og:image", content: "https://pracinha.online/og-image.png" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(livrosQuery),
  component: Biblioteca,
  errorComponent: () => (
    <Aviso texto="Não conseguimos carregar a biblioteca agora. Tente novamente em instantes." />
  ),
  notFoundComponent: () => <Aviso texto="Página não encontrada." />,
});

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div className="painel rounded-3xl p-8">
        <p className="text-sm text-muted-foreground">{texto}</p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">
          ← Voltar para as frases
        </Link>
      </div>
    </div>
  );
}

function Biblioteca() {
  const { data: livros } = useSuspenseQuery(livrosQuery);

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 p-3 md:p-6">
      <div className="w-full max-w-5xl">
        <AdSlot rotulo="Banner Topo / Google AdSense" />
      </div>

      <main className="painel w-full max-w-5xl rounded-3xl p-5 shadow-2xl md:p-8">
        <header className="mb-8 text-center">
          <Link to="/" className="text-xs font-semibold text-muted-foreground hover:text-primary">
            ← Voltar para o gerador de frases
          </Link>
          <h1 className="texto-marca mt-3 text-3xl font-black md:text-5xl">Biblioteca</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
            Biblioteca de livros selecionados para quem gosta de ler
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Indicações de motivação, fé, relacionamentos e finanças. Escolha seu próximo livro.
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
            Contém links de afiliado
          </p>
        </header>

        {livros.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Nenhum livro cadastrado ainda. Adicione um livro no banco de dados e ele aparece aqui
            automaticamente.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {livros.map((livro) => (
              <article
                key={livro.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-background/50 transition hover:border-primary/50"
              >
                <div className="relative aspect-[3/2] overflow-hidden bg-secondary">
                  {livro.imagem_url ? (
                    <img
                      src={livro.imagem_url}
                      alt={`Capa do livro ${livro.titulo}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl">📚</div>
                  )}
                  {livro.destaque && (
                    <span className="botao-marca absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                      Destaque
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-primary">
                    {livro.categoria}
                  </span>
                  <h2 className="mt-1 text-lg font-bold leading-tight text-foreground">
                    {livro.titulo}
                  </h2>
                  {livro.autor && (
                    <p className="text-xs text-muted-foreground">por {livro.autor}</p>
                  )}
                  {livro.descricao && (
                    <p className="mt-2 flex-1 text-sm text-muted-foreground">{livro.descricao}</p>
                  )}
                  {livro.preco && (
                    <p className="mt-3 text-sm font-semibold text-foreground">{livro.preco}</p>
                  )}
                  <a
                    href={livro.link_afiliado}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="botao-marca mt-4 rounded-xl px-4 py-3 text-center text-sm font-bold"
                  >
                    Adquirir livro
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <div className="w-full max-w-5xl">
        <AdSlot rotulo="Banner Rodapé / Google AdSense" />
      </div>

      <footer className="my-4 text-center text-xs text-muted-foreground/70">
        <p>© 2026 QG Frases — Biblioteca de indicações.</p>
        <div className="mt-2 flex justify-center gap-4">
          <Link to="/privacidade" className="hover:text-primary transition">
            Privacidade
          </Link>
          <Link to="/termos" className="hover:text-primary transition">
            Termos
          </Link>
        </div>
      </footer>
    </div>
  );
}
