import { useState, useEffect } from "react";
import { ArrowLeft, Users, Trophy, Play, Plus, RefreshCw, Link2, Crown, Swords } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { TrilhaOnlineGame } from "./TrilhaOnlineGame";

interface Mesa {
  mesa_id: string;
  dificuldade: string;
  jogador_1_nome: string;
  criado_em: string;
  nome_sala?: string | null;
  formato?: "normal" | "eliminacao" | null;
}

type Formato = "normal" | "eliminacao";

interface TrilhaOnlineLobbyProps {
  onBack?: () => void;
}

export function TrilhaOnlineLobby({ onBack }: TrilhaOnlineLobbyProps = {}) {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [criandoMesa, setCriandoMesa] = useState(false);
  const [entrandoMesa, setEntrandoMesa] = useState<string | null>(null);
  const [nomeSala, setNomeSala] = useState("");
  const [formato, setFormato] = useState<Formato>("normal");
  const [mesaAtual, setMesaAtual] = useState<string | null>(null);
  const [supabaseNotConfigured, setSupabaseNotConfigured] = useState(false);
  const [toastLink, setToastLink] = useState<string | null>(null);

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

  const carregarMesas = async () => {
    try {
      const { data, error } = await supabase.rpc("listar_mesas_trilha_disponiveis", {
        p_dificuldade: null,
      });
      if (error) throw error;
      setMesas((Array.isArray(data) ? data as unknown as Mesa[] : []));
    } catch (error) {
      console.error("Erro ao carregar mesas:", error);
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
      });
      if (error) {
        const legacy = await supabase.rpc("criar_mesa_trilha", { p_dificuldade: "recruta" });
        if (legacy.error) throw legacy.error;
        setMesaAtual(legacy.data as string);
        return;
      }
      const mesaId = data as string;
      const link = linkDaMesa(mesaId);
      void navigator.clipboard?.writeText(link).catch(() => {});
      setToastLink(link);
      setMesaAtual(mesaId);
    } catch (error) {
      console.error("Erro ao criar mesa:", error);
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
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="texto-marca text-lg sm:text-xl">TRILHA ONLINE</h2>
            <p className="text-xs text-muted-foreground">Mesas e campeonatos eliminatórios</p>
          </div>
        </div>
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar à Cidadela</span>
          </button>
        ) : null}
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl">Lobby de Trilha</h1>
            <p className="text-sm text-muted-foreground">
              Escolha uma mesa disponível ou crie a sua própria.
            </p>
          </div>
          <button
            onClick={() => void carregarMesas()}
            className="flex items-center gap-2 bg-secondary/70 text-foreground hover:bg-secondary px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Atualizar</span>
          </button>
        </div>

        {/* Criar sala — simples: nome + formato, sem dificuldade. */}
        <section className="mb-6 rounded-xl border border-slate-800/70 bg-gradient-to-br from-slate-900/40 to-slate-950/60 p-5">
          <h2 className="mb-3 font-display text-lg">Criar Nova Mesa</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Nome da sala (opcional)</label>
              <input
                value={nomeSala}
                onChange={(e) => setNomeSala(e.target.value)}
                placeholder="Ex.: Trilha com os amigos"
                maxLength={40}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Formato</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFormato("normal")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    formato === "normal"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/60 hover:bg-secondary"
                  }`}
                >
                  <Swords className="h-4 w-4" /> Mesa (1 x 1)
                </button>
                <button
                  onClick={() => setFormato("eliminacao")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    formato === "eliminacao"
                      ? "bg-amber-500 text-slate-950"
                      : "bg-secondary/60 hover:bg-secondary"
                  }`}
                >
                  <Crown className="h-4 w-4" /> Campeonato eliminatório
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Eliminatório: campeonato formato de eliminação — quem perder sai.
              </p>
            </div>
            <button
              onClick={() => void criarMesa()}
              disabled={criandoMesa}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{criandoMesa ? "Criando..." : "Criar Mesa"}</span>
            </button>
            <p className="text-xs text-muted-foreground">
              Ao criar, o link da sala é copiado automaticamente — compartilhe com seu adversário.
            </p>
          </div>
        </section>

        {/* Mesas disponíveis */}
        <section>
          <h2 className="mb-3 font-display text-lg">Mesas Disponíveis</h2>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin" />
              <p>Carregando mesas...</p>
            </div>
          ) : mesas.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="mx-auto mb-2 h-12 w-12 opacity-50" />
              <p>Nenhuma mesa aberta no momento.</p>
              <p className="text-sm">Crie a sua e compartilhe o link!</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {mesas.map((mesa) => {
                const ehElim = (mesa.formato ?? "normal") === "eliminacao";
                return (
                  <div
                    key={mesa.mesa_id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition-colors ${ehElim ? "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/70" : "border-slate-800 bg-muted/40 hover:border-primary/50"}`}
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
                        <h3 className="font-semibold">
                          {mesa.nome_sala?.trim() || mesa.jogador_1_nome}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {ehElim ? "Campeonato eliminatório" : "Mesa 1×1"} ·{" "}
                          {mesa.jogador_1_nome} · {formatarTempo(mesa.criado_em)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copiarLink(mesa.mesa_id)}
                        className="flex items-center gap-1 rounded-lg bg-secondary/60 px-3 py-2 text-xs hover:bg-secondary"
                        data-testid="copiar-link-trilha"
                      >
                        <Link2 className="h-3.5 w-3.5" /> Link
                      </button>
                      <button
                        onClick={() => void entrarMesa(mesa.mesa_id)}
                        disabled={entrandoMesa === mesa.mesa_id}
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
          <p className="mt-4 break-all rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs">
            Link copiado: {toastLink}
          </p>
        )}
      </main>
    </div>
  );
}