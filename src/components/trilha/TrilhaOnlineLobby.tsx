import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Users,
  Trophy,
  Play,
  Plus,
  RefreshCw,
  Link2,
  Crown,
  Swords,
  Target,
  Bot,
  Zap,
  Wifi,
  WifiOff,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { TrilhaOnlineGame } from "./TrilhaOnlineGame";
import { TrilhaChampionship } from "./TrilhaChampionship";

interface Mesa {
  mesa_id: string;
  dificuldade: string;
  jogador_1_id: string;
  criado_em: string;
  nome_sala?: string | null;
  formato?: "normal" | "eliminacao" | null;
  status?: string | null;
  jogador_2_id?: string | null;
}

type Formato = "normal" | "eliminacao";

interface TrilhaOnlineLobbyProps {
  onBack?: (() => void) | undefined;
  mesaInicial?: string | undefined;
}

export function TrilhaOnlineLobby({ onBack, mesaInicial }: TrilhaOnlineLobbyProps = {}) {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [criandoMesa, setCriandoMesa] = useState(false);
  const [entrandoMesa, setEntrandoMesa] = useState<string | null>(null);
  const [nomeSala, setNomeSala] = useState("");
  const [formato, setFormato] = useState<Formato>("normal");
  const [comRobot, setComRobot] = useState(false);
  const [mesaAtual, setMesaAtual] = useState<string | null>(null);
  const [supabaseNotConfigured, setSupabaseNotConfigured] = useState(false);
  const [toastLink, setToastLink] = useState<string | null>(null);
  const [showChampionship, setShowChampionship] = useState(false);
  const [activeTab, setActiveTab] = useState<"pvp" | "salas">("pvp");
  const entradaLinkTentada = useRef<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSupabaseNotConfigured(true);
      setLoading(false);
      return;
    }

    void carregarMesas();

    const channel = supabase
      .channel("mesas_trilha_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mesas_trilha",
        },
        () => {
          void carregarMesas();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!mesaInicial || entradaLinkTentada.current === mesaInicial) return;
    entradaLinkTentada.current = mesaInicial;
    void (async () => {
      try {
        await entrarMesa(mesaInicial);
      } catch (e) {
        console.error("Erro ao entrar na mesa pelo link:", e);
      }
    })();
  }, [mesaInicial]);

  const carregarMesas = async () => {
    try {
      const { data, error } = await supabase.rpc("listar_mesas_trilha_disponiveis", {
        p_dificuldade: null,
      });
      if (error) {
        if (error.code === "PGRST202" || error.code === "404") {
          setMesas([]);
          setLoading(false);
          return;
        }
        throw error;
      }
      setMesas(Array.isArray(data) ? (data as unknown as Mesa[]) : []);
    } catch {
      setMesas([]);
    } finally {
      setLoading(false);
    }
  };

  const linkDaMesa = (mesaId: string) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/cidadela?mesaTrilha=${encodeURIComponent(mesaId)}`;
  };

  const criarMesa = async () => {
    setCriandoMesa(true);
    try {
      const { data, error } = await supabase.rpc("criar_mesa_trilha", {
        p_nome: nomeSala.trim() || null,
        p_formato: formato,
        p_dificuldade: "recruta",
      });
      if (error) throw error;
      const mesaId = data as string;
      const link = linkDaMesa(mesaId);
      void navigator.clipboard?.writeText(link).catch(() => {});
      setToastLink(link);
      setMesaAtual(mesaId);
      setTimeout(() => void carregarMesas(), 500);
    } catch {
      alert("Erro ao criar mesa. Tente novamente.");
    } finally {
      setCriandoMesa(false);
    }
  };

  const entrarMesa = async (mesaId: string) => {
    setEntrandoMesa(mesaId);
    try {
      const { data, error } = await supabase.rpc("entrar_mesa_trilha", {
        p_mesa_id: mesaId,
      });
      if (error) throw error;
      setMesaAtual(mesaId);
    } catch (e) {
      console.error("Erro ao entrar na mesa:", e);
      alert("Erro ao entrar na mesa. Tente novamente.");
    } finally {
      setEntrandoMesa(null);
    }
  };

  const copiarLink = (mesaId: string) => {
    const link = linkDaMesa(mesaId);
    void navigator.clipboard?.writeText(link).catch(() => {});
    setToastLink(link);
  };

  const formatarTempo = (data: string) => {
    const diff = Date.now() - new Date(data).getTime();
    const minutos = Math.floor(diff / 60000);
    if (minutos < 1) return "agora";
    if (minutos < 60) return `${minutos}m`;
    const horas = Math.floor(minutos / 60);
    return `${horas}h`;
  };

  if (showChampionship) {
    return <TrilhaChampionship onBack={() => setShowChampionship(false)} />;
  }

  if (mesaAtual) {
    return <TrilhaOnlineGame mesaId={mesaAtual} onBack={() => setMesaAtual(null)} />;
  }

  if (supabaseNotConfigured) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-purple-500/10">
            <WifiOff className="size-8 text-purple-400" />
          </div>
          <h2 className="font-display text-2xl font-black text-foreground mb-2">Modo Online Indisponível</h2>
          <p className="text-muted-foreground mb-6">
            Conecte o Supabase para jogar online. Enquanto isso, jogue no modo carreira local!
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Voltar
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060910] via-[#0a1020] to-[#060910]">
      {/* ═══ HERO HEADER ═══ */}
      <header className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-1/4 h-[200px] w-[300px] rounded-full bg-purple-500/8 blur-[100px]" />
          <div className="absolute -top-10 right-1/3 h-[150px] w-[200px] rounded-full bg-emerald-500/6 blur-[80px]" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20">
                <Target className="size-5 text-purple-400" />
              </div>
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight text-white">
                  TRILHA{" "}
                  <span className="bg-gradient-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent">
                    ONLINE
                  </span>
                </h1>
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/30">
                  <Wifi className="size-3 text-emerald-400" />
                  PvP · 1×1 · Tempo Real
                </p>
              </div>
            </div>
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 transition-all hover:bg-white/[0.08] hover:text-white active:scale-[0.97]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Menu</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* ═══ MODE CARDS ═══ */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* PvP Card */}
          <button
            onClick={() => setActiveTab("pvp")}
            className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 ${
              activeTab === "pvp"
                ? "border-purple-500/40 bg-gradient-to-br from-purple-500/10 to-purple-900/10 shadow-lg shadow-purple-500/5"
                : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
            }`}
          >
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="absolute -top-10 -right-10 h-[120px] w-[120px] rounded-full bg-purple-500/10 blur-[60px]" />
            </div>
            <div className="relative">
              <div className="mb-3 flex items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
                  activeTab === "pvp" ? "bg-purple-500/20" : "bg-purple-500/10"
                }`}>
                  <Swords className="size-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-display text-base font-black text-white">PvP 1×1</p>
                  <p className="text-[10px] text-white/30">Mesa rápida contra outro jogador</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-white/25">
                <span className="flex items-center gap-1"><Zap className="size-3" /> Tempo real</span>
                <span className="flex items-center gap-1"><Bot className="size-3" /> Com robot</span>
              </div>
            </div>
          </button>

          {/* Championship Card */}
          <button
            onClick={() => setShowChampionship(true)}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-left transition-all duration-300 hover:border-amber-500/30 hover:bg-amber-500/[0.04] hover:shadow-lg hover:shadow-amber-500/5"
          >
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="absolute -top-10 -right-10 h-[120px] w-[120px] rounded-full bg-amber-500/10 blur-[60px]" />
            </div>
            <div className="relative">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10">
                  <Trophy className="size-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-display text-base font-black text-white">Campeonato</p>
                  <p className="text-[10px] text-white/30">Pontos Corridos ou Eliminatórias</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-white/25">
                <span className="flex items-center gap-1"><Crown className="size-3" /> Bracket</span>
                <span className="flex items-center gap-1"><Target className="size-3" /> Grupos</span>
              </div>
            </div>
          </button>
        </div>

        {/* ═══ PvP SECTION ═══ */}
        {activeTab === "pvp" && (
          <div className="space-y-5">
            {/* Create Room */}
            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Plus className="size-4 text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-display text-sm font-black text-white">Criar Mesa PvP</h2>
                  <p className="text-[10px] text-white/25">Configure e convide um adversário</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-white/30 font-bold">
                    Nome da Sala
                  </label>
                  <input
                    value={nomeSala}
                    onChange={(e) => setNomeSala(e.target.value)}
                    placeholder="Ex.: Partida Ranked"
                    maxLength={40}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 transition-colors focus:border-purple-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-white/30 font-bold">
                    Formato
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFormato("normal")}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                        formato === "normal"
                          ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                          : "border-white/10 bg-white/[0.02] text-white/40 hover:border-white/20 hover:text-white/60"
                      }`}
                    >
                      <Swords className="size-3.5" /> Mesa 1×1
                    </button>
                    <button
                      onClick={() => setFormato("eliminacao")}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                        formato === "eliminacao"
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                          : "border-white/10 bg-white/[0.02] text-white/40 hover:border-white/20 hover:text-white/60"
                      }`}
                    >
                      <Crown className="size-3.5" /> Eliminação
                    </button>
                  </div>
                </div>

                {/* Robot Fill Toggle */}
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex size-8 items-center justify-center rounded-lg transition-colors ${
                      comRobot ? "bg-amber-500/15" : "bg-white/5"
                    }`}>
                      <Bot className={`size-4 transition-colors ${comRobot ? "text-amber-400" : "text-white/30"}`} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Jogar contra Robot</p>
                      <p className="text-[10px] text-white/25">IA local enquanto espera adversário</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setComRobot(!comRobot)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      comRobot ? "bg-amber-500" : "bg-white/10"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                        comRobot ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                <button
                  onClick={() => void criarMesa()}
                  disabled={criandoMesa}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 px-5 py-3 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-purple-900/20 transition-all hover:from-purple-500 hover:to-purple-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  {criandoMesa ? "Criando..." : "Criar Mesa"}
                </button>
                <p className="text-center text-[10px] text-white/20">
                  O link será copiado automaticamente para compartilhar
                </p>
              </div>
            </section>

            {/* Available Rooms */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-sm font-black text-white tracking-tight">Mesas Abertas</h2>
                  {mesas.length > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                      {mesas.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => void carregarMesas()}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/30 transition-all hover:bg-white/[0.08] hover:text-white/60"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                  Atualizar
                </button>
              </div>

              {loading ? (
                <div className="py-10 text-center">
                  <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-purple-400/50" />
                  <p className="text-xs text-white/25">Buscando mesas...</p>
                </div>
              ) : mesas.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <Users className="size-6 text-white/15" />
                  </div>
                  <p className="text-sm font-bold text-white/30">Nenhuma mesa aberta</p>
                  <p className="mt-1 text-xs text-white/15">Crie uma mesa e convide jogadores!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {mesas.map((mesa) => {
                    const ehElim = (mesa.formato ?? "normal") === "eliminacao";
                    const temJogador2 = !!mesa.jogador_2_id;
                    return (
                      <div
                        key={mesa.mesa_id}
                        className={`group flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 transition-all ${
                          temJogador2
                            ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                            : ehElim
                              ? "border-amber-500/20 bg-amber-500/[0.03] hover:border-amber-500/40"
                              : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg p-2 ${
                            temJogador2 ? "bg-emerald-500/15" : ehElim ? "bg-amber-500/15" : "bg-purple-500/15"
                          }`}>
                            {temJogador2 ? (
                              <Wifi className="h-4 w-4 text-emerald-400" />
                            ) : ehElim ? (
                              <Crown className="h-4 w-4 text-amber-400" />
                            ) : (
                              <Target className="h-4 w-4 text-purple-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white/90">
                              {mesa.nome_sala?.trim() || `Mesa de ${mesa.jogador_1_id.slice(0, 6)}`}
                            </h3>
                            <p className="text-[10px] text-white/30">
                              {ehElim ? "Eliminatório" : "PvP 1×1"} · {formatarTempo(mesa.criado_em)}
                              {temJogador2 && <span className="ml-1 text-emerald-400/60">· Em jogo</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copiarLink(mesa.mesa_id)}
                            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-bold text-white/30 transition-all hover:bg-white/[0.08] hover:text-white/60"
                            data-testid="copiar-link-trilha"
                          >
                            <Link2 className="h-3 w-3" /> Copiar
                          </button>
                          <button
                            onClick={() => void entrarMesa(mesa.mesa_id)}
                            disabled={entrandoMesa === mesa.mesa_id || temJogador2}
                            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 px-3.5 py-1.5 text-[11px] font-bold text-white transition-all hover:from-purple-500 hover:to-purple-400 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Play className="h-3 w-3" />
                            {entrandoMesa === mesa.mesa_id ? "..." : temJogador2 ? "Cheia" : "Entrar"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Toast */}
        {toastLink && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/90 px-4 py-3 text-xs text-emerald-300 shadow-2xl backdrop-blur-sm">
              <Link2 className="size-3.5 shrink-0" />
              <span className="max-w-[250px] truncate">{toastLink}</span>
              <button
                onClick={() => setToastLink(null)}
                className="ml-2 text-emerald-400/60 hover:text-emerald-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
