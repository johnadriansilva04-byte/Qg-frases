import { createFileRoute, Link } from "@tanstack/react-router";
import { AdSlot } from "@/components/AdSlot";

export const Route = createFileRoute("/teste-de-qi")({
  head: () => ({
    meta: [
      { title: "Teste de QI | Desenvolvimento do Brio" },
      {
        name: "description",
        content:
          "Módulo Teste de QI do Desenvolvimento do Brio: Exercícios (treinamento com explicação das regras) e Simulação (avaliação de 32 questões, 25 minutos).",
      },
      { property: "og:title", content: "Teste de QI — Desenvolvimento do Brio" },
      {
        property: "og:description",
        content: "Treine o raciocínio com exercícios explicados e simule uma avaliação não verbal completa.",
      },
      { property: "og:url", content: "https://pracinha.online/teste-de-qi" },
      { property: "og:image", content: "https://pracinha.online/og-image.png" },
    ],
  }),
  component: TesteDeQI,
});

const SUBMODULOS = [
  {
    icon: "brain",
    title: "Exercícios",
    subtitulo: "Treinamento · Modo Ensino",
    description:
      "Pratique no seu ritmo: o motor gera matrizes de raciocínio lógico, você escolhe a peça que completa a figura e, logo após responder, recebe a explicação pedagógica das regras ocultas e recompensas em SALVE.",
    bullets: ["Geradas na hora, sempre novas", "Explicação das regras a cada resposta", "Recompensas em SALVE"],
    link: "/teste-qi",
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-500/10",
    badge: "ENSINO",
  },
  {
    icon: "gauge",
    title: "Simulação",
    subtitulo: "Avaliação · Modo Prova",
    description:
      "Prova completa e cronometrada: 32 questões inéditas em dificuldade crescente, 6 alternativas por questão, 25 minutos e sem feedback durante a prova. O resultado aparece apenas ao final — com estimativa experimental.",
    bullets: ["32 questões · 25 minutos", "Dificuldade progressiva", "Sem dicas durante a prova"],
    link: "/simulacao-qi",
    color: "from-indigo-500 to-violet-500",
    bgColor: "bg-indigo-500/10",
    badge: "AVALIAÇÃO",
  },
];

function TesteDeQI() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Efeito de grade cyberpunk */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.3)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]" />
      {/* Luzes neon */}
      <div className="absolute top-16 right-1/4 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl animate-pulse" />
      <div className="absolute bottom-10 left-1/4 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl animate-pulse delay-1000" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
        <header className="mb-10 text-center md:mb-14">
          <Link
            to="/brio"
            className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-900/60 px-4 py-1.5 text-xs text-slate-400 transition hover:text-amber-400 hover:border-amber-500/40"
          >
            <svg width="12" height="12" viewBox="0 0 64 64" fill="none">
              <path d="M40 12 L24 32 L40 52" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Desenvolvimento do Brio
          </Link>
          <div className="mb-4 inline-flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path d="M9 3a2.5 2.5 0 0 1 3.5-.2A2.5 2.5 0 0 1 15 3.5a2.5 2.5 0 0 1 1.7 1.1A2.5 2.5 0 0 1 20 7c-.2 1-.6 1.9-1.2 2.6.5.7.9 1.5 1.2 2.4a2.5 2.5 0 0 1-3.4 2.9A2.5 2.5 0 0 1 12 17.2a2.5 2.5 0 0 1-4.6-2.9 2.5 2.5 0 0 1-3.4-2.9c.3-.9.7-1.7 1.2-2.4A5 5 0 0 1 4 7a2.5 2.5 0 0 1 3.3-2.4A2.5 2.5 0 0 1 9 3Z" fill="url(#qiBrainGrad)" />
                <defs>
                  <linearGradient id="qiBrainGrad" x1="4" y1="3" x2="20" y2="19" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#fbbf24" />
                    <stop offset="1" stopColor="#f97316" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="text-4xl font-black tracking-tight md:text-5xl">
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                TESTE DE QI
              </span>
            </h1>
          </div>
          <p className="mx-auto max-w-2xl text-sm text-slate-400 md:text-base">
            Módulo do <span className="text-amber-300">Desenvolvimento do Brio</span> para treinar e
            avaliar o raciocínio não verbal. Escolha uma das duas trilhas:
          </p>
        </header>

        <main className="grid w-full max-w-5xl gap-6 md:grid-cols-2 md:gap-8">
          {SUBMODULOS.map((mod) => (
            <Link
              key={mod.title}
              to={mod.link}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur-sm transition-all md:p-8 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${mod.color} opacity-0 transition-opacity group-hover:opacity-10`} />
              <span
                className={`mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-900/70 px-3 py-1 text-[10px] font-black tracking-widest ${
                  mod.badge === "ENSINO"
                    ? "text-emerald-300 group-hover:border-emerald-500/40"
                    : "text-indigo-300 group-hover:border-indigo-500/40"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${mod.badge === "ENSINO" ? "bg-emerald-400" : "bg-indigo-400"}`} />
                {mod.badge}
              </span>

              <div className="mb-4 flex items-center gap-4">
                <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${mod.bgColor} transition-transform group-hover:scale-110`}>
                  {mod.icon === "brain" && (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M9.5 2a3.5 3.5 0 0 0-3.2 2.1A3.5 3.5 0 0 0 4 7.3c-1.1.7-1.8 1.9-1.8 3.2 0 .8.25 1.55.7 2.18A3.5 3.5 0 0 0 4.5 19a3.5 3.5 0 0 0 5 2.4c.3.4.8.6 1.3.6.9 0 1.7-.8 1.7-1.8V3.8c0-1-.8-1.8-1.7-1.8-.5 0-1 .2-1.3.6A3.5 3.5 0 0 0 9.5 2Z" fill="url(#exGrad)" />
                      <path d="M14.5 2a3.5 3.5 0 0 1 3.2 2.1A3.5 3.5 0 0 1 20 7.3c1.1.7 1.8 1.9 1.8 3.2 0 .8-.25 1.55-.7 2.18A3.5 3.5 0 0 1 19.5 19a3.5 3.5 0 0 1-5 2.4c-.3.4-.8.6-1.3.6-.9 0-1.7-.8-1.7-1.8V3.8c0-1 .8-1.8 1.7-1.8.5 0 1 .2 1.3.6A3.5 3.5 0 0 1 14.5 2Z" fill="url(#exGrad)" opacity="0.85" />
                      <defs>
                        <linearGradient id="exGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#10b981" />
                          <stop offset="1" stopColor="#14b8a6" />
                        </linearGradient>
                      </defs>
                    </svg>
                  )}
                  {mod.icon === "gauge" && (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5a9 9 0 0 1 8.7 11H15l-3-4-3 4H3.3A9 9 0 0 1 12 5Z" fill="url(#simGrad)" />
                      <path d="M12 13l3 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                      <defs>
                        <linearGradient id="simGrad" x1="3" y1="5" x2="21" y2="16" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#6366f1" />
                          <stop offset="1" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-black transition-colors group-hover:text-amber-400">
                    {mod.title}
                  </h2>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {mod.subtitulo}
                  </p>
                </div>
              </div>

              <p className="flex-1 text-sm leading-relaxed text-slate-400 transition-colors group-hover:text-slate-300">
                {mod.description}
              </p>

              <ul className="mt-5 space-y-1.5">
                {mod.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-xs text-slate-300">
                    <svg width="14" height="14" viewBox="0 0 64 64" fill="none" className={`shrink-0 ${mod.badge === "ENSINO" ? "text-emerald-400" : "text-indigo-400"}`}>
                      <path d="M16 34 L28 46 L50 20" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {b}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center gap-2 text-sm font-bold">
                <span className="text-amber-400">Entrar no módulo</span>
                <svg width="16" height="16" viewBox="0 0 64 64" fill="none" className="text-amber-400 transition-transform group-hover:translate-x-1">
                  <path d="M12 32 L52 32 M40 20 L52 32 L40 44" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          ))}
        </main>

        <div className="mt-10 w-full max-w-5xl">
          <AdSlot rotulo="Banner Rodapé" />
        </div>

        <div className="mt-8 text-center">
          <Link to="/brio" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-amber-400">
            <svg width="16" height="16" viewBox="0 0 64 64" fill="none">
              <path d="M40 12 L24 32 L40 52" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Voltar para o Desenvolvimento do Brio
          </Link>
        </div>
      </div>
    </div>
  );
}