import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Brain, Gamepad2, GraduationCap, ArrowRight, Globe, Sparkles, Star, Zap, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cidadela do Pracinha | Teste de QI, Jogos e Campus" },
      { name: "description", content: "Teste seu raciocínio, explore jogos estratégicos e descubra o Campus Universitário." },
      { property: "og:title", content: "Cidadela do Pracinha | Teste de QI, Jogos e Campus" },
      { property: "og:description", content: "Teste seu raciocínio, jogue e explore o Campus." },
      { property: "og:url", content: "https://pracinha.online" },
      { property: "og:image", content: "https://pracinha.online/og-image.png" },
    ],
  }),
  component: Index,
});

/* ═══ Content — 1 hour rotation per module ═══ */

const QI_FACTS = [
  "O Teste de QI avalia raciocínio lógico, memória de trabalho e velocidade de processamento.",
  "A inteligência fluida é a capacidade de resolver problemas novos sem depender de conhecimento prévio.",
  "Cada questão desafia um padrão de raciocínio diferente — identificar relações é mais importante que decorar.",
  "Valores acima de 130 indicam alto desempenho cognitivo. Acima de 115 são considerados superiores.",
  "Treinar raciocínio lógico pode melhorar performance em decisões profissionais e resolução de problemas.",
  "Baseado na Teoria de Cattell-Horn, que distingue inteligência fluida da cristalizada.",
  "Memória operacional determina quantas informações você consegue manter ativas ao mesmo tempo.",
  "As questões usam modelos psicométricos validados, adaptados para serem acessíveis e educativas.",
  "Raciocínio espacial é fundamental para arquitetura, engenharia e navegação.",
  "Os primeiros testes de QI surgiram no início do século XX e hoje são usados no mundo inteiro.",
];

const CLASSICS_FACTS = [
  "A Cidadela dos Clássicos reúne jogos estratégicos para partidas rápidas e competição online.",
  "No Futebol de Botão, cada jogada depende de posicionamento e timing com física simulada.",
  "A Trilha exige planejamento antecipado — posicione peças e neutralize adversários.",
  "O Xadrez tem mais possibilidades de partidas do que átomos no universo.",
  "Na Dama, capturas em cadeia podem virar uma partida inteira.",
  "O ranking global recompensa consistência — suba de posição e conquiste troféus.",
  "No Modo Carreira, gerencie seu clube por múltiplas temporadas.",
  "No multiplayer, enfrente jogadores reais em mesas abertas e campeonatos.",
  "Cada jogo recompensa planejamento e leitura do adversário.",
  "Explore amistoso, campeonato, carreira e desafios online ao vivo.",
];

const CAMPUS_FACTS = [
  "O Campus é uma experiência social e competitiva onde você escolhe uma profissão e evolui.",
  "Escolha entre Estudante, Empresário, Pesquisador, Bibliotecário ou Técnico.",
  "O sistema de Soberania conecta todas as atividades — ganhe, invista e gerencie.",
  "Atividades diárias surgem no Campus — complete desafios e ganhe reputação.",
  "Cada jogador comanda um clube. Evolua, negocie e dispute o campeonato.",
  "Interaja com outros jogadores e participe de eventos globais da Cidadela.",
  "O ranking mede seu progresso quanto mais atividades e vitórias.",
  "Eventos semanais afetam todos os jogadores — fique atento.",
  "Seu perfil evolui com cada ação: reputação, nível e conquistas.",
  "Novas atividades, profissões e sistemas são adicionados regularmente.",
];

/* ═══ Floating Particles ═══ */

function Particles() {
  const dots = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * 10,
      opacity: 0.05 + Math.random() * 0.1,
    })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {dots.map((d) => (
        <span
          key={d.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.size,
            height: d.size,
            opacity: d.opacity,
            animation: `particleFloat ${d.duration}s ease-in-out ${d.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ═══ Organic Module Bubble ═══ */

function Bubble({
  facts,
  accent,
}: {
  facts: string[];
  accent: "indigo" | "purple" | "amber";
}) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  /* ~1 hour rotation */
  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx((p) => (p + 1) % facts.length);
        setFade(true);
      }, 600);
    }, 3_600_000);
    return () => clearInterval(t);
  }, [facts.length]);

  const c = accent === "indigo"
    ? "border-indigo-500/10 bg-indigo-500/[0.04]"
    : accent === "purple"
      ? "border-purple-500/10 bg-purple-500/[0.04]"
      : "border-amber-500/10 bg-amber-500/[0.04]";

  const dotColor = accent === "indigo" ? "bg-indigo-400" : accent === "purple" ? "bg-purple-400" : "bg-amber-400";

  return (
    <div className="relative mt-1">
      {/* Connector line */}
      <div className="absolute -top-3 left-8 w-px h-3 bg-gradient-to-b from-white/10 to-transparent" />
      <div className={`absolute -top-1.5 left-[30px] size-1 rounded-full ${dotColor} opacity-30`} />

      <div className={`${c} border rounded-xl rounded-tl-sm px-3 py-2.5`}>
        <p className="text-[11px] text-slate-400 leading-relaxed" style={{ opacity: fade ? 1 : 0, transition: "opacity 600ms" }}>
          {facts[idx]}
        </p>
        <div className="mt-1.5 flex gap-0.5">
          {facts.map((_, i) => (
            <span key={i} className={`size-[3px] rounded-full ${i === idx ? dotColor : "bg-slate-700"} transition-colors duration-500`} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══ Main Page ═══ */

function Index() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* ═══ LIVING BACKGROUND ═══ */}
      {/* Gradient orbs — breathing */}
      <div className="absolute inset-0">
        <div className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] rounded-full bg-indigo-600/8 blur-[140px] animate-[breathe_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[5%] left-[5%] w-[400px] h-[400px] rounded-full bg-purple-600/6 blur-[120px] animate-[breathe_10s_ease-in-out_2s_infinite]" />
        <div className="absolute bottom-[5%] right-[5%] w-[400px] h-[400px] rounded-full bg-amber-600/5 blur-[120px] animate-[breathe_9s_ease-in-out_1s_infinite]" />
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-cyan-600/3 blur-[100px] animate-[breathe_12s_ease-in-out_3s_infinite]" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />

      {/* Floating particles */}
      <Particles />

      {/* ═══ CONTENT ═══ */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 py-8 sm:py-12 min-h-screen flex flex-col items-center">

        {/* Header — minimal */}
        <header className="text-center mb-10 sm:mb-14">
          <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight text-white/90">
            CIDADELA DO PRACINHA
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-1 tracking-widest uppercase">Inteligência · Jogos · Campus</p>
        </header>

        {/* ═══ TRIANGULAR COMPOSITION ═══ */}
        <div className="relative w-full max-w-3xl">
          {/* ─── TOP: Teste de QI ─── */}
          <div className="flex justify-center mb-8 sm:mb-12">
            <div className="w-full max-w-sm animate-[floatA_6s_ease-in-out_infinite]">
              <Link
                to="/teste-de-qi"
                className="group relative block rounded-[1.5rem] border border-indigo-500/20 bg-gradient-to-br from-indigo-950/50 via-slate-900/70 to-purple-950/30 p-5 sm:p-6 text-center transition-all duration-500 hover:border-indigo-400/40 hover:shadow-[0_0_60px_rgba(99,102,241,0.12)] hover:scale-[1.02] active:scale-[0.98]"
              >
                {/* Glow ring */}
                <div className="absolute -inset-px rounded-[1.5rem] bg-gradient-to-b from-indigo-500/20 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex justify-center mb-3">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/15 border border-indigo-500/20 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                      <Brain className="size-7 text-indigo-400" />
                    </div>
                  </div>
                  <h2 className="font-display text-xl sm:text-2xl font-black text-white">Teste de QI</h2>
                  <p className="text-xs text-slate-400 mt-1">Capacidades cognitivas · Raciocínio · Memória</p>
                  <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-400 transition group-hover:text-indigo-300">
                    <span>Começar teste</span>
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
              <Bubble facts={QI_FACTS} accent="indigo" />
            </div>
          </div>

          {/* ─── Connection lines from top to bottom modules ─── */}
          <div className="absolute top-[55%] left-1/2 -translate-x-1/2 w-full pointer-events-none hidden sm:block">
            {/* Left connector */}
            <svg className="absolute left-0 top-0 w-1/2 h-24 overflow-visible" viewBox="0 0 400 100" fill="none">
              <path d="M 200 0 C 200 40, 100 60, 80 100" stroke="rgba(168,85,247,0.12)" strokeWidth="1" />
              <circle cx="80" cy="100" r="2" fill="rgba(168,85,247,0.2)" />
            </svg>
            {/* Right connector */}
            <svg className="absolute right-0 top-0 w-1/2 h-24 overflow-visible" viewBox="0 0 400 100" fill="none">
              <path d="M 200 0 C 200 40, 300 60, 320 100" stroke="rgba(245,158,11,0.12)" strokeWidth="1" />
              <circle cx="320" cy="100" r="2" fill="rgba(245,158,11,0.2)" />
            </svg>
          </div>

          {/* ─── BOTTOM: Clássicos + Campus ─── */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {/* Clássicos — bottom left */}
            <div className="animate-[floatB_7s_ease-in-out_0.5s_infinite]">
              <Link
                to="/cidadela"
                className="group relative block rounded-[1.5rem] border border-purple-500/15 bg-gradient-to-br from-purple-950/40 via-slate-900/60 to-pink-950/20 p-4 sm:p-5 text-center transition-all duration-500 hover:border-purple-400/35 hover:shadow-[0_0_50px_rgba(168,85,247,0.1)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute -inset-px rounded-[1.5rem] bg-gradient-to-b from-purple-500/15 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex justify-center mb-2.5">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/15 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-2">
                      <Gamepad2 className="size-5 text-purple-400" />
                    </div>
                  </div>
                  <h3 className="font-display text-base sm:text-lg font-black text-white">Cidadela dos Clássicos</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Futebol · Trilha · Xadrez · Dama</p>
                  <div className="mt-3 flex items-center justify-center gap-1 text-xs font-bold text-purple-400 transition group-hover:text-purple-300">
                    <span>Explorar</span>
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
              <Bubble facts={CLASSICS_FACTS} accent="purple" />
            </div>

            {/* Campus — bottom right */}
            <div className="animate-[floatC_8s_ease-in-out_1s_infinite]">
              <Link
                to="/campus"
                className="group relative block rounded-[1.5rem] border border-amber-500/15 bg-gradient-to-br from-amber-950/40 via-slate-900/60 to-emerald-950/20 p-4 sm:p-5 text-center transition-all duration-500 hover:border-amber-400/35 hover:shadow-[0_0_50px_rgba(245,158,11,0.1)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute -inset-px rounded-[1.5rem] bg-gradient-to-b from-amber-500/15 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex justify-center mb-2.5">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/15 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-2">
                      <GraduationCap className="size-5 text-amber-400" />
                    </div>
                  </div>
                  <h3 className="font-display text-base sm:text-lg font-black text-white">Campus Universitário</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Atividades · Profissões · Economia</p>
                  <div className="mt-3 flex items-center justify-center gap-1 text-xs font-bold text-amber-400 transition group-hover:text-amber-300">
                    <span>Entrar</span>
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
              <Bubble facts={CAMPUS_FACTS} accent="amber" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto pt-8 flex items-center gap-4 text-[9px] text-slate-600">
          <span className="flex items-center gap-1"><Star className="size-2.5 text-amber-400" /> +50k</span>
          <span className="flex items-center gap-1"><Users className="size-2.5 text-emerald-400" /> 5 profissões</span>
          <span className="flex items-center gap-1"><Zap className="size-2.5 text-purple-400" /> 4 jogos</span>
          <span className="mx-1 text-slate-700">·</span>
          <Link to="/privacidade" className="hover:text-purple-400 transition">Privacidade</Link>
          <Link to="/termos" className="hover:text-purple-400 transition">Termos</Link>
        </footer>
      </div>

      {/* ═══ ANIMATIONS ═══ */}
      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes floatA {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0) translateX(0); }
          33% { transform: translateY(-4px) translateX(2px); }
          66% { transform: translateY(2px) translateX(-1px); }
        }
        @keyframes floatC {
          0%, 100% { transform: translateY(0) translateX(0); }
          33% { transform: translateY(3px) translateX(-2px); }
          66% { transform: translateY(-5px) translateX(1px); }
        }
        @keyframes particleFloat {
          0%, 100% { transform: translateY(0) translateX(0); opacity: var(--start-opacity, 0.08); }
          25% { transform: translateY(-20px) translateX(5px); }
          50% { transform: translateY(-10px) translateX(-3px); opacity: calc(var(--start-opacity, 0.08) * 1.5); }
          75% { transform: translateY(-25px) translateX(2px); }
        }
      `}</style>
    </div>
  );
}
