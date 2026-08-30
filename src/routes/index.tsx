import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Brain, Gamepad2, GraduationCap, ChevronRight, Sparkles, Globe, Star, Zap, ArrowRight, Target, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cidadela do Pracinha | Teste de QI, Jogos e Campus" },
      {
        name: "description",
        content: "Teste seu raciocínio com o Teste de QI, explore jogos estratégicos clássicos e descubra o Campus Universitário.",
      },
      { property: "og:title", content: "Cidadela do Pracinha | Teste de QI, Jogos e Campus" },
      { property: "og:description", content: "Teste seu raciocínio, jogue e explore o Campus." },
      { property: "og:url", content: "https://pracinha.online" },
      { property: "og:image", content: "https://pracinha.online/og-image.png" },
    ],
  }),
  component: Index,
});

/* ═══ Content pools — each module exclusive ═══ */

const QI_CONTENT = [
  "O Teste de QI avalia raciocínio lógico, memória de trabalho e velocidade de processamento — habilidades que impactam decisões do dia a dia.",
  "A inteligência fluida, avaliada pelo teste, é a capacidade de resolver problemas novos sem depender de conhecimento prévio.",
  "Cada questão do teste desafia um padrão de raciocínio diferente — identificar relações é mais importante que decorar.",
  "Valores acima de 130 indicam alto desempenho cognitivo. Acima de 115 são considerados superiores à média.",
  "Treinar raciocínio lógico regularmente pode melhorar performance em decisões profissionais e resolução de problemas.",
  "O teste é baseado na Teoria de Cattell-Horn, que distingue inteligência fluida da cristalizada.",
  "Memória operacional é uma das capacidades mais importantes avaliadas — ela determina quantas informações você consegue manter ativas ao mesmo tempo.",
  "As questões foram desenvolvidas com base em modelos psicométricos validados, adaptadas para serem acessíveis e educativas.",
  "Respire fundo, leia cada questão com calma e tente identificar o padrão antes de escolher. A atenção é tão importante quanto a lógica.",
  "Os primeiros testes de QI surgiram no início do século XX. Hoje são ferramentas universais de avaliação cognitiva usadas no mundo inteiro.",
  "Raciocínio espacial, uma das dimensões avaliadas, é fundamental para arquitetura, engenharia e navegação.",
  "A velocidade de processamento reflete o quão rápido o cérebro interpreta e responde a informações — melhora com treino constante.",
];

const CLASSICS_CONTENT = [
  "A Cidadela dos Clássicos reúne jogos estratégicos para partidas rápidas, treinamento tático e competição online.",
  "No Futebol de Botão, cada jogada depende de posicionamento e timing — física simulada em 2D com partidas intensas.",
  "A Trilha exige planejamento antecipado: posicione peças, forme moinhos e neutralize adversários antes que façam o mesmo.",
  "O Xadrez tem mais possibilidades de partidas do que átomos no universo — cada jogo é único e imprevisível.",
  "Na Dama, capturas em cadeia podem virar uma partida inteira. Atenção e leitura do tabuleiro são essenciais.",
  "O ranking global recompensa consistência. Suba de posição, desbloqueie dificuldades e conquiste troféus.",
  "Modo Carreira: gerencie seu clube por múltiplas temporadas. Contrate, venda, treine e dispute títulos.",
  "No multiplayer, enfrente jogadores reais em mesas abertas e campeonatos com sistema de matchmaking.",
  "Cada jogo da Cidadela recompensa o planejamento e a leitura do adversário — vitória sem pensamento tático é rara.",
  "Explore os diferentes modos de jogo: amistoso, campeonato, carreira e desafios online ao vivo.",
];

const CAMPUS_CONTENT = [
  "O Campus Universitário é uma experiência social e competitiva onde você escolhe uma profissão e evolui dentro do ecossistema.",
  "Escolha entre Estudante, Empresário, Pesquisador, Bibliotecário ou Técnico — cada profissão tem atividades únicas.",
  "O sistema de Soberania (SOV) conecta todas as atividades: ganhe com partidas, invista na Bolsa e gerencie seu clube.",
  "Diariamente, novas atividades surgem no Campus. Complete desafios, ganhe reputação e desbloqueie oportunidades.",
  "Cada jogador comanda um clube. Evolua sua identidade, negocie transferências e dispute o campeonato.",
  "Interaja com outros jogadores, participe de eventos globais da Cidadela e construa sua reputação.",
  "O ranking do Campus mede seu progresso. Quanto mais atividades e vitórias, maior sua posição.",
  "Eventos globais semanais afetam todos os jogadores. Fique atento para aproveitar oportunidades exclusivas.",
  "Seu perfil evolui com cada ação. Reputação, nível, tempo ativo e conquistas moldam sua história.",
  "O Campus está em constante evolução. Novas atividades, profissões e sistemas são adicionados regularmente.",
];

/* ═══ Rotating content bubble — organic extension of its module ═══ */

function ModuleBubble({
  content,
  accent,
}: {
  content: string[];
  accent: "indigo" | "purple" | "amber";
}) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  const next = useCallback(() => {
    setFade(false);
    setTimeout(() => {
      setIdx((p) => (p + 1) % content.length);
      setFade(true);
    }, 250);
  }, [content.length]);

  useEffect(() => {
    const t = setInterval(next, 7000);
    return () => clearInterval(t);
  }, [next]);

  const colors = {
    indigo: {
      border: "border-indigo-500/10",
      bg: "bg-indigo-500/[0.03]",
      glow: "shadow-indigo-500/5",
      dot: "bg-indigo-400",
      connector: "from-indigo-500/15",
    },
    purple: {
      border: "border-purple-500/10",
      bg: "bg-purple-500/[0.03]",
      glow: "shadow-purple-500/5",
      dot: "bg-purple-400",
      connector: "from-purple-500/15",
    },
    amber: {
      border: "border-amber-500/10",
      bg: "bg-amber-500/[0.03]",
      glow: "shadow-amber-500/5",
      dot: "bg-amber-400",
      connector: "from-amber-500/15",
    },
  };
  const c = colors[accent];

  return (
    <div className="relative">
      {/* Visual connector — thin line from module to bubble */}
      <div className={`absolute -top-3 left-6 w-px h-3 bg-gradient-to-b ${c.connector} to-transparent`} />
      {/* Small dot at the connection point */}
      <div className={`absolute -top-1.5 left-[22px] size-1.5 rounded-full ${c.dot} opacity-40`} />

      {/* The bubble itself — organic extension */}
      <div className={`${c.bg} ${c.border} border rounded-xl rounded-tl-sm p-3 shadow-lg ${c.glow}`}>
        <div
          className="transition-opacity duration-300"
          style={{ opacity: fade ? 1 : 0 }}
        >
          <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
            <span className="text-slate-500 italic mr-1">💡</span>
            {content[idx]}
          </p>
        </div>
        {/* Progress dots */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-0.5">
            {content.map((_, i) => (
              <span
                key={i}
                className={`size-0.5 rounded-full transition-all duration-300 ${i === idx ? `${c.dot} opacity-60 scale-125` : "bg-slate-700 opacity-40"}`}
              />
            ))}
          </div>
          <button onClick={next} className="text-[8px] text-slate-600 hover:text-white/30 transition">
            próximo →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Module Card — unified structure ═══ */

function ModuleCard({
  icon,
  title,
  subtitle,
  chips,
  cta,
  link,
  accent,
  content,
  featured,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  chips: string[];
  cta: string;
  link: string;
  accent: "indigo" | "purple" | "amber";
  content: string[];
  featured?: boolean;
}) {
  const accents = {
    indigo: {
      border: "border-indigo-500/20",
      hoverBorder: "hover:border-indigo-500/40",
      shadow: "hover:shadow-[0_0_30px_rgba(99,102,241,0.08)]",
      iconBg: "from-indigo-500/20 to-purple-500/20",
      iconBorder: "border-indigo-500/15",
      iconText: "text-indigo-400",
      chipBg: "bg-indigo-500/8",
      chipBorder: "border-indigo-500/10",
      chipText: "text-indigo-300/60",
      ctaText: "text-indigo-400",
      ctaHover: "group-hover:text-indigo-300",
      gradFrom: "from-indigo-950/40",
      gradVia: "via-slate-950/60",
      gradTo: "to-purple-950/30",
    },
    purple: {
      border: "border-purple-500/15",
      hoverBorder: "hover:border-purple-500/35",
      shadow: "hover:shadow-[0_0_30px_rgba(168,85,247,0.08)]",
      iconBg: "bg-purple-500/10",
      iconBorder: "border-purple-500/15",
      iconText: "text-purple-400",
      chipBg: "bg-purple-500/8",
      chipBorder: "border-purple-500/10",
      chipText: "text-purple-300/60",
      ctaText: "text-purple-400",
      ctaHover: "group-hover:text-purple-300",
      gradFrom: "from-purple-950/30",
      gradVia: "via-slate-950/50",
      gradTo: "to-pink-950/20",
    },
    amber: {
      border: "border-amber-500/15",
      hoverBorder: "hover:border-amber-500/35",
      shadow: "hover:shadow-[0_0_30px_rgba(245,158,11,0.08)]",
      iconBg: "bg-amber-500/10",
      iconBorder: "border-amber-500/15",
      iconText: "text-amber-400",
      chipBg: "bg-amber-500/8",
      chipBorder: "border-amber-500/10",
      chipText: "text-amber-300/60",
      ctaText: "text-amber-400",
      ctaHover: "group-hover:text-amber-300",
      gradFrom: "from-amber-950/30",
      gradVia: "via-slate-950/50",
      gradTo: "to-emerald-950/20",
    },
  };
  const a = accents[accent];

  return (
    <div className={`flex flex-col ${featured ? "lg:row-span-2" : ""}`}>
      <Link
        to={link}
        className={`group relative block overflow-hidden rounded-2xl border ${a.border} ${a.hoverBorder} ${a.shadow} bg-gradient-to-br ${a.gradFrom} ${a.gradVia} ${a.gradTo} p-4 sm:p-5 transition-all duration-300 active:scale-[0.98]`}
      >
        <div className="relative z-10">
          <div className="flex items-start gap-3">
            <div className={`shrink-0 flex ${featured ? "size-14" : "size-11"} items-center justify-center rounded-xl ${a.iconBg} border ${a.iconBorder} transition group-hover:scale-110`}>
              <div className={a.iconText}>{icon}</div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={`font-display ${featured ? "text-xl sm:text-2xl" : "text-base sm:text-lg"} font-black text-white group-hover:text-white/90 transition-colors`}>
                {title}
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mt-2.5">
            {chips.map((t) => (
              <span key={t} className={`rounded-md ${a.chipBg} border ${a.chipBorder} px-1.5 py-0.5 text-[9px] ${a.chipText}`}>{t}</span>
            ))}
          </div>

          <div className={`mt-3 flex items-center gap-1.5 text-xs font-bold ${a.ctaText} transition ${a.ctaHover}`}>
            <span>{cta}</span>
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>

      {/* Bubble — organic extension, visually connected */}
      <div className="mt-0 px-1">
        <ModuleBubble content={content} accent={accent} />
      </div>
    </div>
  );
}

/* ═══ Main Page ═══ */

function Index() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.15)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]" />
      <div className="absolute top-0 left-1/3 w-[400px] h-[400px] bg-indigo-500/6 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/3 w-[350px] h-[350px] bg-purple-500/5 rounded-full blur-[100px]" />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-5 sm:py-7 min-h-screen flex flex-col">
        {/* ═══ HEADER ═══ */}
        <header className="flex items-center justify-between mb-5 sm:mb-7">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/15">
              <span className="text-sm">🏰</span>
            </div>
            <div>
              <h1 className="font-display text-base sm:text-lg font-black tracking-tight text-white">CIDADELA DO PRACINHA</h1>
              <p className="text-[9px] sm:text-[10px] text-slate-500 tracking-wide">Inteligência · Jogos · Campus</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[9px] text-slate-600">
            <span className="hidden sm:flex items-center gap-1"><Globe className="size-2.5 text-cyan-500" /> Brasil</span>
            <span className="hidden sm:flex items-center gap-1"><Sparkles className="size-2.5 text-pink-500" /> Atualizado</span>
          </div>
        </header>

        {/* ═══ THREE MODULES — each with organic bubble ═══ */}
        <div className="flex-1 grid gap-3 sm:gap-4 lg:grid-cols-3 items-start">

          {/* DQI — featured, slightly larger */}
          <ModuleCard
            icon={<Brain className="size-6" />}
            title="Teste de QI"
            subtitle="Capacidades cognitivas · Raciocínio · Memória"
            chips={["Raciocínio Lógico", "Rapidez Mental", "32 Questões"]}
            cta="Começar teste"
            link="/teste-de-qi"
            accent="indigo"
            content={QI_CONTENT}
            featured
          />

          {/* Clássicos */}
          <ModuleCard
            icon={<Gamepad2 className="size-5" />}
            title="Cidadela dos Clássicos"
            subtitle="Futebol · Trilha · Xadrez · Dama"
            chips={["⚽ Futebol", "🎯 Trilha", "♟️ Xadrez", "🎲 Dama"]}
            cta="Explorar jogos"
            link="/cidadela"
            accent="purple"
            content={CLASSICS_CONTENT}
          />

          {/* Campus */}
          <ModuleCard
            icon={<GraduationCap className="size-5" />}
            title="Campus Universitário"
            subtitle="Atividades · Profissões · Economia"
            chips={["📚 Estudante", "💼 Empresário", "🔬 Pesquisador"]}
            cta="Entrar no Campus"
            link="/campus"
            accent="amber"
            content={CAMPUS_CONTENT}
          />
        </div>

        {/* ═══ FOOTER ═══ */}
        <footer className="mt-6 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[9px] text-slate-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Star className="size-2.5 text-amber-400" /> +50k usuários</span>
            <span className="flex items-center gap-1"><Users className="size-2.5 text-emerald-400" /> 5 profissões</span>
            <span className="flex items-center gap-1"><Zap className="size-2.5 text-purple-400" /> 4 jogos</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/privacidade" className="hover:text-purple-400 transition">Privacidade</Link>
            <Link to="/termos" className="hover:text-purple-400 transition">Termos</Link>
            <span>© 2026 Cidadela do Pracinha</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
