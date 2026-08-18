import { useState, useEffect } from "react";
import { ArrowLeft, Users, Clock, Trophy, Play, Plus, RefreshCw } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { TrilhaOnlineGame } from "./TrilhaOnlineGame";

interface Mesa {
  mesa_id: string;
  dificuldade: string;
  jogador_1_nome: string;
  criado_em: string;
}

interface TrilhaOnlineLobbyProps {
  onBack?: () => void;
}

export function TrilhaOnlineLobby({ onBack }: TrilhaOnlineLobbyProps = {}) {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [criandoMesa, setCriandoMesa] = useState(false);
  const [entrandoMesa, setEntrandoMesa] = useState<string | null>(null);
  const [dificuldadeSelecionada, setDificuldadeSelecionada] = useState<string>("recruta");
  const [mesaAtual, setMesaAtual] = useState<string | null>(null);
  const [supabaseNotConfigured, setSupabaseNotConfigured] = useState(false);

  const DIFICULDADES = [
    { id: "recruta", label: "Recruta", description: "Ideal para iniciantes" },
    { id: "sargento", label: "Sargento", description: "Desafio intermediário" },
    { id: "general", label: "General", description: "Para mestres da trilha" },
  ];

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSupabaseNotConfigured(true);
      setLoading(false);
      return;
    }

    carregarMesas();

    // Assinar mudanças em tempo real
    const channel = supabase
      .channel('mesas_trilha_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mesas_trilha'
        },
        () => {
          carregarMesas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dificuldadeSelecionada]);

  const carregarMesas = async () => {
    try {
      const { data, error } = await supabase.rpc('listar_mesas_trilha_disponiveis', {
        p_dificuldade: dificuldadeSelecionada === "todas" ? null : dificuldadeSelecionada
      });

      if (error) throw error;
      setMesas((Array.isArray(data) ? data as unknown as Mesa[] : []));
    } catch (error) {
      console.error('Erro ao carregar mesas:', error);
    } finally {
      setLoading(false);
    }
  };

  const criarMesa = async () => {
    setCriandoMesa(true);
    try {
      const { data, error } = await supabase.rpc('criar_mesa_trilha', {
        p_dificuldade: dificuldadeSelecionada
      });

      if (error) throw error;
      setMesaAtual(data);
    } catch (error) {
      console.error('Erro ao criar mesa:', error);
      alert('Erro ao criar mesa. Tente novamente.');
    } finally {
      setCriandoMesa(false);
    }
  };

  const entrarMesa = async (mesaId: string) => {
    setEntrandoMesa(mesaId);
    try {
      const { data, error } = await supabase.rpc('entrar_mesa_trilha', {
        p_mesa_id: mesaId
      });

      if (error) throw error;
      setMesaAtual(mesaId);
    } catch (error) {
      console.error('Erro ao entrar na mesa:', error);
      alert('Erro ao entrar na mesa. Tente novamente.');
    } finally {
      setEntrandoMesa(null);
    }
  };

  const formatarTempo = (data: string) => {
    const diff = Date.now() - new Date(data).getTime();
    const minutos = Math.floor(diff / 60000);
    if (minutos < 1) return "Agora mesmo";
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
            <p className="text-xs text-muted-foreground">Jogue contra outros jogadores</p>
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

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Lobby de Trilha</h1>
            <p className="text-sm text-muted-foreground">
              Escolha uma mesa disponível ou crie a sua própria
            </p>
          </div>
          <button
            onClick={carregarMesas}
            className="flex items-center gap-2 bg-secondary/70 text-foreground hover:bg-secondary px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Atualizar</span>
          </button>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Filtrar por Dificuldade</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDificuldadeSelecionada("todas")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dificuldadeSelecionada === "todas"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/70 text-foreground hover:bg-secondary"
              }`}
            >
              Todas
            </button>
            {DIFICULDADES.map((d) => (
              <button
                key={d.id}
                onClick={() => setDificuldadeSelecionada(d.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dificuldadeSelecionada === d.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/70 text-foreground hover:bg-secondary"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Criar Nova Mesa</h2>
          <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Dificuldade</label>
              <select
                value={dificuldadeSelecionada}
                onChange={(e) => setDificuldadeSelecionada(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border"
              >
                {DIFICULDADES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label} - {d.description}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={criarMesa}
              disabled={criandoMesa}
              className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              <span>{criandoMesa ? "Criando..." : "Criar Mesa"}</span>
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Mesas Disponíveis</h2>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p>Carregando mesas...</p>
            </div>
          ) : mesas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma mesa disponível no momento.</p>
              <p className="text-sm">Crie a sua própria mesa para jogar!</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {mesas.map((mesa) => {
                const dificuldadeInfo = DIFICULDADES.find((d) => d.id === mesa.dificuldade);
                return (
                  <div
                    key={mesa.mesa_id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/20 rounded-lg">
                        <Trophy className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{mesa.jogador_1_nome}</h3>
                        <p className="text-sm text-muted-foreground">
                          {dificuldadeInfo?.label} · {formatarTempo(mesa.criado_em)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => entrarMesa(mesa.mesa_id)}
                      disabled={entrandoMesa === mesa.mesa_id}
                      className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Play className="h-4 w-4" />
                      <span>{entrandoMesa === mesa.mesa_id ? "Entrando..." : "Entrar"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
