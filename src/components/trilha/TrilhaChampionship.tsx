/**
 * TrilhaChampionship — Campeonato Online de Trilha.
 *
 * Copia a estrutura do OnlineChampionship do futebol, adaptada para Trilha:
 * - Dois formatos: Pontos Corridos (todos vs todos) + Grupos & Eliminatórias
 * - Partidas individuais usam as mesas existentes (mesas_trilha)
 * - Classificação calculada no cliente
 * - Bracket de eliminatórias reutiliza MataMataBracket do futebol
 * - Estado persistido em localStorage (resiste a F5)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Users,
  Trophy,
  Play,
  Link2,
  Crown,
  Swords,
  RefreshCw,
  Plus,
  ChevronRight,
  Target,
  Zap,
  Bot,
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
  type CampeonatoTrilha,
  type FormatoTrilha,
  type ParticipanteTrilha,
  type ConfrontoEliminatorio,
} from "@/lib/trilha/championship";
import { TrilhaOnlineGame } from "./TrilhaOnlineGame";

// ─────────────────────────── types ─────────────────────────────

type SubView = "hub" | "criar" | "entrar" | "salas" | "sala" | "jogo";

type MaxJogadores = 4 | 8 | 12 | 16 | 32;

type Props = {
  onBack?: () => void;
};

// ─────────────────────────── helpers ───────────────────────────

function nomeDo(camp: CampeonatoTrilha, uid: string): string {
  return camp.participantes.find((p) => p.user_id === uid)?.nome ?? "Jogador";
}

// ─────────────────────────── main component ────────────────────

export function TrilhaChampionship({ onBack }: Props) {
  const [view, setView] = useState<SubView>("hub");
  const [camp, setCamp] = useState<CampeonatoTrilha | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);
  const [toastLink, setToastLink] = useState<string | null>(null);

  // Criar
  const [nomeSala, setNomeSala] = useState("Campeonato Trilha");
  const [formato, setFormato] = useState<FormatoTrilha>("pontos");
  const [maxJogadores, setMaxJogadores] = useState<MaxJogadores>(8);
  const [codigoEntrar, setCodigoEntrar] = useState("");
  const [preenchendoBots, setPreenchendoBots] = useState(false);

  // Jogo ativo
  const [mesaAtiva, setMesaAtiva] = useState<string | null>(null);
  const [confrontoInfo, setConfrontoInfo] = useState<{
    tipo: "grupo" | "elim";
    grupoIdx: number | undefined;
    elimIdx: number | undefined;
    j1: string;
    j2: string;
  } | null>(null);

  // Buscar user
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        const meta = data.user.user_metadata as Record<string, string> | undefined;
        setUserName(meta?.["name"] ?? data.user.email?.split("@")[0] ?? "Jogador");
      }
    });
  }, []);

  // Restaurar de localStorage
  useEffect(() => {
    const salvo = carregarCampeonato();
    if (salvo && salvo.status !== "finalizado") {
      setCamp(salvo);
      setView("sala");
    }
  }, []);

  // Persistir ao mudar
  useEffect(() => {
    if (camp && camp.status !== "finalizado") {
      salvarCampeonato(camp);
    }
  }, [camp]);

  // Auto-simulate bot vs bot matches
  const [simulating, setSimulating] = useState(false);
  useEffect(() => {
    if (!camp || camp.criador_id !== userId || camp.status !== "em_grupos" || simulating) return;
    const botMatches: { j1: string; j2: string }[] = [];
    camp.grupos.forEach((g) => {
      const ids = g.participantes;
      const jogados = new Set<string>();
      for (const r of g.resultados) {
        jogados.add([r.j1_id, r.j2_id].sort().join(":"));
      }
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const ii = ids[i];
          const jj = ids[j];
          if (ii && jj && !jogados.has([ii, jj].sort().join(":"))) {
            if (isRobot(ii) && isRobot(jj)) {
              botMatches.push({ j1: ii, j2: jj });
            }
          }
        }
      }
    });
    if (botMatches.length === 0) return;
    setSimulating(true);
    let atualizado = { ...camp };
    for (const match of botMatches) {
      const resultado = simularConfrontoBots(match.j1, match.j2);
      atualizado = registrarResultado(atualizado, match.j1, match.j2, resultado.vencedor_id, "bot-sim");
    }
    setCamp(atualizado);
    setSimulating(false);
  }, [camp, userId, simulating]);

  // ─── Handlers ───

  const handleCriar = useCallback(() => {
    if (!userId) { setErro("Faça login primeiro."); return; }
    const c = criarCampeonatoTrilha(nomeSala || "Campeonato Trilha", formato, { user_id: userId, nome: userName });
    setCamp(c);
    setView("sala");
    setErro(null);
  }, [userId, userName, nomeSala, formato]);

  const handlePreencherBots = useCallback(() => {
    if (!camp || camp.criador_id !== userId) return;
    setPreenchendoBots(true);
    try {
      const atualizado = preencherComRobots(camp, maxJogadores);
      setCamp(atualizado);
      setErro(null);
    } catch (e) { setErro((e as Error).message); }
    setPreenchendoBots(false);
  }, [camp, userId, maxJogadores]);

  const handleEntrar = useCallback(() => {
    if (!userId || !camp) return;
    try {
      const atualizado = entrarCampeonatoTrilha(camp, { user_id: userId, nome: userName });
      setCamp(atualizado);
      setErro(null);
    } catch (e) { setErro((e as Error).message); }
  }, [userId, userName, camp]);

  const handleSair = useCallback(() => {
    if (!userId || !camp) return;
    try {
      const atualizado = sairCampeonatoTrilha(camp, userId);
      if (atualizado.participantes.length === 0) {
        limparCampeonato();
        setCamp(null);
        setView("hub");
      } else {
        setCamp(atualizado);
      }
    } catch (e) { setErro((e as Error).message); }
  }, [userId, camp]);

  const handleIniciar = useCallback(() => {
    if (!camp) return;
    try {
      const atualizado = iniciarCampeonatoTrilha(camp);
      setCamp(atualizado);
      setErro(null);
    } catch (e) { setErro((e as Error).message); }
  }, [camp]);

  const handleCopiarLink = useCallback(() => {
    if (!camp) return;
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${base}/cidadela?campTrilha=${encodeURIComponent(camp.id)}`;
    void navigator.clipboard?.writeText(link).catch(() => {});
    setToastLink(link);
    window.setTimeout(() => setToastLink(null), 6000);
  }, [camp]);

  const handleJogarPartida = useCallback(
    (
      tipo: "grupo" | "elim",
      j1: string,
      j2: string,
      grupoIdx?: number,
      elimIdx?: number,
    ) => {
      setConfrontoInfo({ tipo, j1, j2, grupoIdx: grupoIdx ?? undefined, elimIdx: elimIdx ?? undefined });
      setMesaAtiva("creating");
    },
    [],
  );

  // Criar mesa quando mesaAtiva = "creating"
  useEffect(() => {
    if (mesaAtiva !== "creating" || !confrontoInfo) return;
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("criar_mesa_trilha", {
          p_nome: `Camp ${confrontoInfo.j1} vs ${confrontoInfo.j2}`,
          p_formato: "normal",
          p_dificuldade: "recruta",
        });
        if (error) throw error;
        const mesaId = data as string;
        // Entrar na mesa
        const { error: joinErr } = await supabase.rpc("entrar_mesa_trilha", {
          p_mesa_id: mesaId,
        });
        if (joinErr) throw joinErr;
        setMesaAtiva(mesaId);
      } catch (e) {
        setErro((e as Error).message ?? "Erro ao criar mesa.");
        setMesaAtiva(null);
        setConfrontoInfo(null);
      }
    })();
  }, [mesaAtiva, confrontoInfo]);

  const handleFimPartida = useCallback(
    (vencedorId: string | null) => {
      if (!camp || !confrontoInfo) return;
      if (confrontoInfo.tipo === "grupo" && confrontoInfo.grupoIdx !== undefined) {
        // Atualizar resultado do grupo
        const grupos = [...camp.grupos];
        const gIdx = confrontoInfo.grupoIdx ?? 0;
        const g = grupos[gIdx];
        if (g) {
          grupos[gIdx] = {
            ...g,
            resultados: [
              ...g.resultados,
              {
                j1_id: confrontoInfo.j1,
                j2_id: confrontoInfo.j2,
                vencedor_id: vencedorId,
                mesa_id: mesaAtiva ?? "",
                rodada: camp.rodadaAtual,
              },
            ],
          };
          const totalPartidas = (g.participantes.length * (g.participantes.length - 1)) / 2;
          const finalizado = grupos[gIdx]?.resultados.length >= totalPartidas;

          if (finalizado && camp.formato === "pontos") {
            const first = grupos[0];
            if (first) {
              const cls = classificacaoGrupo(first);
              const winner = cls[0];
              setCamp({ ...camp, grupos, status: "finalizado", vencedor_id: winner?.user_id ?? null });
            }
          } else if (camp.formato === "grupos") {
            const todosFin = grupos.every((g2) => {
              const t = (g2.participantes.length * (g2.participantes.length - 1)) / 2;
              return g2.resultados.length >= t;
            });
            if (todosFin) {
              const classificados = classificadosDosGrupos(grupos);
              const confrontos = montarEliminatorias(classificados);
              setCamp({ ...camp, grupos, confrontosEliminatorios: confrontos, status: "eliminatorias" });
            } else {
              setCamp({ ...camp, grupos });
            }
          } else {
            setCamp({ ...camp, grupos });
          }
        }
      } else if (confrontoInfo.tipo === "elim" && confrontoInfo.elimIdx !== undefined) {
        const atualizado = registrarResultadoEliminatorio(
          camp,
          confrontoInfo.elimIdx,
          vencedorId ?? "",
          mesaAtiva ?? "",
        );
        setCamp(atualizado);
      }
      setMesaAtiva(null);
      setConfrontoInfo(null);
    },
    [camp, confrontoInfo, mesaAtiva],
  );

  const handleVoltarSala = useCallback(() => {
    setMesaAtiva(null);
    setConfrontoInfo(null);
    setView("sala");
  }, []);

  // ─── Jogo ativo ───
  if (mesaAtiva && mesaAtiva !== "creating" && confrontoInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#080c16] via-[#0b1220] to-[#080c16]">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={handleVoltarSala} className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10">
              <ArrowLeft className="size-4 text-white" />
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-amber-400/60 font-bold">
                {confrontoInfo.tipo === "grupo" ? "Fase de Grupos" : "Eliminatória"}
              </p>
              <p className="font-display text-sm font-black text-white">
                {nomeDo(camp!, confrontoInfo.j1)} × {nomeDo(camp!, confrontoInfo.j2)}
              </p>
            </div>
          </div>
        </header>
        <TrilhaOnlineGame
          mesaId={mesaAtiva}
          onBack={handleVoltarSala}
          onFinish={(winnerId) => handleFimPartida(winnerId)}
        />
      </div>
    );
  }

  if (mesaAtiva === "creating") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#080c16] via-[#0b1220] to-[#080c16]">
        <div className="text-center">
          <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <p className="text-sm text-white/50">Criando mesa...</p>
        </div>
      </div>
    );
  }

  // ─── Tela da sala ───
  if (camp && view === "sala") {
    return (        <SalaCampeonato
        camp={camp}
        userId={userId}
        onBack={() => {
          limparCampeonato();
          setCamp(null);
          setView("hub");
        }}
        onIniciar={handleIniciar}
        onSair={handleSair}
        onCopiarLink={handleCopiarLink}
        onJogar={handleJogarPartida}
        erro={erro}
        toastLink={toastLink}
        onPreencherBots={handlePreencherBots}
        preenchendoBots={preenchendoBots}
      />
    );
  }

  // ─── Hub ───
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#080c16] via-[#0b1220] to-[#080c16]">
      <header className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        {onBack && (
          <button onClick={onBack} className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10">
            <ArrowLeft className="size-4 text-white" />
          </button>
        )}
        <Trophy className="size-5 text-amber-400" />
        <h1 className="font-display text-lg text-white">Campeonato Trilha</h1>
      </header>

      <div className="flex-1 space-y-3 p-4 pb-8">
        {view === "hub" && (
          <>
            <button onClick={() => setView("criar")} className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-emerald-400/40 hover:bg-emerald-400/5 active:scale-[0.98]">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-400 transition group-hover:bg-emerald-400/25">
                <Plus className="size-6" />
              </div>
              <div className="flex-1">
                <p className="font-display text-lg text-white">Criar Campeonato</p>
                <p className="text-xs text-white/40">Defina nome, formato e convide jogadores</p>
              </div>
              <ChevronRight className="text-white/20 transition group-hover:text-emerald-400" />
            </button>

            <button onClick={() => setView("entrar")} className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-blue-400/40 hover:bg-blue-400/5 active:scale-[0.98]">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-blue-400/15 text-blue-400 transition group-hover:bg-blue-400/25">
                <Link2 className="size-6" />
              </div>
              <div className="flex-1">
                <p className="font-display text-lg text-white">Entrar por Código</p>
                <p className="text-xs text-white/40">Cole o link ou código do campeonato</p>
              </div>
              <ChevronRight className="text-white/20 transition group-hover:text-blue-400" />
            </button>
          </>
        )}

        {view === "criar" && (
          <div className="space-y-5">
            <button onClick={() => setView("hub")} className="flex items-center gap-2 text-sm text-white/40 hover:text-white">
              <ArrowLeft className="size-4" /> Voltar
            </button>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">Nome</span>
              <input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-emerald-400/50 focus:outline-none" value={nomeSala} onChange={(e) => setNomeSala(e.target.value)} placeholder="Campeonato Trilha" maxLength={40} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">Formato</span>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => setFormato("pontos")} className={`rounded-xl border p-4 text-left transition ${formato === "pontos" ? "border-emerald-400/60 bg-emerald-400/10" : "border-white/10 hover:border-white/20"}`}>
                  <div className="flex items-center gap-3">
                    <Swords className="size-5 text-emerald-400" />
                    <div>
                      <p className="text-sm font-bold text-white">Pontos Corridos</p>
                      <p className="text-[11px] text-white/40">Todos vs todos — campeão por pontos</p>
                    </div>
                  </div>
                </button>
                <button onClick={() => setFormato("grupos")} className={`rounded-xl border p-4 text-left transition ${formato === "grupos" ? "border-amber-400/60 bg-amber-400/10" : "border-white/10 hover:border-white/20"}`}>
                  <div className="flex items-center gap-3">
                    <Target className="size-5 text-amber-400" />
                    <div>
                      <p className="text-sm font-bold text-white">Grupos + Eliminatórias</p>
                      <p className="text-[11px] text-white/40">Grupos → 2 melhores → chave eliminatória → campeão</p>
                    </div>
                  </div>
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">Máximo de Jogadores</span>
              <div className="grid grid-cols-4 gap-2">
                {[4, 8, 12, 16, 32].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMaxJogadores(n as MaxJogadores)}
                    className={`rounded-xl border p-3 text-center transition ${
                      maxJogadores === n
                        ? "border-purple-400/60 bg-purple-400/10 text-white"
                        : "border-white/10 text-white/40 hover:border-white/20"
                    }`}
                  >
                    <p className="font-display text-lg font-black">{n}</p>
                    <p className="text-[9px] text-white/30">vagas</p>
                  </button>
                ))}
              </div>
            </label>

            <button onClick={handleCriar} disabled={!userId} className="w-full rounded-xl bg-emerald-500 py-3.5 font-display text-sm font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50">
              Criar Campeonato
            </button>
            {erro && <p className="text-sm text-red-400">{erro}</p>}
          </div>
        )}

        {view === "entrar" && (
          <div className="space-y-5">
            <button onClick={() => setView("hub")} className="flex items-center gap-2 text-sm text-white/40 hover:text-white">
              <ArrowLeft className="size-4" /> Voltar
            </button>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">Código ou Link</span>
              <input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 font-mono focus:border-blue-400/50 focus:outline-none" value={codigoEntrar} onChange={(e) => setCodigoEntrar(e.target.value)} placeholder="Cole o link aqui..." />
            </label>
            <button onClick={() => {
              if (!userId || !codigoEntrar.trim()) return;
              // TODO: lookup by code from localStorage or simple match
              setErro("Para entrar, cole o link completo do campeonato.");
            }} disabled={!userId || !codigoEntrar.trim()} className="w-full rounded-xl bg-blue-500 py-3.5 font-display text-sm font-bold text-white transition hover:bg-blue-400 disabled:opacity-50">
              Entrar
            </button>
            {erro && <p className="text-sm text-red-400">{erro}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── Sala do Campeonato ────────────────

function SalaCampeonato({
  camp,
  userId,
  onBack,
  onIniciar,
  onSair,
  onCopiarLink,
  onJogar,
  erro,
  toastLink,
  onPreencherBots,
  preenchendoBots,
}: {
  camp: CampeonatoTrilha;
  userId: string;
  onBack: () => void;
  onIniciar: () => void;
  onSair: () => void;
  onCopiarLink: () => void;
  onJogar: (tipo: "grupo" | "elim", j1: string, j2: string, grupoIdx?: number, elimIdx?: number) => void;
  erro: string | null;
  toastLink: string | null;
  onPreencherBots?: () => void;
  preenchendoBots?: boolean;
}) {
  const isCriador = camp.criador_id === userId;
  const emGrupo = (uid: string) => camp.grupos.find((g) => g.participantes.includes(uid));



  return (
    <div className="min-h-screen bg-gradient-to-br from-[#080c16] via-[#0b1220] to-[#080c16]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10">
            <ArrowLeft className="size-4 text-white" />
          </button>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-black text-white truncate">{camp.nome}</h2>
            <div className="flex items-center gap-2 text-[10px] text-white/40">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${camp.formato === "grupos" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                {camp.formato === "grupos" ? "Grupos + Elim." : "Pontos Corridos"}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                camp.status === "finalizado" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/50"
              }`}>
                {camp.status === "aguardando" ? "Aguardando" : camp.status === "finalizado" ? "Finalizado" : "Em andamento"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {erro && <p className="text-sm text-red-400">{erro}</p>}
        {toastLink && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs break-all text-emerald-300">
            ✓ Link copiado: {toastLink}
          </div>
        )}

        {/* ═══ AGUARDANDO ═══ */}
        {camp.status === "aguardando" && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-white/30 font-bold">Jogadores ({camp.participantes.length})</p>
              <div className="grid grid-cols-2 gap-2">
                {camp.participantes.map((p) => (
                  <div key={p.user_id} className={`flex items-center gap-3 rounded-xl border p-3 ${p.user_id === camp.criador_id ? "border-amber-500/30 bg-amber-500/5" : p.bot ? "border-sky-500/15 bg-sky-500/5" : "border-white/10 bg-white/[0.02]"}`}>
                    <div className={`flex size-8 items-center justify-center rounded-lg text-xs ${p.user_id === camp.criador_id ? "bg-amber-500/15 text-amber-400" : p.bot ? "bg-sky-500/15 text-sky-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                      {p.user_id === camp.criador_id ? <Crown className="size-3.5" /> : p.bot ? <Bot className="size-3.5" /> : <Users className="size-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{p.nome}</p>
                      {p.user_id === camp.criador_id && <span className="text-[9px] text-amber-400/60">host</span>}
                      {p.bot && <span className="text-[9px] text-sky-400/60">robot</span>}
                    </div>
                  </div>
                ))}
                {camp.participantes.length < 2 && (
                  <div className="flex items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-3 text-xs text-white/20">
                    Aguardando jogadores...
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={onCopiarLink} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 transition hover:border-emerald-500/40">
                <Link2 className="size-4" /> Convidar
              </button>
              {isCriador && (
                <button
                  onClick={() => {
                    if (!camp) return;
                    const maxJ = camp.participantes.length >= 32 ? 32 : camp.participantes.length >= 16 ? 16 : camp.participantes.length >= 12 ? 12 : 8;
                    if (onPreencherBots) onPreencherBots();
                  }}
                  disabled={preenchendoBots}
                  className="flex items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm font-bold text-sky-300 transition hover:border-sky-500/30 disabled:opacity-50"
                >
                  <Bot className="size-4" /> {preenchendoBots ? "Preenchendo..." : "Preencher com Robots"}
                </button>
              )}
              {isCriador && camp.participantes.length >= 2 && (
                <button onClick={onIniciar} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-500 hover:to-emerald-400">
                  <Play className="size-4" /> INICIAR
                </button>
              )}
              <button onClick={onSair} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/40 transition hover:text-white/70">
                Sair
              </button>
            </div>
          </div>
        )}

        {/* ═══ EM ANDAMENTO ═══ */}
        {(camp.status === "em_grupos" || camp.status === "eliminatorias") && (
          <div className="space-y-5">
            {/* Fase de Grupos */}
            {camp.status === "em_grupos" && camp.formato === "pontos" && camp.grupos[0] && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-emerald-400/60 font-bold">Classificação</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="pb-2 text-left font-normal text-white/30">#</th>
                      <th className="pb-2 text-left font-normal text-white/30">JOGADOR</th>
                      <th className="pb-2 w-8 text-center font-normal text-white/30">PTS</th>
                      <th className="pb-2 w-8 text-center font-normal text-white/30">V</th>
                      <th className="pb-2 w-8 text-center font-normal text-white/30">D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classificacaoGrupo(camp.grupos[0]).map((r, i) => (
                      <tr key={r.user_id} className={`border-b border-white/5 last:border-0 ${r.user_id === userId ? "bg-emerald-500/5" : ""}`}>
                        <td className="py-2 font-bold text-white/40">{i + 1}º</td>
                        <td className="py-2 font-bold text-white">{nomeDo(camp, r.user_id)}</td>
                        <td className="py-2 text-center font-black text-amber-300">{r.pts}</td>
                        <td className="py-2 text-center text-emerald-400">{r.v}</td>
                        <td className="py-2 text-center text-red-400">{r.d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Grupos com formato "grupos" */}
            {camp.status === "em_grupos" && camp.formato === "grupos" && (
              <div className="grid gap-4 sm:grid-cols-2">
                {camp.grupos.map((g, gi) => {
                  const cls = classificacaoGrupo(g);
                  return (
                    <div key={g.nome} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-amber-400/60 font-bold">
                        <Target className="size-3" /> Grupo {g.nome}
                      </p>
                      <table className="w-full text-xs mb-3">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="pb-1 text-left font-normal text-white/30">#</th>
                            <th className="pb-1 text-left font-normal text-white/30">JOGADOR</th>
                            <th className="pb-1 w-6 text-center font-normal text-white/30">PTS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cls.map((r, i) => (
                            <tr key={r.user_id} className={`border-b border-white/5 last:border-0 ${i < 2 ? "bg-emerald-500/5" : ""} ${r.user_id === userId ? "ring-1 ring-emerald-500/30" : ""}`}>
                              <td className="py-1.5 font-bold text-white/40">{i + 1}º</td>
                              <td className="py-1.5 font-bold text-white text-[11px]">{nomeDo(camp, r.user_id)}{i < 2 && <span className="ml-1 text-[9px] text-emerald-400">✓</span>}</td>
                              <td className="py-1.5 text-center font-black text-amber-300">{r.pts}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Partidas pendentes — Grupos */}
            {camp.status === "em_grupos" && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-white/30 font-bold">Próximas Partidas</p>
                <div className="space-y-2">
                  {camp.grupos.map((g, gi) => {
                    const pendentes: [string, string][] = [];
                    const ids = g.participantes;
                    const jogados = new Set<string>();
                    for (const r of g.resultados) {
                      jogados.add([r.j1_id, r.j2_id].sort().join(":"));
                    }
                    for (let i = 0; i < ids.length; i++) {
                      for (let j = i + 1; j < ids.length; j++) {
                        const ii = ids[i];
                        const jj = ids[j];
                        if (ii && jj && !jogados.has([ii, jj].sort().join(":"))) {
                          pendentes.push([ii, jj]);
                        }
                      }
                    }
                    return pendentes.map(([j1, j2], pi) => {
                      const euParticipo = j1 === userId || j2 === userId;
                      return (
                        <div key={`${g.nome}-${pi}`} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs ${euParticipo ? "border border-emerald-500/20 bg-emerald-500/5" : "bg-white/[0.02]"}`}>
                          <div>
                            <span className="font-bold text-white">{nomeDo(camp, j1)}</span>
                            <span className="mx-2 text-white/20">×</span>
                            <span className="font-bold text-white">{nomeDo(camp, j2)}</span>
                            <span className="ml-2 text-[9px] text-white/30">Grupo {g.nome}</span>
                          </div>
                          {euParticipo && (
                            <button onClick={() => onJogar("grupo", j1, j2, gi)} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-500">
                              <Zap className="size-3" /> Jogar
                            </button>
                          )}
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            )}

            {/* Eliminatórias */}
            {camp.status === "eliminatorias" && (
              <EliminatoriasView
                camp={camp}
                userId={userId}
                onJogar={onJogar}
              />
            )}
          </div>
        )}

        {/* ═══ FINALIZADO ═══ */}
        {camp.status === "finalizado" && camp.vencedor_id && (
          <div className="flex flex-col items-center py-8">
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-2xl" />
              <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30">
                <Crown className="size-10 text-amber-400" />
              </div>
            </div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-amber-400/60 font-bold">Campeão</p>
            <h2 className="mt-1 font-display text-3xl font-black text-white">
              {nomeDo(camp, camp.vencedor_id)}
            </h2>
            <p className="mt-2 text-sm text-white/40">
              {camp.vencedor_id === userId ? "Parabéns! Você é o campeão!" : "Parabéns ao campeão!"}
            </p>
            <button onClick={() => { limparCampeonato(); onBack(); }} className="mt-6 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/50 transition hover:text-white">
              Voltar ao Menu
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// ─────────────────────────── Eliminatórias ─────────────────────

function EliminatoriasView({
  camp,
  userId,
  onJogar,
}: {
  camp: CampeonatoTrilha;
  userId: string;
  onJogar: (tipo: "elim", j1: string, j2: string, elimIdx: number) => void;
}) {
  const confrontos = camp.confrontosEliminatorios;

  // Agrupar por rodada
  const rodadas = useMemo(() => {
    const map = new Map<number, { idx: number; c: ConfrontoEliminatorio }[]>();
    confrontos.forEach((c, idx) => {
      const arr = map.get(c.rodada) ?? [];
      arr.push({ idx, c });
      map.set(c.rodada, arr);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => b - a) // final primeiro
      .map(([rodada, items]) => ({
        rodada,
        nome: nomeFaseEliminatoria(items.length),
        items,
      }));
  }, [confrontos]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-amber-400/60 font-bold">
        <Crown className="size-3" /> Chave Eliminatória
      </p>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {rodadas.map((rod) => (
          <div key={rod.rodada} className="flex flex-col gap-3" style={{ minWidth: 180 }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/50">{rod.nome}</p>
            {rod.items.map(({ idx, c }) => {
              const j1 = c.j1_id ? nomeDo(camp, c.j1_id) : "BYE";
              const j2 = c.j2_id ? nomeDo(camp, c.j2_id) : "BYE";
              const j1Won = c.vencedor_id === c.j1_id;
              const j2Won = c.vencedor_id === c.j2_id;
              const pendente = !c.vencedor_id && !c.bye && c.j1_id && c.j2_id;
              const euParticipo = c.j1_id === userId || c.j2_id === userId;

              return (
                <div key={idx} className={`rounded-xl border p-3 ${euParticipo ? "border-amber-400/50 bg-amber-400/10" : "border-white/10 bg-white/[0.02]"}`}>
                  <div className={`flex items-center justify-between rounded-lg px-2 py-1 ${j1Won ? "bg-emerald-500/15" : ""}`}>
                    <span className={`text-sm font-bold ${j1Won ? "text-emerald-300" : "text-white"}`}>{j1}</span>
                    {c.vencedor_id && <span className={`font-mono text-lg font-black ${j1Won ? "text-emerald-400" : "text-white/30"}`}>✓</span>}
                  </div>
                  <div className="my-1 h-px bg-white/10" />
                  <div className={`flex items-center justify-between rounded-lg px-2 py-1 ${j2Won ? "bg-emerald-500/15" : ""}`}>
                    <span className={`text-sm font-bold ${j2Won ? "text-emerald-300" : "text-white"}`}>{j2}</span>
                    {c.vencedor_id && <span className={`font-mono text-lg font-black ${j2Won ? "text-emerald-400" : "text-white/30"}`}>✓</span>}
                  </div>
                  {pendente && euParticipo && (
                    <button onClick={() => onJogar("elim", c.j1_id!, c.j2_id!, idx)} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-500">
                      <Zap className="size-3" /> Jogar
                    </button>
                  )}
                  {c.bye && <p className="mt-1 text-center text-[10px] text-white/20">BYE</p>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
