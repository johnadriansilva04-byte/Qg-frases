import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe, Rocket, Star, Sparkles } from "lucide-react";
import { CidadelaEmblem, PergaminhoIcon, Amelas } from "@/components/CidadelaBranding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cidadela do Pracinha | Jogos e Utilidades" },
      {
        name: "description",
        content: "Entre na Cidadela do Pracinha: jogos clássicos, biblioteca de livros e ferramentas de texto em um só lugar.",
      },
      { property: "og:title", content: "Cidadela do Pracinha | Jogos e Utilidades" },
      {
        property: "og:description", content: "Jogos, livros e ferramentas de texto em um só lugar." },
      { property: "og:url", content: "https://pracinha.online" },
      { property: "og:image", content: "https://pracinha.online/og-image.png" },
    ],
  }),
  component: Index,
});


const SECTIONS = [
  {
    icon: "gamepad",
    title: "Cidadela dos Clássicos",
    description: "Trilha de botão e muito mais",
    link: "/cidadela",
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: "pergaminho",
    title: "Desenvolvimento do Brio",
    description: "Biblioteca, Cartório e Ferramentas de Texto",
    link: "/brio",
    color: "from-amber-500 to-orange-500",
    bgColor: "bg-amber-500/10",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Efeito de grade cyberpunk */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.3)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]" />

      {/* Efeito de luz neon */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
        {/* Header — emblema da cidadela */}
        <header className="text-center mb-12 md:mb-16 flex flex-col items-center">
          <div className="relative mb-5">
            <div className="absolute -inset-4 rounded-[2rem] bg-purple-500/25 blur-2xl animate-pulse" />
            <div className="relative rounded-3xl border border-purple-400/30 bg-gradient-to-b from-slate-800/90 to-slate-900/90 p-4 md:p-5 shadow-2xl shadow-purple-900/40">
              <CidadelaEmblem />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            CIDADELA DO PRACINHA
          </h1>
          <Amelas className="mt-4 text-purple-500/40" />
          <p className="mt-5 text-lg md:text-xl text-slate-300 mb-2">Jogos clássicos com propósito</p>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Nossa intenção é educar e ensinar economia, educação financeira e raciocínio lógico
            para crianças e jovens através de jogos clássicos.
          </p>
          <p className="mt-4 text-xs md:text-sm text-purple-200/80 max-w-2xl mx-auto">
            Fundada por John Adrian, a Cidadela guarda um segredo em seus Pergaminhos.
            Encontre-os, negocie com a comunidade e descubra a história completa.
          </p>
        </header>

        {/* Seções principais */}
        <div className="grid gap-6 md:gap-8 w-full max-w-5xl mb-12 md:mb-16">
          {SECTIONS.map((section, index) => {
            return (
              <Link
                key={section.title}
                to={section.link}
                className="group relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm p-6 md:p-8 transition-all hover:scale-[1.02] hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/20 active:scale-[0.98] block"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${section.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                <div className="relative flex items-start gap-4 md:gap-6">
                  <div className={`p-3 md:p-4 rounded-xl ${section.bgColor} group-hover:scale-110 transition-transform`}>
                    {section.icon === "gamepad" && (
                      <svg width="40" height="40" viewBox="0 0 64 64" fill="none" className="w-10 h-10 md:w-12 md:h-12">
                        <rect x="4" y="16" width="56" height="32" rx="8" fill="url(#gamepadGrad)" />
                        <circle cx="16" cy="32" r="5" fill="#fff" opacity="0.9"/>
                        <circle cx="48" cy="32" r="5" fill="#fff" opacity="0.9"/>
                        <rect x="26" y="28" width="12" height="8" rx="2" fill="#fff" opacity="0.7"/>
                        <defs>
                          <linearGradient id="gamepadGrad" x1="4" y1="16" x2="60" y2="48" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#a855f7"/>
                            <stop offset="1" stopColor="#ec4899"/>
                          </linearGradient>
                        </defs>
                      </svg>
                    )}
                    {section.icon === "pergaminho" && <PergaminhoIcon />}
                    {section.icon === "book" && (
                      <svg width="40" height="40" viewBox="0 0 64 64" fill="none" className="w-10 h-10 md:w-12 md:h-12">
                        <path d="M8 12 L8 52 L32 48 L56 52 L56 12 L32 16 L8 12Z" fill="url(#bookGrad)" />
                        <path d="M32 16 L32 48" stroke="#fff" strokeWidth="2" opacity="0.5"/>
                        <path d="M12 20 L28 18" stroke="#fff" strokeWidth="2" opacity="0.4"/>
                        <path d="M12 28 L28 26" stroke="#fff" strokeWidth="2" opacity="0.4"/>
                        <path d="M12 36 L28 34" stroke="#fff" strokeWidth="2" opacity="0.4"/>
                        <path d="M36 18 L52 20" stroke="#fff" strokeWidth="2" opacity="0.4"/>
                        <path d="M36 26 L52 28" stroke="#fff" strokeWidth="2" opacity="0.4"/>
                        <path d="M36 34 L52 36" stroke="#fff" strokeWidth="2" opacity="0.4"/>
                        <defs>
                          <linearGradient id="bookGrad" x1="8" y1="12" x2="56" y2="52" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#3b82f6"/>
                            <stop offset="1" stopColor="#06b6d4"/>
                          </linearGradient>
                        </defs>
                      </svg>
                    )}
                    {section.icon === "pen" && (
                      <svg width="40" height="40" viewBox="0 0 64 64" fill="none" className="w-10 h-10 md:w-12 md:h-12">
                        <rect x="8" y="24" width="40" height="28" rx="2" fill="#fff" opacity="0.3"/>
                        <path d="M12 28 L44 28" stroke="#fff" strokeWidth="2" opacity="0.4"/>
                        <path d="M12 34 L36 34" stroke="#fff" strokeWidth="2" opacity="0.4"/>
                        <path d="M12 40 L40 40" stroke="#fff" strokeWidth="2" opacity="0.4"/>
                        <path d="M36 8 L56 28 L48 56 L28 36 L36 8Z" fill="url(#penGrad)" />
                        <path d="M36 8 L56 28" stroke="#fff" strokeWidth="2" opacity="0.5"/>
                        <defs>
                          <linearGradient id="penGrad" x1="36" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#22c55e"/>
                            <stop offset="1" stopColor="#10b981"/>
                          </linearGradient>
                        </defs>
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl md:text-2xl font-bold mb-2 group-hover:text-purple-400 transition-colors">
                      {section.title}
                    </h2>
                    <p className="text-sm md:text-base text-slate-400 group-hover:text-slate-300 transition-colors">
                      {section.description}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Rocket className="w-5 h-5 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-8 text-sm text-slate-400 mb-8">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <span>+50.000 usuários</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Brasil e mundo</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>Atualizado diariamente</span>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500">
          <p>© 2026 Cidadela do Pracinha — Seu universo digital</p>
          <div className="mt-2 flex justify-center gap-4">
            <Link to="/privacidade" className="hover:text-purple-400 transition">
              Privacidade
            </Link>
            <Link to="/termos" className="hover:text-purple-400 transition">
              Termos
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
