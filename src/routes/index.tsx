import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Brain, Gamepad2, GraduationCap, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cidadela do Pracinha | Teste de QI, Jogos e Campus" },
      { name: "description", content: "Teste seu raciocínio, explore jogos estratégicos e descubra o Campus." },
      { property: "og:title", content: "Cidadela do Pracinha" },
      { property: "og:url", content: "https://pracinha.online" },
      { property: "og:image", content: "https://pracinha.online/og-image.png" },
    ],
  }),
  component: Index,
});

/* ═══ Content — 1h per module ═══ */

const QI = [
  "O Teste de QI avalia raciocínio lógico, memória de trabalho e velocidade de processamento.",
  "A inteligência fluida é a capacidade de resolver problemas novos sem depender de conhecimento prévio.",
  "Cada questão desafia um padrão diferente — identificar relações é mais importante que decorar.",
  "Valores acima de 130 indicam alto desempenho cognitivo. Acima de 115, superiores.",
  "Treinar raciocínio lógico melhora performance em decisões profissionais e resolução de problemas.",
  "Baseado na Teoria de Cattell-Horn — inteligência fluida vs cristalizada.",
  "Memória operacional determina quantas informações você mantém ativas simultaneamente.",
  "As questões usam modelos psicométricos validados, adaptados para serem acessíveis.",
  "Raciocínio espacial é fundamental para arquitetura, engenharia e navegação.",
  "Os primeiros testes de QI surgiram no início do século XX, hoje usados globalmente.",
];

const CL = [
  "A Cidadela dos Clássicos reúne jogos estratégicos para partidas rápidas e competição online.",
  "No Futebol de Botão, cada jogada depende de posicionamento e timing com física simulada.",
  "A Trilha exige planejamento — posicione peças, forme moinhos e neutralize adversários.",
  "O Xadrez tem mais possibilidades de partidas do que átomos no universo.",
  "Na Dama, capturas em cadeia podem virar uma partida inteira.",
  "O ranking global recompensa consistência — suba de posição e conquiste troféus.",
  "No Modo Carreira, gerencie seu clube por múltiplas temporadas.",
  "No multiplayer, enfrente jogadores reais em mesas abertas e campeonatos.",
  "Cada jogo recompensa planejamento e leitura do adversário.",
  "Explore amistoso, campeonato, carreira e desafios online ao vivo.",
];

const CA = [
  "O Campus é uma experiência social e competitiva onde você escolhe uma profissão e evolui.",
  "Escolha entre Estudante, Empresário, Pesquisador, Bibliotecário ou Técnico.",
  "O sistema de Soberania conecta todas as atividades — ganhe, invista e gerencie.",
  "Atividades diárias surgem no Campus — complete desafios e ganhe reputação.",
  "Cada jogador comanda um clube. Evolua, negocie e dispute o campeonato.",
  "Interaja com outros jogadores e participe de eventos globais da Cidadela.",
  "O ranking mede seu progresso — quanto mais atividades, maior sua posição.",
  "Eventos semanais afetam todos os jogadores — fique atento.",
  "Seu perfil evolui com cada ação: reputação, nível e conquistas.",
  "Novas atividades, profissões e sistemas são adicionados regularmente.",
];

/* ═══ Particles ═══ */

function Particles() {
  const dots = useMemo(
    () =>
      Array.from({ length: 25 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 1.5,
        dur: 20 + Math.random() * 25,
        del: Math.random() * 15,
        op: 0.04 + Math.random() * 0.08,
      })),
    []
  );
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {dots.map((d) => (
        <span
          key={d.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.size,
            height: d.size,
            opacity: d.op,
            animation: `pFloat ${d.dur}s ease-in-out ${d.del}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ═══ Bubble info — organic capsule ═══ */

function Bubble({ facts }: { facts: string[] }) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx((p) => (p + 1) % facts.length);
        setFade(true);
      }, 500);
    }, 3_600_000);
    return () => clearInterval(t);
  }, [facts.length]);

  return (
    <div className="relative mt-2">
      {/* connector stem */}
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-px h-2.5 bg-gradient-to-b from-white/8 to-transparent" />
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/15" />

      <div className="mx-auto max-w-[260px] rounded-full border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm px-4 py-2 text-center">
        <p
          className="text-[10px] sm:text-[11px] text-slate-400 leading-relaxed"
          style={{ opacity: fade ? 1 : 0, transition: "opacity 500ms ease" }}
        >
          {facts[idx]}
        </p>
      </div>
    </div>
  );
}

/* ═══ Flowing connector with light dot ═══ */

function FlowLine({ direction, color, delay }: { direction: "down" | "left" | "right"; color: string; delay: string }) {
  if (direction === "down") {
    return (
      <div className="relative flex justify-center py-1" style={{ height: 32 }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-white/8 to-white/3" />
        <span
          className="absolute left-1/2 -translate-x-1/2 top-0 w-[3px] h-[3px] rounded-full"
          style={{ background: color, animation: `flowDown 4s ease-in-out ${delay} infinite`, opacity: 0.4 }}
        />
      </div>
    );
  }
  return null;
}

/* ═══ Organic module ═══ */

function Orb({
  icon,
  title,
  cta,
  link,
  glow,
  borderGlow,
  iconColor,
  float,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  cta: string;
  link: string;
  glow: string;
  borderGlow: string;
  iconColor: string;
  float: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center" style={{ animation: float }}>
      <Link
        to={link}
        className="group relative block rounded-[2rem] border border-white/[0.08] bg-white/[0.04] backdrop-blur-md px-6 py-5 sm:px-8 sm:py-6 text-center transition-all duration-700 hover:border-white/[0.15] active:scale-[0.97]"
        style={{ boxShadow: `0 0 40px ${glow}` }}
      >
        {/* breathing glow behind */}
        <div
          className="absolute -inset-1 rounded-[2.2rem] opacity-40 blur-xl pointer-events-none"
          style={{ background: borderGlow, animation: "glowBreathe 6s ease-in-out infinite" }}
        />

        <div className="relative z-10">
          <div className="flex justify-center mb-2.5">
            <div
              className="flex size-12 sm:size-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.05] transition-transform duration-700 group-hover:scale-110"
              style={{ color: iconColor }}
            >
              {icon}
            </div>
          </div>
          <h2 className="font-display text-base sm:text-lg font-black text-white/90 whitespace-nowrap">{title}</h2>
          <div className="mt-2.5 flex items-center justify-center gap-1 text-[11px] font-bold transition-colors duration-300" style={{ color: iconColor }}>
            <span>{cta}</span>
            <ArrowRight className="size-3 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </div>
      </Link>
      {children}
    </div>
  );
}

/* ═══ Main ═══ */

function Index() {
  return (
    <div className="relative min-h-screen bg-[#0a0e1a] text-white overflow-hidden select-none">
      {/* ═══ LIVING BACKGROUND ═══ */}
      <div className="absolute inset-0">
        {/* Gradient orbs — breathing */}
        <div className="absolute top-[-5%] left-[20%] w-[500px] h-[500px] rounded-full bg-indigo-700/10 blur-[160px] animate-[glowBreathe_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[10%] left-[-5%] w-[450px] h-[450px] rounded-full bg-purple-700/8 blur-[140px] animate-[glowBreathe_10s_ease-in-out_2s_infinite]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[450px] h-[450px] rounded-full bg-amber-700/6 blur-[140px] animate-[glowBreathe_9s_ease-in-out_1s_infinite]" />
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-cyan-700/4 blur-[130px] animate-[glowBreathe_12s_ease-in-out_4s_infinite]" />
      </div>

      {/* Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_15%,transparent_65%)]" />

      <Particles />

      {/* ═══ COMPOSITION ═══ */}
      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="relative w-full max-w-4xl" style={{ minHeight: "70vh" }}>

          {/* ─── TOP: Teste de QI ─── */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
            <Orb
              icon={<Brain className="size-6 sm:size-7" />}
              title="Teste de QI"
              cta="Começar teste"
              link="/teste-de-qi"
              glow="rgba(99,102,241,0.08)"
              borderGlow="linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.15))"
              iconColor="#818cf8"
              float="floatA 6s ease-in-out infinite"
            >
              <Bubble facts={QI} />
            </Orb>
          </div>

          {/* ─── FLOW DOWN ─── */}
          <div className="absolute top-[200px] sm:top-[220px] left-1/2 -translate-x-1/2 z-10">
            <FlowLine direction="down" color="rgba(168,85,247,0.5)" delay="0s" />
          </div>

          {/* ─── CENTER: Cidadela do Pracinha ─── */}
          <div className="absolute top-[230px] sm:top-[255px] left-1/2 -translate-x-1/2 z-20">
            <div className="text-center" style={{ animation: "floatB 7s ease-in-out 1s infinite" }}>
              <h1 className="font-display text-lg sm:text-xl font-black tracking-tight text-white/80">
                CIDADELA DO PRACINHA
              </h1>
              <p className="text-[9px] sm:text-[10px] text-slate-500 tracking-[0.25em] uppercase mt-0.5">Inteligência · Jogos · Campus</p>
            </div>
          </div>

          {/* ─── FLOW DOWN-LEFT ─── */}
          <div className="absolute top-[300px] sm:top-[310px] left-[18%] z-10 hidden sm:block">
            <svg width="120" height="50" viewBox="0 0 120 50" fill="none" className="overflow-visible">
              <path d="M 60 0 C 40 20, 20 30, 0 50" stroke="rgba(168,85,247,0.1)" strokeWidth="1" />
              <circle r="2" fill="rgba(168,85,247,0.25)" style={{ animation: "flowLeft 5s ease-in-out infinite" }}>
                <animateMotion dur="5s" repeatCount="indefinite" path="M 60 0 C 40 20, 20 30, 0 50" />
              </circle>
            </svg>
          </div>

          {/* ─── FLOW DOWN-RIGHT ─── */}
          <div className="absolute top-[300px] sm:top-[310px] right-[18%] z-10 hidden sm:block">
            <svg width="120" height="50" viewBox="0 0 120 50" fill="none" className="overflow-visible">
              <path d="M 60 0 C 80 20, 100 30, 120 50" stroke="rgba(245,158,11,0.1)" strokeWidth="1" />
              <circle r="2" fill="rgba(245,158,11,0.25)" style={{ animation: "flowRight 5s ease-in-out 0.5s infinite" }}>
                <animateMotion dur="5s" repeatCount="indefinite" path="M 60 0 C 80 20, 100 30, 120 50" />
              </circle>
            </svg>
          </div>

          {/* ─── BOTTOM-LEFT: Cidadela dos Clássicos ─── */}
          <div className="absolute bottom-[40px] sm:bottom-[60px] left-[2%] sm:left-[5%] z-20">
            <Orb
              icon={<Gamepad2 className="size-5 sm:size-6" />}
              title="Cidadela dos Clássicos"
              cta="Explorar"
              link="/cidadela"
              glow="rgba(168,85,247,0.06)"
              borderGlow="linear-gradient(135deg, rgba(168,85,247,0.25), rgba(236,72,153,0.1))"
              iconColor="#c084fc"
              float="floatC 7s ease-in-out 0.5s infinite"
            >
              <Bubble facts={CL} />
            </Orb>
          </div>

          {/* ─── BOTTOM-RIGHT: Campus Universitário ─── */}
          <div className="absolute bottom-[40px] sm:bottom-[60px] right-[2%] sm:right-[5%] z-20">
            <Orb
              icon={<GraduationCap className="size-5 sm:size-6" />}
              title="Campus Universitário"
              cta="Entrar"
              link="/campus"
              glow="rgba(245,158,11,0.06)"
              borderGlow="linear-gradient(135deg, rgba(245,158,11,0.25), rgba(16,185,129,0.1))"
              iconColor="#fbbf24"
              float="floatD 8s ease-in-out 1s infinite"
            >
              <Bubble facts={CA} />
            </Orb>
          </div>
        </div>
      </div>

      {/* ═══ ANIMATIONS ═══ */}
      <style>{`
        @keyframes glowBreathe {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes floatA {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes floatB {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.03); opacity: 1; }
        }
        @keyframes floatC {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(3px, -5px); }
          66% { transform: translate(-2px, 3px); }
        }
        @keyframes floatD {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(-3px, 4px); }
          66% { transform: translate(2px, -6px); }
        }
        @keyframes pFloat {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-15px) translateX(4px); }
          50% { transform: translateY(-8px) translateX(-2px); }
          75% { transform: translateY(-20px) translateX(1px); }
        }
        @keyframes flowDown {
          0% { top: 0; opacity: 0; }
          20% { opacity: 0.5; }
          80% { opacity: 0.5; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
