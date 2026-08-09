import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | QG Frases" },
      {
        name: "description",
        content: "Política de privacidade do QG Frases. Saiba como coletamos, usamos e protegemos seus dados.",
      },
      { property: "og:title", content: "Política de Privacidade | QG Frases" },
      {
        property: "og:description",
        content: "Política de privacidade do QG Frases. Saiba como coletamos, usamos e protegemos seus dados.",
      },
    ],
  }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <div className="flex min-h-screen flex-col items-center gap-4 p-3 md:p-6">
      <main className="painel w-full max-w-3xl rounded-3xl p-5 shadow-2xl md:p-8">
        <header className="mb-8 text-center">
          <Link to="/" className="text-xs font-semibold text-muted-foreground hover:text-primary">
            ← Voltar para o gerador de frases
          </Link>
          <h1 className="texto-marca mt-3 text-3xl font-black md:text-5xl">Política de Privacidade</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Última atualização: Agosto de 2026
          </p>
        </header>

        <div className="prose prose-sm prose-slate max-w-none text-muted-foreground">
          <section className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-3">1. Introdução</h2>
            <p className="text-sm leading-relaxed">
              Esta Política de Privacidade descreve como o QG Frases coleta, usa e protege suas informações pessoais. Ao usar nosso site, você concorda com as práticas descritas nesta política.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-3">2. Informações que Coletamos</h2>
            <p className="text-sm leading-relaxed mb-2">
              Coletamos as seguintes informações:
            </p>
            <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1">
              <li>Dados de uso anônimos (páginas visitadas, tempo de permanência)</li>
              <li>Informações de cookies e tecnologias similares</li>
              <li>Endereço IP e informações do dispositivo</li>
              <li>Preferências de idioma e localização aproximada</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-3">3. Como Usamos suas Informações</h2>
            <p className="text-sm leading-relaxed mb-2">
              Usamos suas informações para:
            </p>
            <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1">
              <li>Melhorar a qualidade do nosso serviço</li>
              <li>Personalizar sua experiência</li>
              <li>Analizar tendências e padrões de uso</li>
              <li>Exibir anúncios relevantes através do Google AdSense</li>
              <li>Garantir a segurança do site</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-3">4. Cookies e Tecnologias Similares</h2>
            <p className="text-sm leading-relaxed mb-2">
              O QG Frases usa cookies e tecnologias similares para:
            </p>
            <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1">
              <li>Lembrar suas preferências</li>
              <li>Analizar o tráfego do site</li>
              <li>Exibir anúncios personalizados do Google AdSense</li>
              <li>Melhorar a funcionalidade do site</li>
            </ul>
            <p className="text-sm leading-relaxed mt-2">
              Você pode gerENCiar suas preferências de cookies através das configurações do seu navegador.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-3">5. Compartilhamento de Informações</h2>
            <p className="text-sm leading-relaxed mb-2">
              Não vendemos suas informações pessoais. Podemos compartilhar dados com:
            </p>
            <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1">
              <li>Google AdSense para exibição de anúncios</li>
              <li>Provedores de serviços que nos ajudam a operar o site</li>
              <li>Quando exigido por lei</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-3">6. Seus Direitos</h2>
            <p className="text-sm leading-relaxed mb-2">
              Você tem o direito de:
            </p>
            <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1">
              <li>Acessar suas informações pessoais</li>
              <li>Solicitar correção de dados incorretos</li>
              <li>Solicitar exclusão de seus dados</li>
              <li>Revogar consentimento para uso de cookies</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-3">7. Segurança</h2>
            <p className="text-sm leading-relaxed">
              Implementamos medidas de segurança para proteger suas informações, mas nenhum método de transmissão pela internet é 100% seguro.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-3">8. Contato</h2>
            <p className="text-sm leading-relaxed">
              Para dúvidas sobre esta política de privacidade, entre em contato conosco através do e-mail: contato@qgfrases.com
            </p>
          </section>
        </div>
      </main>

      <footer className="my-4 text-center text-xs text-muted-foreground/70">
        <p>© 2026 QG Frases — Política de Privacidade.</p>
      </footer>
    </div>
  );
}
