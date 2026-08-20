import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/campus")({
  head: () => ({
    meta: [
      { title: "Campus Universitário | Cidadela do Pracinha" },
      {
        name: "description",
        content: "Onde a vida acontece. Biblioteca, Laboratórios, Setor Comercial e Desenvolvimento do Brio.",
      },
      { property: "og:title", content: "Campus Universitário | Cidadela do Pracinha" },
      {
        property: "og:description",
        content: "Biblioteca, Laboratórios, Setor Comercial e Desenvolvimento do Brio.",
      },
      { property: "og:url", content: "https://pracinha.online/campus" },
      { property: "og:image", content: "https://pracinha.online/og-image.png" },
    ],
  }),
  component: Campus,
});

const SECTIONS = [
  {
    icon: "scroll",
    title: "Desenvolvimento do Brio",
    description: "Biblioteca, Laboratórios, Setor Comercial",
    link: "/brio",
    color: "from-amber-500 to-orange-500",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: "pen",
    title: "Gerador de Texto",
    description: "Frases e correção",
    link: "/gerador",
    color: "from-green-500 to-cyan-500",
    bgColor: "bg-green-500/10",
  },
];

function Campus() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Efeito de grade cyberpunk */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.3)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]" />

      {/* Efeito de luz neon */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
        {/* Header */}
        <header className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 64 64" fill="none" className="w-6 h-6">
                <path d="M32 8 L56 24 L56 48 L32 56 L8 48 L8 24 L32 8Z" fill="#fff" opacity="0.9" />
                <path d="M32 8 L32 56 M8 24 L56 24 M8 48 L56 48" stroke="#fff" strokeWidth="2" opacity="0.5" />
              </svg>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              CAMPUS UNIVERSITÁRIO
            </h1>
          </div>
          <p className="text-lg md:text-xl text-slate-300 mb-2">Onde a vida acontece</p>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Todos os integrantes da Cidadela fazem parte do Campus. Escolha sua função e participe.
          </p>
        </header>

        {/* Seções principais */}
        <div className="grid gap-6 md:gap-8 w-full max-w-5xl mb-12 md:mb-16">
          {SECTIONS.map((section, index) => {
            if (section.disabled) {
              return (
                <div
                  key={section.title}
                  className="group relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm p-6 md:p-8 opacity-50 cursor-not-allowed"
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${section.color} opacity-0`} />
                  <div className="relative flex items-start gap-4 md:gap-6">
                    <div className={`p-3 md:p-4 rounded-xl ${section.bgColor}`}>
                      {section.icon === "flask" && (
                        <svg width="40" height="40" viewBox="0 0 64 64" fill="none" className="w-10 h-10 md:w-12 md:h-12">
                          <path d="M24 8 L24 24 L16 48 L48 48 L40 24 L40 8 L24 8Z" fill="url(#flaskGrad)" />
                          <circle cx="32" cy="36" r="8" fill="#fff" opacity="0.3" />
                          <defs>
                            <linearGradient id="flaskGrad" x1="16" y1="8" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                              <stop stopColor="#a855f7" />
                              <stop offset="1" stopColor="#ec4899" />
                            </linearGradient>
                          </defs>
                        </svg>
                      )}
                      {section.icon === "store" && (
                        <svg width="40" height="40" viewBox="0 0 64 64" fill="none" className="w-10 h-10 md:w-12 md:h-12">
                          <path d="M8 16 L56 16 L52 48 L12 48 L8 16Z" fill="url(#storeGrad)" />
                          <path d="M16 16 L16 8 L24 8 L24 16 M40 16 L40 8 L48 8 L48 16" stroke="#fff" strokeWidth="2" opacity="0.5" />
                          <defs>
                            <linearGradient id="storeGrad" x1="8" y1="16" x2="56" y2="48" gradientUnits="userSpaceOnUse">
                              <stop stopColor="#22c55e" />
                              <stop offset="1" stopColor="#10b981" />
                            </linearGradient>
                          </defs>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl md:text-2xl font-bold mb-2 text-slate-400">
                        {section.title}
                      </h2>
                      <p className="text-sm md:text-base text-slate-500">
                        {section.description}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-slate-500">Em breve</span>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <Link
                key={section.title}
                to={section.link}
                className="group relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm p-6 md:p-8 transition-all hover:scale-[1.02] hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/20 active:scale-[0.98] block"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${section.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                <div className="relative flex items-start gap-4 md:gap-6">
                  <div className={`p-3 md:p-4 rounded-xl ${section.bgColor} group-hover:scale-110 transition-transform`}>
                    {section.icon === "scroll" && (
                      <svg width="40" height="40" viewBox="0 0 64 64" fill="none" className="w-10 h-10 md:w-12 md:h-12">
                        <path d="M8 12 L8 52 L32 48 L56 52 L56 12 L32 16 L8 12Z" fill="url(#scrollGrad)" />
                        <path d="M32 16 L32 48" stroke="#fff" strokeWidth="2" opacity="0.5" />
                        <defs>
                          <linearGradient id="scrollGrad" x1="8" y1="12" x2="56" y2="52" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#f59e0b" />
                            <stop offset="1" stopColor="#ea580c" />
                          </linearGradient>
                        </defs>
                      </svg>
                    )}
                    {section.icon === "book" && (
                      <svg width="40" height="40" viewBox="0 0 64 64" fill="none" className="w-10 h-10 md:w-12 md:h-12">
                        <path d="M8 12 L8 52 L32 48 L56 52 L56 12 L32 16 L8 12Z" fill="url(#bookGrad)" />
                        <path d="M32 16 L32 48" stroke="#fff" strokeWidth="2" opacity="0.5" />
                        <path d="M12 20 L28 18" stroke="#fff" strokeWidth="2" opacity="0.4" />
                        <path d="M12 28 L28 26" stroke="#fff" strokeWidth="2" opacity="0.4" />
                        <path d="M12 36 L28 34" stroke="#fff" strokeWidth="2" opacity="0.4" />
                        <path d="M36 18 L52 20" stroke="#fff" strokeWidth="2" opacity="0.4" />
                        <path d="M36 26 L52 28" stroke="#fff" strokeWidth="2" opacity="0.4" />
                        <path d="M36 34 L52 36" stroke="#fff" strokeWidth="2" opacity="0.4" />
                        <defs>
                          <linearGradient id="bookGrad" x1="8" y1="12" x2="56" y2="52" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#3b82f6" />
                            <stop offset="1" stopColor="#06b6d4" />
                          </linearGradient>
                        </defs>
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl md:text-2xl font-bold mb-2 group-hover:text-amber-400 transition-colors">
                      {section.title}
                    </h2>
                    <p className="text-sm md:text-base text-slate-400 group-hover:text-slate-300 transition-colors">
                      {section.description}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <svg width="20" height="20" viewBox="0 0 64 64" fill="none" className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all">
                      <path d="M12 32 L52 32 M40 20 L52 32 L40 44" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Voltar */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-amber-400 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 64 64" fill="none" className="w-4 h-4">
              <path d="M40 12 L24 32 L40 52" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Voltar para página inicial
          </Link>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500">
          <div className="mb-3 flex justify-center gap-4">
            <Link to="/privacidade" className="hover:text-amber-400 transition">
              Privacidade
            </Link>
            <Link to="/termos" className="hover:text-amber-400 transition">
              Termos
            </Link>
          </div>
          <p>© 2026 Cidadela do Pracinha — Campus Universitário</p>
        </footer>
      </div>
    </div>
  );
}
