/**
 * TrilhaChampionship — Campeonato Online de Trilha.
 *
 * Layout:
 *  - Coluna esquerda: grupos com classificação
 *  - Coluna direita: próxima partida + status
 *  - UM botão "JOGAR" para a partida do jogador
 *  - Rodadas processadas em conjunto (bot×bot simulado automaticamente)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Trophy,
  Play,
  Link2,
  Crown,
  Swords,
  Plus,
  Target,
  Bot,
  ChevronRight,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  criarCampeonatoTrilha,
  entrarCampeonatoTrilha,
  sairCampeonatoTrilha,
  iniciarCampeonatoTrilha,
  registrarResultado,
  registrarResultadoEliminatorio,
  classificacaoGrupo,
  classificadosDosGrupos,
  nomeFaseEliminatoria,
  montarEliminatorias,
  salvarCampeonato,
  carregarCampeonato,
  limparCampeonato,
  preencherComRobots,
  simularConfrontoBots,
  isRobot,
  partidaDoJogador,
  rodadaSoBots,
  rodadaCompleta,
  type CampeonatoTrilha,
  type FormatoTrilha,
  type ParticipanteTrilha,
  type ConfrontoEliminatorio,
} from "@/lib/trilha/championship";
import { TrilhaOnlineGame } from "./TrilhaOnlineGame";

type SubView = "hub" | "criar" | "entrar" | "sala" | "jogo" | "rodadas";
type Props = { onBack?: () => void };

function nomeDo(camp: CampeonatoTrilha, uid: string): string {
  return camp.participantes.find((p) => p.user_id === uid)?.nome ?? "Jogador";
}

export function TrilhaChampionship({ onBack }: Props) {
  const [view, setView] = useState<SubView>("hub");
  const [camp, setCamp] = useState<CampeonatoTrilha | null>(null);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [toastLink, setToastLink] = useState<string | null>(null);
  const [nomeSala, setNomeSala] = useState("Campeonato Trilha");
  const [formato, setFormato] = useState<FormatoTrilha>("pontos");
  const [maxJogadores, setMaxJogadores] = useState<8 | 12 | 16 | 32>(8);
  const [codigoEntrar, setCodigoEntrar] = useState("");
  const [mesaAtiva, setMesaAtiva] = useState<string | null>(null);
  const [confrontoInfo, setConfrontoInfo] = useState<{
    tipo: "grupo" | "elim";
    grupoIdx?: number;
    elimIdx?: number;
    j1: string;
    j2: string;
  } | null>(null);
  const [preenchendoBots, setPreenchendoBots] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        const meta = data.user.user_metadata as Record<string, string> | undefined;
        setUserName(meta?.["name"] ?? data.user.email?.split("@")[0] ?? "Jogador");
      }
    });
  }, []);

  useEffect(() => {
    const salvo = carregarCampeonato();
    if (salvo && salvo.status !== "finalizado") { setCamp(salvo); setView("sala"); }
  }, []);

  useEffect(() => { if (camp && camp.status !== "finalizado") salvarCampeonato(camp); }, [camp]);

  // Auto-simular rodadas que só têm bots (no grupo do jogador e nos outros)
  useEffect(() => {
    if (!camp || camp.status !== "em_grupos" || !userId) return;
    let atualizado = { ...camp };
    let changed = false;
    for (let gi = 0; gi < atualizado.grupos.length; gi++) {
      const g = atualizado.grupos[gi];
      if (!g || g.rodadaAtual > g.totalRodadas) continue;
      // Se a rodada só tem bots, simula tudo
      if (rodadaSoBots(g)) {
        atualizado = { ...atualizado, grupos: [...atualizado.grupos] };
        let gCopy = { ...atualizado.grupos[gi]! };
        const pares = (() => {
          // importa a função local
          const { confrontosDaRodada } = require("@/lib/trilha/championship");
          return confrontosDaRodada(gCopy);
        })();
        for (const [j1, j2] of pares) {
          if (!isRobot(j1) || !isRobot(j2)) continue;
          const { vencedor_id } = simularConfrontoBots(j1, j2);
          gCopy = { ...gCopy, resultados: [...gCopy.resultados, { j1_id: j1, j2_id: j2, vencedor_id, mesa_id: "bot-sim", rodada: gCopy.rodadaAtual }] };
        }
        // Avançar rodada
        const resRodada = gCopy.resultados.filter((r) => r.rodada === gCopy.rodadaAtual);
        if (resRodada.length >= Math.floor(gCopy.participantes.length / 2) && gCopy.rodadaAtual <= gCopy.totalRodadas) {
          gCopy = { ...gCopy, rodadaAtual: gCopy.rodadaAtual + 1 };
        }
        atualizado.grupos[gi] = gCopy;
        changed = true;
      }
    }
    if (changed) setCamp(atualizado);
  }, [camp?.grupos?.map((g) => `${g.rodadaAtual}`).join(","), userId]);

  const handleCriar = useCallback(() => {
    if (!userId) { setErro("Faça login primeiro."); return; }
    const c = criarCampeonatoTrilha(nomeSala || "Campeonato Trilha", formato, { user_id: userId, nome: userName });
    setCamp(c); setView("sala"); setErro(null);
  }, [userId, userName, nomeSala, formato]);

  const handleEntrar = useCallback(() => {
    if (!userId || !camp) return;
    try { const u = entrarCampeonatoTrilha(camp, { user_id: userId, nome: userName }); setCamp(u); setErro(null); }
    catch (e) { setErro((e as Error).message); }
  }, [userId, userName, camp]);

  const handleSair = useCallback(() => {
    if (!userId || !camp) return;
    try {
      const u = sairCampeonatoTrilha(camp, userId);
      if (u.participantes.length === 0) { limparCampeonato(); setCamp(null); setView("hub"); }
      else setCamp(u);
    } catch (e) { setErro((e as Error).message); }
  }, [userId, camp]);

  const handleIniciar = useCallback(() => {
    if (!camp) return;
    try { setCamp(iniciarCampeonatoTrilha(camp)); setErro(null); }
    catch (e) { setErro((e as Error).message); }
  }, [camp]);

  const handlePreencherBots = useCallback(() => {
    if (!camp || camp.criador_id !== userId) return;
    setPreenchendoBots(true);
    try { setCamp(preencherComRobots(camp, maxJogadores)); setErro(null); }
    catch (e) { setErro((e as Error).message); }
    setPreenchendoBots(false);
  }, [camp, userId, maxJogadores]);

  const handleCopiarLink = useCallback(() => {
    if (!camp) return;
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/cidadela?campTrilha=${encodeURIComponent(camp.id)}`;
    void navigator.clipboard?.writeText(link).catch(() => {});
    setToastLink(link);
    window.setTimeout(() => setToastLink(null), 6000);
  }, [camp]);

  const handleJogarPartida = useCallback((tipo: "grupo" | "elim", j1: string, j2: string, grupoIdx?: number, elimIdx?: number) => {
    setConfrontoInfo({ tipo, j1, j2, ...(grupoIdx != null ? { grupoIdx } : {}), ...(elimIdx != null ? { elimIdx } : {}) });
    setMesaAtiva("creating");
  }, []);

  // Criar mesa para partida
  useEffect(() => {
    if (mesaAtiva !== "creating" || !confrontoInfo) return;
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("criar_mesa_trilha", {
          p_nome: `Camp ${confrontoInfo.j1} vs ${confrontoInfo.j2}`, p_formato: "normal", p_dificuldade: "recruta",
        });
        if (error) throw error;
        const mesaId = data as string;
        const { error: joinErr } = await supabase.rpc("entrar_mesa_trilha", { p_mesa_id: mesaId });
        if (joinErr) throw joinErr;
        setMesaAtiva(mesaId);
      } catch (e) {
        setErro((e as Error).message ?? "Erro ao criar mesa.");
        setMesaAtiva(null); setConfrontoInfo(null);
      }
    })();
  }, [mesaAtiva, confrontoInfo]);

  const handleFimPartida = useCallback((vencedorId: string | null) => {
    if (!camp || !confrontoInfo) return;
    if (confrontoInfo.tipo === "grupo" && confrontoInfo.grupoIdx !== undefined) {
      let atualizado = registrarResultado(camp, confrontoInfo.j1, confrontoInfo.j2, vencedorId, mesaAtiva ?? "");
      // Auto-simular bots nos outros grupos
      for (let gi = 0; gi < atualizado.grupos.length; gi++) {
        if (gi === confrontoInfo.grupoIdx) continue;
        const g = atualizado.grupos[gi];
        if (!g || g.rodadaAtual > g.totalRodadas) continue;
        if (rodadaSoBots(g)) {
          // Simular toda a rodada
          const { confrontosDaRodada } = await_import();
          const pares = confrontosDaRodada(g);
          let gCopy = { ...g };
          for (const [j1, j2] of pares) {
            if (!isRobot(j1) || !isRobot(j2)) continue;
            const { vencedor_id } = simularConfrontoBots(j1, j2);
            gCopy = { ...gCopy, resultados: [...gCopy.resultados, { j1_id: j1, j2_id: j2, vencedor_id, mesa_id: "bot-sim", rodada: gCopy.rodadaAtual }] };
          }
          const resRodada = gCopy.resultados.filter((r) => r.rodada === gCopy.rodadaAtual);
          if (resRodada.length >= Math.floor(gCopy.participantes.length / 2) && gCopy.rodadaAtual <= gCopy.totalRodadas) {
            gCopy = { ...gCopy, rodadaAtual: gCopy.rodadaAtual + 1 };
          }
          atualizado.grupos[gi] = gCopy;
        }
      }
      setCamp(atualizado);
    } else if (confrontoInfo.tipo === "elim" && confrontoInfo.elimIdx !== undefined) {
      setCamp(registrarResultadoEliminatorio(camp, confrontoInfo.elimIdx, vencedorId ?? "", mesaAtiva ?? ""));
    }
    setMesaAtiva(null); setConfrontoInfo(null);
  }, [camp, confrontoInfo, mesaAtiva]);

  const handleVoltarSala = useCallback(() => { setMesaAtiva(null); setConfrontoInfo(null); setView("sala"); }, []);

  // ── Jogo ativo ──
  if (mesaAtiva && mesaAtiva !== "creating" && confrontoInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#060910] via-[#0a1020] to-[#060910]">
        <header className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <button onClick={handleVoltarSala} className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5">
            <ArrowLeft className="size-4 text-white" />
          </button>
          <div>
            <p className="text-[9px] uppercase tracking-[0.25em] text-amber-400/60 font-bold">
              {confrontoInfo.tipo === "grupo" ? "Fase de Grupos" : "Eliminatória"}
            </p>
            <p className="text-sm font-black text-white">
              {nomeDo(camp!, confrontoInfo.j1)} × {nomeDo(camp!, confrontoInfo.j2)}
            </p>
          </div>
        </header>
        <TrilhaOnlineGame mesaId={mesaAtiva} onBack={handleVoltarSala} onFinish={(w) => handleFimPartida(w)} />
      </div>
    );
  }

  if (mesaAtiva === "creating") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 size-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <p className="text-xs text-white/50">Criando mesa...</p>
        </div>
      </div>
    );
  }

  // ── Sala do Campeonato ──
  if (camp && view === "sala") {
    return (
      <SalaCampeonato
        camp={camp} userId={userId}
        onBack={() => { limparCampeonato(); setCamp(null); setView("hub"); }}
        onIniciar={handleIniciar} onSair={handleSair}
        onCopiarLink={handleCopiarLink} onJogar={handleJogarPartida}
        onPreencherBots={handlePreencherBots} preenchendoBots={preenchendoBots}
        erro={erro} toastLink={toastLink} onDismissToast={() => setToastLink(null)}
        onVerRodadas={() => setView("rodadas")}
        setMaxJogadores={setMaxJogadores} maxJogadores={maxJogadores}
      />
    );
  }

  // ── Ver Rodadas ──
  if (camp && view === "rodadas") {
    return (
      <VerRodadas camp={camp} userId={userId} onBack={() => setView("sala")} onJogar={handleJogarPartida} />
    );
  }

  // ── Hub ──
  // Check for existing championship in localStorage
  const campExistente = view === "hub" ? carregarCampeonato() : null;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#060910] via-[#0a1020] to-[#060910]">
      <header className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        {onBack && <button onClick={onBack} className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5"><ArrowLeft className="size-4 text-white" /></button>}
        <Trophy className="size-4 text-amber-400" />
        <h1 className="text-sm font-black text-white">Campeonato Trilha</h1>
      </header>
      <div className="flex-1 space-y-2 p-4 pb-8">
        {view === "hub" && (
          <>
            {campExistente && (
              <button onClick={() => { setCamp(campExistente); setView("sala"); }} className="flex w-full items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 text-left transition hover:border-amber-400/40 active:scale-[0.98]">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-400"><Trophy className="size-5" /></div>
                <div className="flex-1">
                  <p className="text-sm font-black text-white">{campExistente.nome}</p>
                  <p className="text-[10px] text-white/40">{campExistente.participantes.length} jogadores · {campExistente.status === "aguardando" ? "Aguardando" : campExistente.status === "em_grupos" ? `Rodada ${campExistente.grupos[0]?.rodadaAtual ?? 1}` : campExistente.status}</p>
                </div>
                <ChevronRight className="text-amber-400/40" />
              </button>
            )}
            <button onClick={() => setView("criar")} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-emerald-400/40 active:scale-[0.98]">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-400"><Plus className="size-5" /></div>
              <div className="flex-1"><p className="text-sm font-black text-white">Criar Campeonato</p><p className="text-[10px] text-white/40">Defina nome, formato e convide jogadores</p></div>
              <ChevronRight className="text-white/20" />
            </button>
            <button onClick={() => setView("entrar")} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-blue-400/40 active:scale-[0.98]">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-400/15 text-blue-400"><Link2 className="size-5" /></div>
              <div className="flex-1"><p className="text-sm font-black text-white">Entrar por Código</p><p className="text-[10px] text-white/40">Cole o link ou código do campeonato</p></div>
              <ChevronRight className="text-white/20" />
            </button>
          </>
        )}
        {view === "criar" && (
          <div className="space-y-4">
            <button onClick={() => setView("hub")} className="flex items-center gap-1 text-xs text-white/40 hover:text-white"><ArrowLeft className="size-3" /> Voltar</button>
            <label className="block">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-white/40">Nome</span>
              <input className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-emerald-400/50 focus:outline-none" value={nomeSala} onChange={(e) => setNomeSala(e.target.value)} placeholder="Campeonato Trilha" maxLength={40} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-white/40">Formato</span>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setFormato("pontos")} className={`rounded-lg border p-3 text-left transition ${formato === "pontos" ? "border-emerald-400/60 bg-emerald-400/10" : "border-white/10 hover:border-white/20"}`}>
                  <div className="flex items-center gap-2"><Swords className="size-4 text-emerald-400" /><div><p className="text-xs font-bold text-white">Pontos Corridos</p><p className="text-[9px] text-white/40">Todos vs todos</p></div></div>
                </button>
                <button onClick={() => setFormato("grupos")} className={`rounded-lg border p-3 text-left transition ${formato === "grupos" ? "border-amber-400/60 bg-amber-400/10" : "border-white/10 hover:border-white/20"}`}>
                  <div className="flex items-center gap-2"><Target className="size-4 text-amber-400" /><div><p className="text-xs font-bold text-white">Grupos + Elim.</p><p className="text-[9px] text-white/40">Grupos → eliminatórias</p></div></div>
                </button>
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-white/40">Vagas</span>
              <div className="flex gap-1.5">
                {[8, 12, 16, 32].map((n) => (
                  <button key={n} onClick={() => setMaxJogadores(n as 8 | 12 | 16 | 32)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${maxJogadores === n ? "border-purple-400/60 bg-purple-400/10 text-white" : "border-white/10 text-white/30 hover:border-white/20"}`}>{n}</button>
                ))}
              </div>
            </label>
            <button onClick={handleCriar} disabled={!userId} className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50">Criar Campeonato</button>
            {erro && <p className="text-xs text-red-400">{erro}</p>}
          </div>
        )}
        {view === "entrar" && (
          <div className="space-y-4">
            <button onClick={() => setView("hub")} className="flex items-center gap-1 text-xs text-white/40 hover:text-white"><ArrowLeft className="size-3" /> Voltar</button>
            <label className="block">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-white/40">Código ou Link</span>
              <input className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 font-mono focus:border-blue-400/50 focus:outline-none" value={codigoEntrar} onChange={(e) => setCodigoEntrar(e.target.value)} placeholder="Cole o link aqui..." />
            </label>
            <button onClick={() => { if (!userId || !codigoEntrar.trim()) return; const raw = codigoEntrar.trim(); let campId = raw; const urlMatch = raw.match(/campTrilha=([^&]+)/); if (urlMatch?.[1]) campId = decodeURIComponent(urlMatch[1]); const existente = carregarCampeonato(); if (existente && existente.id === campId) { try { const u = entrarCampeonatoTrilha(existente, { user_id: userId, nome: userName }); setCamp(u); setView("sala"); setErro(null); } catch (e) { setErro((e as Error).message); } } else { setErro("Campeonato não encontrado neste navegador. Peça ao criador para compartilhar o mesmo dispositivo."); } }} disabled={!userId || !codigoEntrar.trim()} className="w-full rounded-lg bg-blue-500 py-3 text-sm font-bold text-white transition hover:bg-blue-400 disabled:opacity-50">Entrar</button>
            {erro && <p className="text-xs text-red-400">{erro}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SALA — layout compacto: esquerda=grupos, direita=próxima partida
// ═══════════════════════════════════════════════════════════════

function SalaCampeonato({
  camp, userId, onBack, onIniciar, onSair, onCopiarLink, onJogar,
  onPreencherBots, preenchendoBots, erro, toastLink, onDismissToast, onVerRodadas,
  setMaxJogadores, maxJogadores,
}: {
  camp: CampeonatoTrilha; userId: string;
  onBack: () => void; onIniciar: () => void; onSair: () => void;
  onCopiarLink: () => void;
  onJogar: (tipo: "grupo" | "elim", j1: string, j2: string, grupoIdx?: number, elimIdx?: number) => void;
  onPreencherBots: () => void; preenchendoBots: boolean;
  erro: string | null; toastLink: string | null; onDismissToast?: () => void;
  onVerRodadas: () => void;
  setMaxJogadores: (v: 8 | 12 | 16 | 32) => void; maxJogadores: 8 | 12 | 16 | 32;
}) {
  const isCriador = camp.criador_id === userId;

  // Encontrar partida do jogador
  const minhaPartida = useMemo(() => {
    if (camp.status !== "em_grupos") return null;
    for (let gi = 0; gi < camp.grupos.length; gi++) {
      const g = camp.grupos[gi];
      if (!g) continue;
      const p = partidaDoJogador(g, userId);
      if (p) return { j1: p[0], j2: p[1], grupoIdx: gi };
    }
    return null;
  }, [camp, userId]);

  // Encontrar confronto eliminatório pendente do jogador
  const meuConfrontoElim = useMemo(() => {
    if (camp.status !== "eliminatorias") return null;
    return camp.confrontosEliminatorios.find((c) => !c.vencedor_id && !c.bye && (c.j1_id === userId || c.j2_id === userId));
  }, [camp, userId]);

  const vagas = maxJogadores - camp.participantes.length;
  const totalRodadas = camp.grupos[0]?.totalRodadas ?? 0;
  const rodadaAtual = camp.grupos[0]?.rodadaAtual ?? 0;

  // ── AGUARDANDO ──
  if (camp.status === "aguardando") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#060910] via-[#0a1020] to-[#060910]">
        <header className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <button onClick={onBack} className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5"><ArrowLeft className="size-4 text-white" /></button>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black text-white truncate">{camp.nome}</h2>
            <p className="text-[9px] text-white/30">{camp.participantes.length}/{maxJogadores} · {camp.formato === "grupos" ? "Grupos + Elim." : "Pontos Corridos"}</p>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-4 space-y-3">
          {erro && <p className="text-xs text-red-400">{erro}</p>}

          {/* Jogadores */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="mb-2 text-[9px] uppercase tracking-widest text-white/30 font-bold">Jogadores ({camp.participantes.length})</p>
            <div className="grid grid-cols-2 gap-1.5">
              {camp.participantes.map((p) => (
                <div key={p.user_id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${p.user_id === camp.criador_id ? "border-amber-500/30 bg-amber-500/5" : p.bot ? "border-sky-500/15 bg-sky-500/5" : "border-white/10 bg-white/[0.02]"}`}>
                  <div className={`size-5 shrink-0 rounded flex items-center justify-center text-[9px] ${p.user_id === camp.criador_id ? "bg-amber-500/15 text-amber-400" : p.bot ? "bg-sky-500/15 text-sky-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                    {p.user_id === camp.criador_id ? "★" : p.bot ? <Bot className="size-2.5" /> : "●"}
                  </div>
                  <span className="truncate font-bold text-white/80">{p.nome}</span>
                </div>
              ))}
              {Array.from({ length: Math.max(0, vagas) }).map((_, i) => (
                <div key={`v-${i}`} className="flex items-center justify-center rounded-lg border border-dashed border-white/10 px-2.5 py-1.5 text-[9px] text-white/15">Vaga</div>
              ))}
            </div>
          </div>

          {/* Controles */}
          <div className="flex gap-2">
            <button onClick={onCopiarLink} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-300 transition hover:border-emerald-500/40">
              <Link2 className="size-3" /> Convidar
            </button>
            {isCriador && vagas > 0 && (
              <button onClick={onPreencherBots} disabled={preenchendoBots} className="flex items-center gap-1.5 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2.5 text-xs font-bold text-sky-300 transition hover:border-sky-500/30 disabled:opacity-50">
                <Bot className="size-3" /> {preenchendoBots ? "..." : `+${vagas} Robots`}
              </button>
            )}
            {isCriador && camp.participantes.length >= 2 && (
              <button onClick={onIniciar} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-500 hover:to-emerald-400">
                <Play className="size-3" /> INICIAR
              </button>
            )}
            <button onClick={onSair} className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-white/30 transition hover:text-white/60">Sair</button>
          </div>
          <button onClick={onVerRodadas} className="flex w-full items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[10px] font-bold text-white/25 transition hover:text-white/50">
            Ver Rodadas <ChevronRight className="size-3" />
          </button>
        </main>
      </div>
    );
  }

  // ── EM ANDAMENTO / FINALIZADO ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060910] via-[#0a1020] to-[#060910]">
      <header className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        <button onClick={onBack} className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5"><ArrowLeft className="size-4 text-white" /></button>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black text-white truncate">{camp.nome}</h2>
          <p className="text-[9px] text-white/30">
            {camp.status === "em_grupos" ? `Rodada ${rodadaAtual}/${totalRodadas}` : camp.status === "finalizado" ? "Finalizado" : "Eliminatórias"}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4">
        {erro && <p className="mb-2 text-xs text-red-400">{erro}</p>}

        {/* ═══ FINALIZADO ═══ */}
        {camp.status === "finalizado" && camp.vencedor_id && (
          <div className="flex flex-col items-center py-6">
            <div className="relative mb-3">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl" />
              <div className="relative flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30"><Crown className="size-8 text-amber-400" /></div>
            </div>
            <p className="text-[9px] uppercase tracking-[0.4em] text-amber-400/60 font-bold">Campeão</p>
            <h2 className="mt-1 text-2xl font-black text-white">{nomeDo(camp, camp.vencedor_id)}</h2>
            <button onClick={() => { limparCampeonato(); onBack(); }} className="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/50 transition hover:text-white">Voltar</button>
          </div>
        )}

        {/* ═══ EM ANDAMENTO — layout 2 colunas ═══ */}
        {camp.status === "em_grupos" && (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
            {/* Esquerda: Grupos */}
            <div className="space-y-2">
              <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Grupos</p>
              {camp.grupos.map((g) => {
                const cls = classificacaoGrupo(g);
                return (
                  <div key={g.nome} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                    <p className="mb-1.5 flex items-center gap-1 text-[9px] uppercase tracking-widest text-amber-400/60 font-bold"><Target className="size-2.5" /> Grupo {g.nome}</p>
                    <table className="w-full text-[10px]">
                      <thead><tr className="border-b border-white/5">
                        <th className="pb-1 text-left font-normal text-white/20">#</th>
                        <th className="pb-1 text-left font-normal text-white/20">JOGADOR</th>
                        <th className="pb-1 w-6 text-center font-normal text-white/20">PTS</th>
                        <th className="pb-1 w-5 text-center font-normal text-white/20">V</th>
                      </tr></thead>
                      <tbody>
                        {cls.map((r, i) => (
                          <tr key={r.user_id} className={`border-b border-white/5 last:border-0 ${r.user_id === userId ? "bg-emerald-500/5" : ""}`}>
                            <td className="py-1 font-bold text-white/30">{i + 1}º</td>
                            <td className="py-1 font-bold text-white/80">
                              {nomeDo(camp, r.user_id)}
                              {isRobot(r.user_id) && <Bot className="ml-0.5 inline size-2 text-sky-400" />}
                            </td>
                            <td className="py-1 text-center font-black text-amber-300">{r.pts}</td>
                            <td className="py-1 text-center text-emerald-400">{r.v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>

            {/* Direita: Próxima Partida + Status */}
            <div className="space-y-3">
              <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Sua Partida</p>

              {minhaPartida ? (
                <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-slate-950/60 p-4">
                  <p className="text-[9px] uppercase tracking-widest text-emerald-400/80 font-bold mb-2">Rodada {rodadaAtual}</p>
                  <p className="text-base font-black text-white mb-3">
                    {nomeDo(camp, minhaPartida.j1)} <span className="text-white/20">×</span> {nomeDo(camp, minhaPartida.j2)}
                  </p>
                  <button onClick={() => onJogar("grupo", minhaPartida.j1, minhaPartida.j2, minhaPartida.grupoIdx)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-3 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.97]">
                    <Play className="size-4" /> JOGAR PARTIDA
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                  <p className="text-xs text-white/30">
                    {rodadaAtual > totalRodadas ? "Rodadas concluídas!" : "Aguardando próxima rodada..."}
                  </p>
                </div>
              )}

              {/* Status */}
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-2">Status</p>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="rounded bg-white/[0.02] p-1.5 text-center">
                    <p className="text-[8px] text-white/20">Rodada</p>
                    <p className="font-black text-white">{rodadaAtual}/{totalRodadas}</p>
                  </div>
                  <div className="rounded bg-white/[0.02] p-1.5 text-center">
                    <p className="text-[8px] text-white/20">Jogadores</p>
                    <p className="font-black text-white">{camp.participantes.length}</p>
                  </div>
                  <div className="rounded bg-white/[0.02] p-1.5 text-center">
                    <p className="text-[8px] text-white/20">Humanos</p>
                    <p className="font-black text-emerald-300">{camp.participantes.filter((p) => !p.bot).length}</p>
                  </div>
                  <div className="rounded bg-white/[0.02] p-1.5 text-center">
                    <p className="text-[8px] text-white/20">Robots</p>
                    <p className="font-black text-sky-300">{camp.participantes.filter((p) => p.bot).length}</p>
                  </div>
                </div>
              </div>

              <button onClick={onVerRodadas} className="flex w-full items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[10px] font-bold text-white/25 transition hover:text-white/50">
                Ver Todas as Rodadas <ChevronRight className="size-3" />
              </button>
            </div>
          </div>
        )}

        {/* ═══ ELIMINATÓRIAS ═══ */}
        {camp.status === "eliminatorias" && (
          <div className="space-y-3">
            {meuConfrontoElim ? (
              <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-slate-950/60 p-4">
                <p className="text-[9px] uppercase tracking-widest text-emerald-400/80 font-bold mb-2">{nomeFaseEliminatoria(camp.confrontosEliminatorios.filter((c) => c.rodada === meuConfrontoElim.rodada).length)}</p>
                <p className="text-base font-black text-white mb-3">
                  {nomeDo(camp, meuConfrontoElim.j1_id!)} <span className="text-white/20">×</span> {nomeDo(camp, meuConfrontoElim.j2_id!)}
                </p>
                <button onClick={() => onJogar("elim", meuConfrontoElim.j1_id!, meuConfrontoElim.j2_id!, undefined, camp.confrontosEliminatorios.indexOf(meuConfrontoElim))} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-3 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.97]">
                  <Play className="size-4" /> JOGAR PARTIDA
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                <p className="text-xs text-white/30">Aguardando confronto...</p>
              </div>
            )}

            {/* Bracket */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="mb-2 text-[9px] uppercase tracking-widest text-amber-400/60 font-bold"><Crown className="inline size-2.5" /> Chave</p>
              <div className="space-y-2">
                {(() => {
                  const rodadas = new Map<number, ConfrontoEliminatorio[]>();
                  camp.confrontosEliminatorios.forEach((c) => {
                    const arr = rodadas.get(c.rodada) ?? [];
                    arr.push(c);
                    rodadas.set(c.rodada, arr);
                  });
                  return Array.from(rodadas.entries())
                    .sort(([a], [b]) => b - a)
                    .map(([rod, items]) => (
                      <div key={rod}>
                        <p className="text-[8px] uppercase tracking-widest text-amber-400/40 font-bold mb-1">{nomeFaseEliminatoria(items.length)}</p>
                        {items.map((c, idx) => (
                          <div key={idx} className={`flex items-center justify-between rounded px-2 py-1 text-[10px] ${c.vencedor_id ? "bg-emerald-500/5" : "bg-white/[0.02]"}`}>
                            <span className={c.vencedor_id === c.j1_id ? "font-bold text-emerald-300" : "text-white/60"}>{nomeDo(camp, c.j1_id ?? "")}</span>
                            <span className="text-white/20">×</span>
                            <span className={c.vencedor_id === c.j2_id ? "font-bold text-emerald-300" : "text-white/60"}>{c.j2_id ? nomeDo(camp, c.j2_id) : "BYE"}</span>
                          </div>
                        ))}
                      </div>
                    ));
                })()}
              </div>
            </div>
          </div>
        )}

        {toastLink && (
          <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/90 px-3 py-2 text-[10px] text-emerald-300 shadow-xl backdrop-blur-sm">
              <Link2 className="size-3 shrink-0" />
              <span className="max-w-[200px] truncate">{toastLink}</span>
              <button onClick={onDismissToast} className="text-emerald-400/40 hover:text-emerald-300"><X className="size-3" /></button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// VER RODADAS — modal/lista completa de todas as rodadas
// ═══════════════════════════════════════════════════════════════

function VerRodadas({ camp, userId, onBack, onJogar }: {
  camp: CampeonatoTrilha; userId: string;
  onBack: () => void;
  onJogar: (tipo: "grupo" | "elim", j1: string, j2: string, grupoIdx?: number, elimIdx?: number) => void;
}) {
  const nomeDoLocal = (uid: string) => camp.participantes.find((p) => p.user_id === uid)?.nome ?? "Jogador";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060910] via-[#0a1020] to-[#060910]">
      <header className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        <button onClick={onBack} className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5"><ArrowLeft className="size-4 text-white" /></button>
        <h2 className="text-sm font-black text-white">Rodadas</h2>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-4 space-y-3">
        {camp.grupos.map((g, gi) => {
          const totalRodadas = g.totalRodadas;
          const rodadas = (() => {
            // Rebuild rodadas from results
            const map = new Map<number, { j1: string; j2: string; vencedor: string | null }[]>();
            for (const r of g.resultados) {
              const arr = map.get(r.rodada) ?? [];
              arr.push({ j1: r.j1_id, j2: r.j2_id, vencedor: r.vencedor_id });
              map.set(r.rodada, arr);
            }
            return map;
          })();

          return (
            <div key={g.nome} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="mb-2 text-[9px] uppercase tracking-widest text-amber-400/60 font-bold"><Target className="inline size-2.5" /> Grupo {g.nome}</p>
              {Array.from({ length: totalRodadas }, (_, i) => i + 1).map((rod) => {
                const resultados = rodadas.get(rod) ?? [];
                const isCurrent = rod === g.rodadaAtual;
                return (
                  <div key={rod} className={`mb-2 rounded-lg border px-2.5 py-1.5 ${isCurrent ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-white/[0.04] bg-white/[0.01]"}`}>
                    <p className={`mb-1 text-[8px] uppercase tracking-widest font-bold ${isCurrent ? "text-emerald-400/60" : "text-white/20"}`}>Rodada {rod}{isCurrent ? " (atual)" : ""}</p>
                    {resultados.length > 0 ? (
                      <div className="space-y-0.5">
                        {resultados.map((r, ri) => (
                          <div key={ri} className="flex items-center justify-between text-[10px]">
                            <span className={r.vencedor === r.j1 ? "font-bold text-emerald-300" : "text-white/50"}>{nomeDoLocal(r.j1)}</span>
                            <span className="text-white/15">×</span>
                            <span className={r.vencedor === r.j2 ? "font-bold text-emerald-300" : "text-white/50"}>{nomeDoLocal(r.j2)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] text-white/15">Aguardando...</p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </main>
    </div>
  );
}

// Helper to avoid circular import
function await_import() {
  return require("@/lib/trilha/championship");
}
