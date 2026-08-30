import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Brain, Gamepad2, GraduationCap, ChevronRight, Sparkles, Globe, Star, Zap, ArrowRight, Target, Crown, Users, BookOpen } from "lucide-react";
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

const DQI_FACTS = [
  { label: "O que é", text: "O Teste DQI mede capacidades cognitivas como raciocínio lógico, visual e memória de trabalho — habilidades essenciais para resolver problemas do dia a dia." },
  { label: "Fundamentos", text: "Baseado na Teoria da Inteligência de Cattell-Horn, que distingue inteligência fluida (raciocínio puro) da cristalizada (conhecimento acumulado)." },
  { label: "Capacidades", text: "Avalia raciocínio matemático, compreensão verbal, memória operacional e velocidade de processamento — tudo em uma única sessão interativa." },
  { label: "Como funciona", text: "Cada questão desafia um padrão de raciocínio diferente. Não é sobre decorar, mas sobre identificar relações e prever padrões." },
  { label: "Interpretação", text: "O resultado é uma estimativa do QI. Valores acima de 130 indicam alto desempenho cognitivo, acima de 115 são considerados superiores." },
  { label: "Curiosidade", text: "Pessoas com alto QI tendem a ser mais curiosas, adaptáveis e criativas — mas inteligência também depende de motivação e experiência." },
  { label: "Exercício", text: "Treinar raciocínio lógico regularmente pode melhorar sua performance em provas, decisões profissionais e resolução de problemas complexos." },
  { label: "Contexto", text: "O Teste DQI da Cidadela usa questões desenvolvidas com base em modelos psicométricos validados, adaptadas para serem acessíveis e educativas." },
  { label: "Dicas", text: "Respire fundo, leia cada questão com calma e tente identificar o padrão antes de escolher uma alternativa. A atenção é tão importante quanto a lógica." },
  { label: "História", text: "Os primeiros testes de QI foram criados no início do século XX para avaliar dificuldades de aprendizagem. Hoje são ferramentas universais de avaliação cognitiva." },
];

function Index() {
  const [factIndex, setFactIndex] = useState(0);
  const [fade, setFade] = useState(true);

  const nextFact = useCallback(() => {
    setFade(false);
    setTimeout(() => {
      setFactIndex((prev) => (prev + 1) % DQI_FACTS.length);
      setFade(true);
    }, 300);
  }, []);

  useEffect(() => {
    const interval = setInterval(nextFact, 8000);
    return () => clearInterval(interval);
  }, [nextFact]);

  const fact = DQI_FACTS[factIndex]!;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.2)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/8 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/6 rounded-full blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/3 rounded-full blur-[150px]" />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-6 sm:py-8 min-h-screen flex flex-col">
        {/* ═══ TOP BAR ═══ */}
        <header className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-2 rounded-2xl bg-purple-500/20 blur-xl" />
              <div className="relative rounded-xl border border-purple-400/20 bg-gradient-to-b from-slate-800/80 to-slate-900/80 p-2 shadow-lg">
                <CidadelaEmblem />
              </div>
            </div>
            <div>
              <h1 className="font-display text-lg sm:text-xl font-black tracking-tight text-white">
                CIDADELA DO PRACINHA
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium tracking-wide">Inteligência · Jogos · Campus</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-600">
            <span className="hidden sm:flex items-center gap-1"><Globe className="size-3 text-cyan-500" /> Brasil e mundo</span>
            <span className="hidden sm:flex items-center gap-1"><Sparkles className="size-3 text-pink-500" /> Atualizado</span>
          </div>
        </header>

        {/* ═══ MAIN GRID ═══ */}
        <div className="flex-1 grid gap-4 sm:gap-5 lg:grid-cols-[1.3fr_1fr] items-start">
          {/* LEFT COLUMN: DQI Hero + AI Facts */}
          <div className="space-y-4">
            {/* DQI Hero Card */}
            <Link
              to="/teste-de-qi"
              className="group relative block overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-slate-950/60 to-purple-950/30 p-5 sm:p-6 transition-all duration-300 hover:border-indigo-500/40 hover:shadow-[0_0_40px_rgba(99,102,241,0.1)] active:scale-[0.98]"
            >
              {/* Subtle grid pattern */}
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(99,102,241,0.3) 10px, rgba(99,102,241,0.3) 11px)" }} />

              <div className="relative z-10">
                {/* Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="rounded-lg bg-indigo-500/15 border border-indigo-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-indigo-400">
                    Experiência Principal
                  </span>
                </div>

                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="shrink-0 flex size-14 sm:size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/15 transition group-hover:scale-110">
                    <Brain className="size-7 sm:size-8 text-indigo-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-xl sm:text-2xl font-black text-white group-hover:text-indigo-300 transition-colors">
                      Teste de QI
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                      Descubra suas capacidades cognitivas com um teste interativo baseado em modelos psicométricos validados.
                    </p>

                    {/* Feature chips */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {[
                        { icon: <Target className="size-3" />, text: "Raciocínio Lógico" },
                        { icon: <Zap className="size-3" />, text: "Rapidez Mental" },
                        { icon: <BookOpen className="size-3" />, text: "32 Questões" },
                      ].map((chip) => (
                        <span key={chip.text} className="flex items-center gap-1 rounded-md bg-white/5 border border-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                          {chip.icon} {chip.text}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 transition group-hover:text-indigo-300">
                    <span>Começar teste</span>
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-slate-600">
                    <Star className="size-3 text-amber-400" />
                    <span>+50.000 testes realizados</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* AI Educational Strip */}
            <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex size-5 items-center justify-center rounded-md bg-cyan-500/10">
                  <Sparkles className="size-3 text-cyan-400" />
                </div>
                <span className="text-[9px] uppercase tracking-[0.2em] text-cyan-500/50 font-bold">Sabia você?</span>
              </div>
              <div
                className="transition-opacity duration-300"
                style={{ opacity: fade ? 1 : 0 }}
              >
                <span className="text-[10px] font-bold text-cyan-400/70 mr-1.5">{fact.label}:</span>
                <span className="text-xs text-slate-400 leading-relaxed">{fact.text}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex gap-1">
                  {DQI_FACTS.map((_, i) => (
                    <span
                      key={i}
                      className={`size-1 rounded-full transition-colors ${i === factIndex ? "bg-cyan-400" : "bg-slate-700"}`}
                    />
                  ))}
                </div>
                <button onClick={nextFact} className="text-[9px] text-slate-600 hover:text-cyan-400 transition">
                  Próximo →
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Jogos + Campus */}
          <div className="space-y-4">
            {/* Jogos / Clássicos */}
            <Link
              to="/cidadela"
              className="group relative block overflow-hidden rounded-2xl border border-purple-500/15 bg-gradient-to-br from-purple-950/30 via-slate-950/50 to-pink-950/20 p-4 sm:p-5 transition-all duration-300 hover:border-purple-500/35 hover:shadow-[0_0_30px_rgba(168,85,247,0.08)] active:scale-[0.98]"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.02] bg-gradient-to-r from-purple-500 to-pink-500 transition-opacity" />
              <div className="relative z-10">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 flex size-12 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/15 transition group-hover:scale-110">
                    <Gamepad2 className="size-6 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-base sm:text-lg font-black text-white group-hover:text-purple-300 transition-colors">
                      Cidadela dos Clássicos
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                      Futebol de Botão · Trilha · Xadrez · Dama · Multiplayer online
                    </p>
                  </div>
                </div>

                {/* Game chips */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {["⚽ Futebol", "🎯 Trilha", "♟️ Xadrez", "🎲 Dama"].map((game) => (
                    <span key={game} className="rounded-md bg-purple-500/8 border border-purple-500/10 px-2 py-0.5 text-[10px] text-purple-300/60">
                      {game}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-purple-400 transition group-hover:text-purple-300">
                  <span>Explorar jogos</span>
                  <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>

            {/* Campus / Cidadela */}
            <Link
              to="/campus"
              className="group relative block overflow-hidden rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-950/30 via-slate-950/50 to-emerald-950/20 p-4 sm:p-5 transition-all duration-300 hover:border-amber-500/35 hover:shadow-[0_0_30px_rgba(245,158,11,0.08)] active:scale-[0.98]"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.02] bg-gradient-to-r from-amber-500 to-emerald-500 transition-opacity" />
              <div className="relative z-10">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 flex size-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/15 transition group-hover:scale-110">
                    <GraduationCap className="size-6 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-base sm:text-lg font-black text-white group-hover:text-amber-300 transition-colors">
                      Campus Universitário
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                      Atividades, profissões, economia e vida social do campus
                    </p>
                  </div>
                </div>

                {/* Feature chips */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {["📚 Estudante", "💼 Empresário", "🔬 Pesquisador", "🏛️ Bibliotecário"].map((role) => (
                    <span key={role} className="rounded-md bg-amber-500/8 border border-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300/60">
                      {role}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-amber-400 transition group-hover:text-amber-300">
                  <span>Entrar no Campus</span>
                  <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: <Star className="size-3.5" />, value: "+50k", label: "Usuários", color: "text-amber-400" },
                { icon: <Users className="size-3.5" />, value: "5", label: "Profissões", color: "text-emerald-400" },
                { icon: <Zap className="size-3.5" />, value: "4", label: "Jogos", color: "text-purple-400" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-center">
                  <div className={`flex items-center justify-center gap-1 ${stat.color}`}>
                    {stat.icon}
                    <span className="font-display text-sm font-black">{stat.value}</span>
                  </div>
                  <span className="text-[8px] uppercase tracking-wider text-slate-600 mt-0.5 block">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <footer className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-600">
          <p>© 2026 Cidadela do Pracinha</p>
          <div className="flex gap-4">
            <Link to="/privacidade" className="hover:text-purple-400 transition">Privacidade</Link>
            <Link to="/termos" className="hover:text-purple-400 transition">Termos</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
