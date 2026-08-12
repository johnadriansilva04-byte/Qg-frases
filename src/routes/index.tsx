import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Gamepad2, Sparkles, Cpu, Globe, Rocket, Star, Tv } from "lucide-react";

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
    icon: Gamepad2,
    title: "Cidadela dos Clássicos",
    description: "Trilha de botão e muito mais",
    link: "/cidadela",
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Tv,
    title: "Pracinha do Brasileirão",
    description: "Transmissões ao vivo dos jogos do Brasileirão Série A e B",
    link: "/pracinha-brasileirao",
    color: "from-red-500 to-orange-500",
    bgColor: "bg-red-500/10",
  },
  {
    icon: BookOpen,
    title: "Biblioteca",
    description: "Livros selecionados de motivação, fé e desenvolvimento pessoal.",
    link: "/biblioteca",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Sparkles,
    title: "Gerador de Texto",
    description: "Frases prontas, correção de texto e muito mais. Crie conteúdo em segundos.",
    link: "/gerador",
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-500/10",
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
        {/* Header */}
        <header className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center animate-spin-slow">
              <Cpu className="w-6 h-6" />
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              CIDADELA DO PRACINHA
            </h1>
          </div>
          <p className="text-lg md:text-xl text-slate-300 mb-2">Jogos e Utilidades</p>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Entre em um universo digital onde jogos, conhecimento e criatividade se encontram.
            Explore, crie e divirta-se em um só lugar.
          </p>
        </header>

        {/* Seções principais */}
        <div className="grid gap-6 md:gap-8 w-full max-w-5xl mb-12 md:mb-16">
          {SECTIONS.map((section, index) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.title}
                to={section.link}
                className="group relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm p-6 md:p-8 transition-all hover:scale-[1.02] hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/20"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${section.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                <div className="relative flex items-start gap-4 md:gap-6">
                  <div className={`p-3 md:p-4 rounded-xl ${section.bgColor} group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r ${section.color} bg-clip-text text-transparent`} />
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
