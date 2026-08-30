import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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

/* ═══ Content — ~1h per module ═══ */

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

/* ═══ Formation waypoints (percentage positions) ═══ */

interface Pt { x: number; y: number }
interface Fmt { a: Pt; b: Pt; c: Pt }
const FMT: Fmt[] = [
  { a: { x: 50, y: 10 }, b: { x: 15, y: 72 }, c: { x: 85, y: 72 } },   // classic triangle
  { a: { x: 38, y: 8 },  b: { x: 82, y: 55 }, c: { x: 12, y: 65 } },   // clockwise twist
  { a: { x: 62, y: 6 },  b: { x: 8, y: 50 },  c: { x: 75, y: 78 } },   // wide sweep right
  { a: { x: 50, y: 5 },  b: { x: 88, y: 60 }, c: { x: 18, y: 78 } },   // mirror
  { a: { x: 35, y: 12 }, b: { x: 18, y: 78 }, c: { x: 72, y: 62 } },   // asymmetric
  { a: { x: 65, y: 8 },  b: { x: 80, y: 75 }, c: { x: 12, y: 68 } },   // right cluster
  { a: { x: 50, y: 10 }, b: { x: 15, y: 72 }, c: { x: 85, y: 72 } },   // back to start
];

const DURATION = 30_000; // ms per transition
const MIN_DIST = 18; // minimum % distance between modules

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ═══ Hook: choreographed movement ═══ */

function useChoreography() {
  const [pos, setPos] = useState<Fmt>(() => {
    const first = FMT[0]!;
    return { a: { ...first.a }, b: { ...first.b }, c: { ...first.c } };
  });
  const ref = useRef({ fi: 0, t0: performance.now() });

  useEffect(() => {
    let raf: number;
    const loop = (now: number) => {
      const s = ref.current;
      const progress = Math.min((now - s.t0) / DURATION, 1);
      const ease = easeInOut(progress);
      const from: Fmt = FMT[s.fi]!;
      const to: Fmt = FMT[(s.fi + 1) % FMT.length]!;

      // Interpolate
      const a: Pt = { x: from.a.x + (to.a.x - from.a.x) * ease, y: from.a.y + (to.a.y - from.a.y) * ease };
      const b: Pt = { x: from.b.x + (to.b.x - from.b.x) * ease, y: from.b.y + (to.b.y - from.b.y) * ease };
      const c: Pt = { x: from.c.x + (to.c.x - from.c.x) * ease, y: from.c.y + (to.c.y - from.c.y) * ease };

      // Push apart if too close
      const fix = (p1: Pt, p2: Pt) => {
        const d = dist(p1, p2);
        if (d < MIN_DIST && d > 0) {
          const push = (MIN_DIST - d) / 2;
          const dx = (p2.x - p1.x) / d * push;
          const dy = (p2.y - p1.y) / d * push;
          p1.x -= dx; p1.y -= dy;
          p2.x += dx; p2.y += dy;
        }
      };
      fix(a, b); fix(a, c); fix(b, c);

      setPos({ a, b, c });

      if (progress >= 1) {
        s.fi = (s.fi + 1) % (FMT.length - 1);
        s.t0 = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return pos;
}

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
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-px h-2.5 bg-gradient-to-b from-white/8 to-transparent" />
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/15" />
      <div
        className="mx-auto max-w-[240px] border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm px-3 py-1.5 text-center"
        style={{ borderRadius: "45% 55% 50% 50% / 50% 45% 55% 50%" }}
      >
        <p
          className="text-[9px] sm:text-[10px] text-slate-400 leading-relaxed"
          style={{ opacity: fade ? 1 : 0, transition: "opacity 500ms ease" }}
        >
          {facts[idx]}
        </p>
      </div>
    </div>
  );
}

/* ═══ Dynamic SVG connectors ═══ */

function Connectors({ pos }: { pos: { a: { x: number; y: number }; b: { x: number; y: number }; c: { x: number; y: number } } }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
      <defs>
        <linearGradient id="connPurple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(168,85,247,0.18)" />
          <stop offset="100%" stopColor="rgba(168,85,247,0.04)" />
        </linearGradient>
        <linearGradient id="connAmber" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(245,158,11,0.18)" />
          <stop offset="100%" stopColor="rgba(245,158,11,0.04)" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* A → B */}
      <path
        d={`M ${pos.a.x}% ${pos.a.y}% Q ${(pos.a.x + pos.b.x) / 2}% ${(pos.a.y + pos.b.y) / 2 - 4}% ${pos.b.x}% ${pos.b.y}%`}
        fill="none" stroke="url(#connPurple)" strokeWidth="1"
      />
      <circle r="3" fill="rgba(168,85,247,0.4)" filter="url(#glow)">
        <animateMotion dur="6s" repeatCount="indefinite"
          path={`M ${pos.a.x}% ${pos.a.y}% Q ${(pos.a.x + pos.b.x) / 2}% ${(pos.a.y + pos.b.y) / 2 - 4}% ${pos.b.x}% ${pos.b.y}%`}
        />
      </circle>
      {/* A → C */}
      <path
        d={`M ${pos.a.x}% ${pos.a.y}% Q ${(pos.a.x + pos.c.x) / 2}% ${(pos.a.y + pos.c.y) / 2 - 4}% ${pos.c.x}% ${pos.c.y}%`}
        fill="none" stroke="url(#connAmber)" strokeWidth="1"
      />
      <circle r="3" fill="rgba(245,158,11,0.4)" filter="url(#glow)">
        <animateMotion dur="7s" repeatCount="indefinite"
          path={`M ${pos.a.x}% ${pos.a.y}% Q ${(pos.a.x + pos.c.x) / 2}% ${(pos.a.y + pos.c.y) / 2 - 4}% ${pos.c.x}% ${pos.c.y}%`}
        />
      </circle>
      {/* B → C */}
      <path
        d={`M ${pos.b.x}% ${pos.b.y}% Q ${(pos.b.x + pos.c.x) / 2}% ${(pos.b.y + pos.c.y) / 2 - 4}% ${pos.c.x}% ${pos.c.y}%`}
        fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"
      />
    </svg>
  );
}

/* ═══ Organic module ═══ */

function Orb({
  icon, title, cta, link, glow, borderGlow, iconColor, children,
}: {
  icon: React.ReactNode; title: string; cta: string; link: string;
  glow: string; borderGlow: string; iconColor: string; children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center">
      <Link
        to={link}
        className="group relative block border border-white/[0.08] bg-white/[0.04] backdrop-blur-md px-5 py-4 sm:px-7 sm:py-5 text-center transition-all duration-700 hover:border-white/[0.15] active:scale-[0.97]"
        style={{
          boxShadow: `0 0 40px ${glow}`,
          borderRadius: "48% 52% 45% 55% / 55% 48% 52% 45%",
        }}
      >
        <div
          className="absolute -inset-1.5 opacity-40 blur-xl pointer-events-none"
          style={{ background: borderGlow, borderRadius: "48% 52% 45% 55% / 55% 48% 52% 45%", animation: "glowBreathe 6s ease-in-out infinite" }}
        />
        <div className="relative z-10">
          <div className="flex justify-center mb-2">
            <div
              className="flex size-11 sm:size-13 items-center justify-center border border-white/[0.08] bg-white/[0.05] transition-transform duration-700 group-hover:scale-110"
              style={{ color: iconColor, borderRadius: "50% 50% 42% 58% / 58% 50% 50% 42%" }}
            >
              {icon}
            </div>
          </div>
          <h2 className="font-display text-sm sm:text-base font-black text-white/90 whitespace-nowrap">{title}</h2>
          <div className="mt-2 flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold transition-colors duration-300" style={{ color: iconColor }}>
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
  const pos = useChoreography();

  return (
    <div className="relative h-screen bg-[#0a0e1a] text-white overflow-hidden select-none">
      {/* ═══ LIVING BACKGROUND ═══ */}
      <div className="absolute inset-0">
        <div className="absolute top-[-5%] left-[20%] w-[500px] h-[500px] rounded-full bg-indigo-700/10 blur-[160px] animate-[glowBreathe_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[10%] left-[-5%] w-[450px] h-[450px] rounded-full bg-purple-700/8 blur-[140px] animate-[glowBreathe_10s_ease-in-out_2s_infinite]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[450px] h-[450px] rounded-full bg-amber-700/6 blur-[140px] animate-[glowBreathe_9s_ease-in-out_1s_infinite]" />
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-cyan-700/4 blur-[130px] animate-[glowBreathe_12s_ease-in-out_4s_infinite]" />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_15%,transparent_65%)]" />

      <Particles />

      {/* ═══ CONNECTORS (track modules dynamically) ═══ */}
      <div className="absolute inset-0" style={{ zIndex: 5 }}>
        <Connectors pos={pos} />
      </div>

      {/* ═══ COMPOSITION ═══ */}
      <div className="relative z-10 w-full h-full">

        {/* CIDADELA DO PRACINHA — fixed center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none text-center" style={{ animation: "glowBreathe 7s ease-in-out infinite" }}>
          <h1 className="font-display text-base sm:text-lg font-black tracking-tight text-white/25">
            CIDADELA DO PRACINHA
          </h1>
          <p className="text-[7px] sm:text-[8px] text-white/10 tracking-[0.3em] uppercase mt-0.5">
            Inteligência · Jogos · Campus
          </p>
        </div>

        {/* MODULE A: Teste de QI */}
        <div
          className="absolute z-20 transition-none"
          style={{
            left: `${pos.a.x}%`, top: `${pos.a.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <Orb
            icon={<Brain className="size-5 sm:size-6" />}
            title="Teste de QI"
            cta="Começar teste"
            link="/teste-de-qi"
            glow="rgba(99,102,241,0.08)"
            borderGlow="linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.15))"
            iconColor="#818cf8"
          >
            <Bubble facts={QI} />
          </Orb>
        </div>

        {/* MODULE B: Cidadela dos Clássicos */}
        <div
          className="absolute z-20 transition-none"
          style={{
            left: `${pos.b.x}%`, top: `${pos.b.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <Orb
            icon={<Gamepad2 className="size-4 sm:size-5" />}
            title="Cidadela dos Clássicos"
            cta="Explorar"
            link="/cidadela"
            glow="rgba(168,85,247,0.06)"
            borderGlow="linear-gradient(135deg, rgba(168,85,247,0.25), rgba(236,72,153,0.1))"
            iconColor="#c084fc"
          >
            <Bubble facts={CL} />
          </Orb>
        </div>

        {/* MODULE C: Campus Universitário */}
        <div
          className="absolute z-20 transition-none"
          style={{
            left: `${pos.c.x}%`, top: `${pos.c.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <Orb
            icon={<GraduationCap className="size-4 sm:size-5" />}
            title="Campus Universitário"
            cta="Entrar"
            link="/campus"
            glow="rgba(245,158,11,0.06)"
            borderGlow="linear-gradient(135deg, rgba(245,158,11,0.25), rgba(16,185,129,0.1))"
            iconColor="#fbbf24"
          >
            <Bubble facts={CA} />
          </Orb>
        </div>
      </div>

      {/* ═══ ANIMATIONS ═══ */}
      <style>{`
        @keyframes glowBreathe {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes pFloat {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-15px) translateX(4px); }
          50% { transform: translateY(-8px) translateX(-2px); }
          75% { transform: translateY(-20px) translateX(1px); }
        }
      `}</style>
    </div>
  );
}
