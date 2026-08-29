import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Users, Trophy, Play, Plus, RefreshCw, Link2, Crown, Swords } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { TrilhaOnlineGame } from "./TrilhaOnlineGame";

interface Mesa {
  mesa_id: string;
  dificuldade: string;
  jogador_1_id: string;
  criado_em: string;
  nome_sala?: string | null;
  formato?: "normal" | "eliminacao" | null;
}

type Formato = "normal" | "eliminacao";

interface TrilhaOnlineLobbyProps {
  onBack?: () => void;
  /** Link direto (?mesaTrilha=...): entra direto na mesa especificada. */
  mesaInicial?: string;
}

export function TrilhaOnlineLobby({ onBack, mesaInicial }: TrilhaOnlineLobbyProps = {}) {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [criandoMesa, setCriandoMesa] = useState(false);
  const [entrandoMesa, setEntrandoMesa] = useState<string | null>(null);
  const [nomeSala, setNomeSala] = useState("");
  const [formato, setFormato] = useState<Formato>("normal");
  const [mesaAtual, setMesaAtual] = useState<string | null>(null);
  const [supabaseNotConfigured, setSupabaseNotConfigured] = useState(false);
  const [toastLink, setToastLink] = useState<string | null>(null);
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

  // LINK DIRETO (?mesaTrilha=ID): entra direto na mesa especificada.
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
        if (error.code === 'PGRST202' || error.code === '404') {
          setMesas([]);
          setLoading(false);
          return;
        }
        throw error;
      }
      setMesas((Array.isArray(data) ? data as unknown as Mesa[] : []));
    } catch (error) {
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
      if (error) {
        throw error;
      }
      const mesaId = data as string;
      const link = linkDaMesa(mesaId);
      void navigator.clipboard?.writeText(link).catch(() => {});
      setToastLink(link);
      setMesaAtual(mesaId);
      // Recarrega a lista após criar (como no futebol online)
      setTimeout(() => void carregarMesas(), 500);
    } catch (error) {
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
    } catch (error) {
      console.error("Erro ao entrar na mesa:", error);
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
    if (minutos < 60) return `${minutos}m atrás`;
    const horas = Math.floor(minutos / 60);
    return `${horas}h atrás`;
  };

  if (mesaAtual) {
    return <TrilhaOnlineGame mesaId={mesaAtual} onBack={() => setMesaAtual(null)} />;
  }

  if (supabaseNotConfigured) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="texto-marca text-2xl mb-4">Modo Online Indisponível</h2>
          <p className="text-muted-foreground mb-6">
            O modo online precisa do Supabase configurado. Por enquanto, jogue no modo carreira local!
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Voltar
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#080c16] via-[#0b1220] to-[#080c16]">
      <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-black tracking-wide text-white">
              TRILHA <span className="text-purple-400 text-[10px] font-bold ml-1.5 bg-purple-500/10 px-1.5 py-0.5 rounded">ONLINE</span>
            </h2>
            <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Mesas 1×1</p>
          </div>
        </div>
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-2 border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Menu</span>
          </button>
        ) : null}
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-black text-white tracking-tight">Lobby de Trilha</h1>
            <p className="text-sm text-white/40">
              Escolha uma mesa disponível ou crie a sua própria.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void carregarMesas()}
              className="flex items-center gap-2 border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97]"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Criar sala — simples: nome + formato, sem dificuldade. */}
        <section className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="mb-3 font-display text-lg">Criar Nova Mesa</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-white/70">Nome da sala (opcional)</label>
              <input
                value={nomeSala}
                onChange={(e) => setNomeSala(e.target.value)}
                placeholder="Ex.: Trilha com os amigos"
                maxLength={40}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white/80 placeholder-white/25"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/70">Formato</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFormato("normal")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    formato === "normal"
                      ? "bg-emerald-500 text-white"
                      : "bg-white/[0.04] border border-white/10 text-white/50 hover:bg-white/[0.08]"
                  }`}
                >
                  <Swords className="h-4 w-4" /> Mesa (1 x 1)
                </button>
                <button
                  onClick={() => setFormato("eliminacao")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    formato === "eliminacao"
                      ? "bg-amber-500 text-slate-950"
                      : "bg-white/[0.04] border border-white/10 text-white/50 hover:bg-white/[0.08]"
                  }`}
                >
                  <Crown className="h-4 w-4" /> Campeonato eliminatório
                </button>
              </div>
              <p className="mt-2 text-xs text-white/30">
                Eliminatório: campeonato formato de eliminação — quem perder sai.
              </p>
            </div>
            <button
              onClick={() => void criarMesa()}
              disabled={criandoMesa}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{criandoMesa ? "Criando..." : "Criar Mesa"}</span>
            </button>              <p className="text-xs text-white/30">
              Ao criar, o link da sala é copiado automaticamente — compartilhe com seu adversário.
            </p>
          </div>
        </section>

        {/* Mesas disponíveis */}
        <section>
          <h2 className="mb-3 font-display text-lg font-black text-white tracking-tight">Mesas Disponíveis</h2>
          {loading ? (
            <div className="py-8 text-center text-white/30">
              <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin" />
              <p>Carregando mesas...</p>
            </div>
          ) : mesas.length === 0 ? (
            <div className="py-8 text-center text-white/30">
              <Users className="mx-auto mb-2 h-12 w-12 opacity-30" />
              <p>Nenhuma mesa aberta no momento.</p>
              <p className="text-sm text-white/20">Crie a sua e compartilhe o link!</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {mesas.map((mesa) => {
                const ehElim = (mesa.formato ?? "normal") === "eliminacao";
                return (
                  <div
                    key={mesa.mesa_id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition-colors ${ehElim ? "border-amber-500/30 bg-amber-500/[0.04] hover:border-amber-500/50" : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2.5 ${ehElim ? "bg-amber-500/20" : "bg-primary/20"}`}>
                        {ehElim ? (
                          <Crown className="h-5 w-5 text-amber-400" />
                        ) : (
                          <Trophy className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white/90">
                          {mesa.nome_sala?.trim() || `Mesa de ${mesa.jogador_1_id.slice(0, 8)}`}
                        </h3>
                        <p className="text-sm text-white/35">
                          {ehElim ? "Campeonato eliminatório" : "Mesa 1×1"} ·{" "}
                          ID: {mesa.jogador_1_id.slice(0, 8)} · {formatarTempo(mesa.criado_em)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copiarLink(mesa.mesa_id)}
                        className="flex items-center gap-1 rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-xs text-white/50 hover:bg-white/[0.08] hover:text-white/70"
                        data-testid="copiar-link-trilha"
                      >
                        <Link2 className="h-3.5 w-3.5" /> Link
                      </button>
                      <button
                        onClick={() => void entrarMesa(mesa.mesa_id)}
                        disabled={entrandoMesa === mesa.mesa_id}
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Play className="h-4 w-4" />
                        <span>{entrandoMesa === mesa.mesa_id ? "Entrando..." : "Entrar"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {toastLink && (
          <p className="mt-4 break-all rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3 text-xs text-emerald-400/80">
            Link copiado: {toastLink}
          </p>
        )}
      </main>
    </div>
  );
}