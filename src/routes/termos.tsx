import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso | QG Frases" },
      {
        name: "description",
        content: "Termos de uso do QG Frases. Conheça as regras e condições para usar nosso gerador de frases.",
      },
      { property: "og:title", content: "Termos de Uso | QG Frases" },
      {
        property: "og:description",
        content: "Termos de uso do QG Frases. Conheça as regras e condições para usar nosso gerador de frases.",
      },
    ],
  }),
  component: Termos,
});

function Termos() {
  return (
    <div className="flex min-h-screen flex-col items-center gap-4 p-3 md:p-6">
      <main className="painel w-full max-w-3xl rounded-3xl p-5 shadow-2xl md:p-8">
        <header className="mb-8 text-center">
          <Link to="/" className="text-xs font-semibold text-muted-foreground hover:text-primary">
            ← Voltar para o gerador de frases
          </Link>
          <h1 className="texto-marca mt-3 text-3xl font-black md:text-5xl">Termos de Uso</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Última atualização: Agosto de 2026
          </p>
        </header>

        <div className="prose prose-sm prose-slate max-w-none text-muted-foreground">
          <section className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-3">1. Aceitação dos Termos</h2>
            <p className="text-sm leading-relaxed">
              Ao acessar e usar o QG Frases, você concorda em cumprir estes termos de uso. Se você não concordar com qualquer parte destes termos, por favor, não use nosso site.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-3">2. Uso Permitido</h2>
            <p className="text-sm leading-relaxed mb-2">
              Você pode usar o QG Frases para:
            </p>
            <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1">
              <li>Gerar e copiar frases para uso pessoal</li>
              <li>Usar frases em redes sociais, posts e conteúdo digital</li>
              <li>Compartilhar frases com amigos e seguidores</li>
              <li>Explorar nossa biblioteca de livros recomendados</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-3">3. Uso Proibido</h2>
            <p className="text-sm leading-relaxed mb-2">
              Você NÃO pode:
            </p>
            <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1">
              <li>Usar o site para fins ilegais ou fraudulentos</li>
              <li>Copiar ou reproduzir nosso conteúdo sem permissão</li>
              <li>Tentar hackear, danificar ou interromper o funcionamento do site</li>
              <li>Usar bots ou scripts automatizados para acessar o site</li>
              <li>Reivindicar autoria sobre frases geradas pelo site</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-3">4. Propriedade Intelectual</h2>
            <p className="text-sm leading-relaxed mb-2">
              Sobre o conteúdo do site:
            </p>
            <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1">
              <li>O design, layout e código do site são propriedade do QG Frases</li>
              <li>As frases geradas podem ser usadas livremente para fins pessoais</li>
              <li>Links de afiliado são fornecidos para sua conveniência</li>
              <li>Imagens de livros são usadas conforme as licenças de seus respectivos proprietários</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-3">5. Limitação de Responsabilidade</h2>
            <p className="text-sm leading-relaxed">
              O QG Frases não garante que o site estará sempre disponível ou livre de erros. Não somos responsáveis por quaisquer danos diretos ou indiretos resultantes do uso do site.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-3">6. Links Externos</h2>
            <p className="text-sm leading-relaxed">
              Nosso site contém links para sites externos, incluindo Amazon e outros parceiros de afiliados. Não somos responsáveis pelo conteúdo ou práticas de privacidade desses sites externos.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-3">7. Anúncios</h2>
            <p className="text-sm leading-relaxed">
              O QG Frases usa Google AdSense para exibir anúncios. Ao clicar em anúncios, você pode ser redirecionado para sites de terceiros. Não controlamos o conteúdo desses anúncios.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-3">8. Modificações</h2>
            <p className="text-sm leading-relaxed">
              Reservamos o direito de modificar estes termos a qualquer momento. As alterações entram em vigor imediatamente após a publicação no site.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-3">9. Contato</h2>
            <p className="text-sm leading-relaxed">
              Para dúvidas sobre estes termos de uso, entre em contato: contato@qgfrases.com
            </p>
          </section>
        </div>
      </main>

      <footer className="my-4 text-center text-xs text-muted-foreground/70">
        <p>© 2026 QG Frases — Termos de Uso.</p>
      </footer>
    </div>
  );
}
