import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Brain, Gamepad2, GraduationCap, ChevronRight, Sparkles, Globe, Star, Zap, ArrowRight, Target, Users } from "lucide-react";
import { CidadelaEmblem } from "@/components/CidadelaBranding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cidadela do Pracinha | Teste de QI, Jogos e Campus" },
      {
        name: "description",
        content: "Teste seu raciocínio com o Teste DQI, explore jogos estratégicos clássicos e descubra o Campus Universitário. Tudo em um só lugar.",
      },
      { property: "og:title", content: "Cidadela do Pracinha | Teste de QI, Jogos e Campus" },
      { property: "og:description", content: "Teste seu raciocínio, jogue e explore o Campus." },
      { property: "og:url", content: "https://pracinha.online" },
      { property: "og:image", content: "https://pracinha.online/og-image.png" },
    ],
  }),
  component: Index,
});

/* ═══ Content pools — each module has its own independent set ═══ */

const DQI_FACTS = [
  { label: "O que é", text: "O Teste DQI mede capacidades cognitivas como raciocínio lógico, visual e memória de trabalho — habilidades essenciais para resolver problemas do dia a dia." },
  { label: "Fundamentos", text: "Baseado na Teoria da Inteligência de Cattell-Horn, que distingue inteligência fluida (raciocínio puro) da cristalizada (conhecimento acumulado)." },
  { label: "Capacidades", text: "Avalia raciocínio matemático, compreensão verbal, memória operacional e velocidade de processamento — tudo em uma única sessão interativa." },
  { label: "Como funciona", text: "Cada questão desafia um padrão de raciocínio diferente. Não é sobre decorar, mas sobre identificar relações e prever padrões." },
  { label: "Interpretação", text: "O resultado é uma estimativa do QI. Valores acima de 130 indicam alto desempenho cognitivo, acima de 115 são considerados superiores." },
  { label: "Curiosidade", text: "Pessoas com alto QI tendem a ser mais curiosas, adaptáveis e criativas — mas inteligência também depende de motivação e experiência." },
  { label: "Exercício", text: "Treinar raciocínio lógico regularmente pode melhorar sua performance em decisões profissionais e resolução de problemas complexos." },
  { label: "Metodologia", text: "As questões foram desenvolvidas com base em modelos psicométricos validados, adaptadas para serem acessíveis e educativas." },
  { label: "Dicas", text: "Respire fundo, leia cada questão com calma e tente identificar o padrão antes de escolher. A atenção é tão importante quanto a lógica." },
  { label: "História", text: "Os primeiros testes de QI surgiram no início do século XX para avaliar dificuldades de aprendizagem. Hoje são ferramentas universais de avaliação cognitiva." },
];

const CLASSICS_FACTS = [
  { label: "Visão geral", text: "A Cidadela dos Clássicos reúne jogos estratégicos para partidas rápidas, treinamento tático e competição online com outros jogadores." },
  { label: "Futebol de Botão", text: "Partidas 2D com física simulada. Controle seus botões, marque gols e suba no ranking — do amistoso ao campeonato online." },
  { label: "Trilha", text: "Jogo de estratégia clássico com tabuleiro. Posicione peças, forme moinhos e neutralize adversários. Modo PvP e torneios disponíveis." },
  { label: "Xadrez", text: "O eterno jogo de planejamento de longo prazo. Cada peça tem um papel — antecipe movimentos e domine o tabuleiro." },
  { label: "Dama", text: "Simples de aprender, difícil de dominar. Capturas em cadeia, barricadas estratégicas e partidas que testam sua leitura do jogo." },
  { label: "Multiplayer", text: "Enfrente jogadores reais em partidas online. Mesas abertas, campeonatos com robôs e sistema de ranking competitivo." },
  { label: "Modo Carreira", text: "Gerencie seu clube ao longo de múltiplas temporadas. Contrate, venda, treine e dispute títulos no Brasileirão e Copa do Brasil." },
  { label: "Estratégia", text: "Cada jogo da Cidadela recompensa o planejamento e a leitura do adversário. Não existe vitória sem pensamento tático." },
  { label: "Curiosidade", text: "O Xadrez tem mais possibilidades de partidas do que átomos no universo. Cada jogo é único e imprevisível." },
  { label: "Ranking", text: "Seu desempenho alimenta um ranking global. Suba de posição, desbloqueie dificuldades e conquiste troféus." },
];

const CAMPUS_FACTS = [
  { label: "O que é", text: "O Campus Universitário é uma experiência social e competitiva onde você escolhe uma profissão, participa de atividades e evolui dentro do ecossistema." },
  { label: "Profissões", text: "Escolha entre Estudante, Empresário, Pesquisador, Bibliotecário ou Técnico. Cada profissão tem atividades, desafios e recompensas únicas." },
  { label: "Economia", text: "O sistema de Soberania (SOV) conecta todas as atividades. Ganhe com partidas, invista na Bolsa, compre clubes e gerencie o caixa do seu time." },
  { label: "Atividades", text: "Diariamente, novas atividades surgem no Campus. Complete desafios, ganhe reputação e desbloqueie novas oportunidades." },
  { label: "Clubinho", text: "Cada jogador comanda um clube. Evolua sua identidade, negocie transferências e dispute o campeonato do Campus." },
  { label: "Social", text: "Interaja com outros jogadores, participe de eventos globais da Cidadela e construa sua reputação no ecossistema." },
  { label: "Competição", text: "O-ranking do Campus mede seu progresso. Quanto mais atividades e vitórias, maior sua posição entre os cidadaos." },
  { label: "Eventos", text: "Eventos globais semanais afetam todos os jogadores. Fique atento para aproveitar oportunidades exclusivas." },
  { label: "Evolução", text: "Seu perfil evolui com cada ação. Reputação, nível, tempo ativo e conquistas moldam sua história no Campus." },
  { label: "Novidades", text: "O Campus está em constante evolução. Novas atividades, profissões e sistemas são adicionados regularmente." },
];

/* ═══ Independent Rotating Balloon Component ═══ */

function InfoBalloon({
  facts,
  icon,
  accent,
}: {
  facts: { label: string; text: string }[];
  icon: React.ReactNode;
  accent: "indigo" | "purple" | "amber";
}) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  const next = useCallback(() => {
    setFade(false);
    setTimeout(() => {
      setIdx((p) => (p + 1) % facts.length);
      setFade(true);
    }, 250);
  }, [facts.length]);

  useEffect(() => {
    const t = setInterval(next, 7000);
    return () => clearInterval(t);
  }, [next]);

  const fact = facts[idx]!;

  const border = accent === "indigo" ? "border-indigo-500/15" : accent === "purple" ? "border-purple-500/15" : "border-amber-500/15";
  const bg = accent === "indigo" ? "bg-indigo-500/5" : accent === "purple" ? "bg-purple-500/5" : "bg-amber-500/5";
  const dot = accent === "indigo" ? "bg-indigo-400" : accent === "purple" ? "bg-purple-400" : "bg-amber-400";
  const labelColor = accent === "indigo" ? "text-indigo-400/70" : accent === "purple" ? "text-purple-400/70" : "text-amber-400/70";

  return (
    <div className={`rounded-xl border ${border} ${bg} p-3`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="size-1.5 rounded-full bg-current opacity-30">{icon}</div>
        <span className={`text-[8px] uppercase tracking-[0.2em] ${labelColor} font-bold`}>Informação</span>
      </div>
      <div className="transition-opacity duration-250" style={{ opacity: fade ? 1 : 0 }}>
        <span className={`text-[10px] font-bold ${labelColor} mr-1`}>{fact.label}:</span>
        <span className="text-[11px] text-slate-400 leading-relaxed">{fact.text}</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <div className="flex gap-0.5">
          {facts.map((_, i) => (
            <span key={i} className={`size-0.5 rounded-full transition-colors ${i === idx ? dot : "bg-slate-700"}`} />
          ))}
        </div>
        <button onClick={next} className="text-[8px] text-slate-600 hover:text-white/40 transition">
          Próximo →
        </button>
      </div>
    </div>
  );
}

/* ═══ Main Page ═══ */

function Index() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.2)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/8 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/6 rounded-full blur-[100px]" />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-6 sm:py-8 min-h-screen flex flex-col">
        {/* ═══ HEADER ═══ */}
        <header className="flex items-center justify-between mb-5 sm:mb-7">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-2 rounded-2xl bg-purple-500/20 blur-xl" />
              <div className="relative rounded-xl border border-purple-400/20 bg-gradient-to-b from-slate-800/80 to-slate-900/80 p-2 shadow-lg">
                <CidadelaEmblem />
              </div>
            </div>
            <div>
              <h1 className="font-display text-lg sm:text-xl font-black tracking-tight text-white">CIDADELA DO PRACINHA</h1>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium tracking-wide">Inteligência · Jogos · Campus</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-600">
            <span className="hidden sm:flex items-center gap-1"><Globe className="size-3 text-cyan-500" /> Brasil e mundo</span>
            <span className="hidden sm:flex items-center gap-1"><Sparkles className="size-3 text-pink-500" /> Atualizado</span>
          </div>
        </header>

        {/* ═══ MAIN: Three modules each with its own balloon ═══ */}
        <div className="flex-1 grid gap-4 sm:gap-5 lg:grid-cols-3 items-start">

          {/* ─── COL 1: TESTE DE QI ─── */}
          <div className="space-y-3">
            <Link
              to="/teste-de-qi"
              className="group relative block overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-slate-950/60 to-purple-950/30 p-4 sm:p-5 transition-all duration-300 hover:border-indigo-500/40 hover:shadow-[0_0_40px_rgba(99,102,241,0.1)] active:scale-[0.98]"
            >
              <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(99,102,241,0.4) 10px, rgba(99,102,241,0.4) 11px)" }} />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="rounded-lg bg-indigo-500/15 border border-indigo-500/20 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em] text-indigo-400">
                    Experiência Principal
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/15 transition group-hover:scale-110">
                    <Brain className="size-6 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-lg sm:text-xl font-black text-white group-hover:text-indigo-300 transition-colors">Teste de QI</h2>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Descubra suas capacidades cognitivas com um teste interativo baseado em modelos psicométricos.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {["Raciocínio Lógico", "Rapidez Mental", "32 Questões"].map((t) => (
                    <span key={t} className="rounded-md bg-white/5 border border-white/5 px-1.5 py-0.5 text-[9px] text-slate-500">{t}</span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-indigo-400 transition group-hover:text-indigo-300">
                  <span>Começar teste</span>
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
            <InfoBalloon facts={DQI_FACTS} icon={<Brain className="size-2" />} accent="indigo" />
          </div>

          {/* ─── COL 2: CIDADELA DOS CLÁSSICOS ─── */}
          <div className="space-y-3">
            <Link
              to="/cidadela"
              className="group relative block overflow-hidden rounded-2xl border border-purple-500/15 bg-gradient-to-br from-purple-950/30 via-slate-950/50 to-pink-950/20 p-4 sm:p-5 transition-all duration-300 hover:border-purple-500/35 hover:shadow-[0_0_30px_rgba(168,85,247,0.08)] active:scale-[0.98]"
            >
              <div className="relative z-10">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 flex size-12 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/15 transition group-hover:scale-110">
                    <Gamepad2 className="size-6 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg sm:text-xl font-black text-white group-hover:text-purple-300 transition-colors">Cidadela dos Clássicos</h3>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                      Futebol de Botão · Trilha · Xadrez · Dama · Multiplayer
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {["⚽ Futebol", "🎯 Trilha", "♟️ Xadrez", "🎲 Dama"].map((g) => (
                    <span key={g} className="rounded-md bg-purple-500/8 border border-purple-500/10 px-1.5 py-0.5 text-[9px] text-purple-300/60">{g}</span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-purple-400 transition group-hover:text-purple-300">
                  <span>Explorar jogos</span>
                  <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
            <InfoBalloon facts={CLASSICS_FACTS} icon={<Gamepad2 className="size-2" />} accent="purple" />
          </div>

          {/* ─── COL 3: CAMPUS UNIVERSITÁRIO ─── */}
          <div className="space-y-3">
            <Link
              to="/campus"
              className="group relative block overflow-hidden rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-950/30 via-slate-950/50 to-emerald-950/20 p-4 sm:p-5 transition-all duration-300 hover:border-amber-500/35 hover:shadow-[0_0_30px_rgba(245,158,11,0.08)] active:scale-[0.98]"
            >
              <div className="relative z-10">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 flex size-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/15 transition group-hover:scale-110">
                    <GraduationCap className="size-6 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg sm:text-xl font-black text-white group-hover:text-amber-300 transition-colors">Campus Universitário</h3>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                      Atividades · Profissões · Economia · Vida social
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {["📚 Estudante", "💼 Empresário", "🔬 Pesquisador", "🏛️ Bibliotecário"].map((r) => (
                    <span key={r} className="rounded-md bg-amber-500/8 border border-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-300/60">{r}</span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-amber-400 transition group-hover:text-amber-300">
                  <span>Entrar no Campus</span>
                  <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
            <InfoBalloon facts={CAMPUS_FACTS} icon={<GraduationCap className="size-2" />} accent="amber" />
          </div>
        </div>

        {/* ═══ STATS + FOOTER ═══ */}
        <div className="mt-5 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-[10px] text-slate-600">
            <span className="flex items-center gap-1"><Star className="size-3 text-amber-400" /> +50k usuários</span>
            <span className="flex items-center gap-1"><Users className="size-3 text-emerald-400" /> 5 profissões</span>
            <span className="flex items-center gap-1"><Zap className="size-3 text-purple-400" /> 4 jogos</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-slate-600">
            <Link to="/privacidade" className="hover:text-purple-400 transition">Privacidade</Link>
            <Link to="/termos" className="hover:text-purple-400 transition">Termos</Link>
            <span>© 2026 Cidadela do Pracinha</span>
          </div>
        </div>
      </div>
    </div>
  );
}
