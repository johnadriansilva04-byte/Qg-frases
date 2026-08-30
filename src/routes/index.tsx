import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { Brain, Gamepad2, GraduationCap, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cidadela do Pracinha | Jogos online, testes de QI, jogos de estratégia, estudo, conhecimento e comunidade" },
      { name: "description", content: "Cidadela do Pracinha | Jogos online, testes de QI, jogos de estratégia, estudo, conhecimento e comunidade." },
      { name: "keywords", content: "jogos, jogos online, QI, teste de QI, estratégia, comunidade, estudo, conhecimento, cidadela do pracinha, pracinha jogos" },
      { property: "og:title", content: "Cidadela do Pracinha" },
      { property: "og:description", content: "Cidadela do Pracinha | Jogos online, testes de QI, jogos de estratégia, estudo, conhecimento e comunidade." },
      { property: "og:url", content: "https://pracinha.online" },
      { property: "og:image", content: "https://pracinha.online/artes/cidadela-icon-og.jpeg" },
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

/* ═══ Formation waypoints — TRUE TRIANGLE ROTATION ═══ */

interface Pt { x: number; y: number }
interface Fmt { a: Pt; b: Pt; c: Pt }

// Each formation is a rotation of the triangle.
// a = Teste de QI, b = Cidadela dos Clássicos, c = Campus
// The triangle rotates CW, with QI eventually "falling" to bottom.
const FMT: Fmt[] = [
  // 0: Classic — QI top, Clássicos bottom-left, Campus bottom-right
  { a: { x: 50, y: 12 }, b: { x: 14, y: 74 }, c: { x: 86, y: 74 } },
  // 1: Rotation begins — QI slides right-down, Clássicos rises left, Campus shifts
  { a: { x: 68, y: 28 }, b: { x: 20, y: 48 }, c: { x: 78, y: 78 } },
  // 2: QI falls to bottom-right, Clássicos takes top, Campus left
  { a: { x: 76, y: 72 }, b: { x: 50, y: 10 }, c: { x: 16, y: 68 } },
  // 3: Continued rotation — Clássicos top-right, Campus bottom, QI bottom-left
  { a: { x: 24, y: 70 }, b: { x: 80, y: 14 }, c: { x: 56, y: 80 } },
  // 4: Campus takes top, QI left, Clássicos right
  { a: { x: 14, y: 52 }, b: { x: 82, y: 56 }, c: { x: 50, y: 10 } },
  // 5: Rotation continues — QI rising left, Clássicos falling right
  { a: { x: 22, y: 24 }, b: { x: 80, y: 72 }, c: { x: 48, y: 78 } },
  // 6: Near original — QI approaching top again
  { a: { x: 42, y: 12 }, b: { x: 16, y: 72 }, c: { x: 82, y: 68 } },
  // 7: Back to start (smooth loop)
  { a: { x: 50, y: 12 }, b: { x: 14, y: 74 }, c: { x: 86, y: 74 } },
];

const DURATION = 35_000; // ms per transition — slower for ambient feel
const MIN_DIST = 20; // minimum % distance between modules

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// On mobile, clamp positions tighter so cards (≈120px wide) never overflow.
// Desktop keeps wider range for the choreographed animation.
function useMobileConstraints() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  // Mobile: cards ≈120px wide → half = 60px → 60/375 ≈ 16% margin each side
  // Plus 4% breathing room → min 18%, max 82%
  return isMobile ? { min: 18, max: 82 } : { min: 8, max: 92 };
}

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ═══ Hook: choreographed triangle rotation ═══ */

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

      // Clamp to viewport so cards never overflow (tighter on mobile)
      const mob = window.innerWidth < 640;
      const marginX = mob ? 18 : 8;
      const marginY = mob ? 22 : 10;
      const maxX = 100 - marginX;
      const maxY = 100 - marginY;
      a.x = clamp(a.x, marginX, maxX); a.y = clamp(a.y, marginY, maxY);
      b.x = clamp(b.x, marginX, maxX); b.y = clamp(b.y, marginY, maxY);
      c.x = clamp(c.x, marginX, maxX); c.y = clamp(c.y, marginY, maxY);

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
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 1.5,
        dur: 20 + Math.random() * 25,
        del: Math.random() * 15,
        op: 0.03 + Math.random() * 0.06,
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
    <div className="relative mt-1.5 sm:mt-2">
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-px h-2 bg-gradient-to-b from-white/8 to-transparent" />
      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/15" />
      <div
        className="mx-auto max-w-[200px] sm:max-w-[240px] border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm px-2.5 py-1 sm:px-3 sm:py-1.5 text-center"
        style={{ borderRadius: "45% 55% 50% 50% / 50% 45% 55% 50%" }}
      >
        <p
          className="text-[8px] sm:text-[10px] text-slate-400 leading-relaxed"
          style={{ opacity: fade ? 1 : 0, transition: "opacity 500ms ease" }}
        >
          {facts[idx]}
        </p>
      </div>
    </div>
  );
}

/* ═══ Dynamic SVG connectors ═══ */

function Connectors({ pos }: { pos: Fmt }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ zIndex: 5 }}>
      <defs>
        <linearGradient id="connPurple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(168,85,247,0.15)" />
          <stop offset="100%" stopColor="rgba(168,85,247,0.03)" />
        </linearGradient>
        <linearGradient id="connAmber" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(245,158,11,0.15)" />
          <stop offset="100%" stopColor="rgba(245,158,11,0.03)" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={`M ${pos.a.x} ${pos.a.y} Q ${(pos.a.x + pos.b.x) / 2} ${(pos.a.y + pos.b.y) / 2 - 3} ${pos.b.x} ${pos.b.y}`} fill="none" stroke="url(#connPurple)" strokeWidth="0.3" />
      <circle r="0.8" fill="rgba(168,85,247,0.35)" filter="url(#glow)">
        <animateMotion dur="6s" repeatCount="indefinite" path={`M ${pos.a.x} ${pos.a.y} Q ${(pos.a.x + pos.b.x) / 2} ${(pos.a.y + pos.b.y) / 2 - 3} ${pos.b.x} ${pos.b.y}`} />
      </circle>
      <path d={`M ${pos.a.x} ${pos.a.y} Q ${(pos.a.x + pos.c.x) / 2} ${(pos.a.y + pos.c.y) / 2 - 3} ${pos.c.x} ${pos.c.y}`} fill="none" stroke="url(#connAmber)" strokeWidth="0.3" />
      <circle r="0.8" fill="rgba(245,158,11,0.35)" filter="url(#glow)">
        <animateMotion dur="7s" repeatCount="indefinite" path={`M ${pos.a.x} ${pos.a.y} Q ${(pos.a.x + pos.c.x) / 2} ${(pos.a.y + pos.c.y) / 2 - 3} ${pos.c.x} ${pos.c.y}`} />
      </circle>
      <path d={`M ${pos.b.x} ${pos.b.y} Q ${(pos.b.x + pos.c.x) / 2} ${(pos.b.y + pos.c.y) / 2 - 3} ${pos.c.x} ${pos.c.y}`} fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.2" />
    </svg>
  );
}

/* ═══ FEB Cobra Emblem — subtle institutional background ═══ */

function FEBCobra() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[45%] z-[6] pointer-events-none opacity-[0.04]">
      <svg width="320" height="320" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shield shape */}
        <path d="M100 10 L170 40 L170 110 Q170 160 100 190 Q30 160 30 110 L30 40 Z" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-white" />
        {/* Star at top */}
        <path d="M100 25 L104 37 L117 37 L107 45 L110 57 L100 49 L90 57 L93 45 L83 37 L96 37 Z" fill="currentColor" className="text-white" opacity="0.6" />
        {/* Stylized cobra — simplified silhouette */}
        <path d="M85 130 Q80 110 85 95 Q90 80 100 75 Q110 80 115 95 Q120 110 115 130" stroke="currentColor" strokeWidth="1.2" fill="none" className="text-white" opacity="0.5" />
        <path d="M92 130 Q95 120 100 118 Q105 120 108 130" stroke="currentColor" strokeWidth="0.8" fill="none" className="text-white" opacity="0.3" />
        {/* Smoke wisps */}
        <path d="M96 75 Q93 65 96 58 Q99 52 96 45" stroke="currentColor" strokeWidth="0.6" fill="none" className="text-white" opacity="0.25" />
        <path d="M104 75 Q107 63 104 55 Q101 48 104 40" stroke="currentColor" strokeWidth="0.6" fill="none" className="text-white" opacity="0.2" />
        {/* FEB text */}
        <text x="100" y="160" textAnchor="middle" fill="currentColor" className="text-white" fontSize="14" fontWeight="bold" letterSpacing="4" opacity="0.35">F.E.B.</text>
      </svg>
    </div>
  );
}

/* ═══ Organic module ═══ */

function Orb({
  icon, title, cta, link, glow, borderGlow, iconColor, mobile, children,
}: {
  icon: React.ReactNode; title: string; cta: string; link: string;
  glow: string; borderGlow: string; iconColor: string; mobile?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center">
      <Link
        to={link}
        className="group relative block border border-white/[0.08] bg-white/[0.04] backdrop-blur-md px-3 py-3 sm:px-6 sm:py-5 text-center transition-all duration-700 hover:border-white/[0.15] active:scale-[0.97] overflow-hidden"
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
          <div className="flex justify-center mb-1.5 sm:mb-2">
            <div
              className={`${mobile ? "size-12" : "size-10 sm:size-12"} flex items-center justify-center border border-white/[0.08] bg-white/[0.05] transition-transform duration-700 group-hover:scale-110`}
              style={{ color: iconColor, borderRadius: "50% 50% 42% 58% / 58% 50% 50% 42%" }}
            >
              {icon}
            </div>
          </div>
          <h2 className={`${mobile ? "text-sm" : "text-xs sm:text-sm"} font-display font-black text-white/90 max-w-[120px] leading-tight`}>{title}</h2>
          <div className="mt-1.5 sm:mt-2 flex items-center justify-center gap-1 text-[9px] sm:text-[10px] font-bold transition-colors duration-300" style={{ color: iconColor }}>
            <span>{cta}</span>
            <ArrowRight className="size-2.5 sm:size-3 transition-transform duration-300 group-hover:translate-x-1" />
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

      {/* ═══ FEB COBRA EMBLEM ═══ */}
      <FEBCobra />

      {/* ═══ CONNECTORS ═══ */}
      <div className="absolute inset-0" style={{ zIndex: 5 }}>
        <Connectors pos={pos} />
      </div>

      {/* ═══ COMPOSITION ═══ */}
      <div className="relative z-10 w-full h-full">

        {/* CIDADELA DO PRACINHA — enhanced center identity */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] z-30 pointer-events-none text-center">
          <div className="relative">
            {/* Pulse glow behind text */}
            <div className="absolute inset-0 -inset-x-8 -inset-y-4 bg-gradient-to-r from-indigo-500/0 via-indigo-400/8 to-purple-500/0 blur-2xl animate-[pulse_4s_ease-in-out_infinite]" />
            <h1 className="relative font-display text-lg sm:text-xl md:text-2xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-white/60 via-amber-200/50 to-white/60 bg-clip-text text-transparent animate-[shimmer_6s_ease-in-out_infinite]">
                CIDADELA DO PRACINHA
              </span>
            </h1>
            <p className="relative text-[7px] sm:text-[8px] md:text-[9px] text-white/20 tracking-[0.3em] uppercase mt-0.5">
              Inteligência · Jogos · Campus
            </p>
          </div>
        </div>

        {/* MODULE A: Teste de QI */}
        <div
          className="absolute z-20 transition-none"
          style={{ left: `${pos.a.x}%`, top: `${pos.a.y}%`, transform: "translate(-50%, -50%)" }}
        >
          <Orb
            icon={<Brain className="size-4 sm:size-5" />}
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
          style={{ left: `${pos.b.x}%`, top: `${pos.b.y}%`, transform: "translate(-50%, -50%)" }}
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
          style={{ left: `${pos.c.x}%`, top: `${pos.c.y}%`, transform: "translate(-50%, -50%)" }}
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
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scaleX(1); }
          50% { opacity: 0.7; transform: scaleX(1.05); }
        }
        @keyframes shimmer {
          0%, 100% { background-position: -200% center; }
          50% { background-position: 200% center; }
        }
        @media (max-width: 640px) {
          .font-display { font-size: 0.875rem; }
        }
      `}</style>
    </div>
  );
}
