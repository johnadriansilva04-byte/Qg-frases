import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Users, ArrowLeft } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useJogador } from "@/hooks/useJogador";
import { useBotaoAuth } from "../online/useBotaoAuth";
import {
  criarMesa,
  entrarMesa,
  buscarMesa,
  buscarMesasAguardando,
  type MesaFutebol,
} from "@/lib/multiplayer/mesa.api";
import { MesaOnlineMatch, type ResultadoMesa } from "./MesaOnlineMatch";

type Screen = "lobby-list" | "jogo" | "resultado";

const STORAGE_KEYS = {
  SCREEN: "botao_online_v3_screen",
  MESA_ID: "botao_online_v3_mesa_id",
};

export function OnlineMatchV3({
  onBack,
  onEstadoPartida,
}: {
  onBack?: () => void;
  onEstadoPartida?: (emPartida: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data: jogador } = useJogador();
  const { perfil, recarregar, aplicarPerfil } = useBotaoAuth();
  const userId = jogador?.user_id ?? perfil?.user_id ?? "";

  const [mesaId, setMesaId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEYS.MESA_ID),
  );
  const [screen, setScreen] = useState<Screen>(
    () => (localStorage.getItem(STORAGE_KEYS.SCREEN) as Screen) || "lobby-list",
  );

  // Notificar estado de partida online
  useEffect(() => {
    if (onEstadoPartida) onEstadoPartida(screen === "jogo");
  }, [screen, onEstadoPartida]);

  // Persistir estado
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCREEN, screen);
  }, [screen]);

  useEffect(() => {
    if (mesaId) {
      localStorage.setItem(STORAGE_KEYS.MESA_ID, mesaId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.MESA_ID);
    }
  }, [mesaId]);

  // Restaurar sessão ao montar
  useEffect(() => {
    const savedMesaId = localStorage.getItem(STORAGE_KEYS.MESA_ID);
    const savedScreen = localStorage.getItem(STORAGE_KEYS.SCREEN) as Screen;

    if (savedScreen && savedScreen !== "lobby-list" && savedMesaId) {
      buscarMesa(savedMesaId).then((mesa) => {
        if (mesa) {
          // Verificar se o usuário é participante da mesa
          const isParticipant = mesa.jogador_1_id === userId || mesa.jogador_2_id === userId;
          if (isParticipant) {
            setMesaId(savedMesaId);
            setScreen(savedScreen);
          } else {
            limparPersistencia();
            setScreen("lobby-list");
          }
        } else {
          limparPersistencia();
          setScreen("lobby-list");
        }
      });
    }
  }, [userId]);

  const limparPersistencia = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  }, []);

  // Time personalizado
  const meuTime = useMemo(() => {
    if (!perfil) return null;
    return {
      id: `custom-${perfil.user_id}`,
      nome: perfil.time_personalizado,
      abreviacao: perfil.abreviacao_time,
      cores: perfil.cores,
      pais: "Brasil",
      liga: "Personalizado",
      is_personalizado: true,
      usuario_id: perfil.user_id,
    };
  }, [perfil]);

  const { data: mesas = [], refetch: recarregarMesas } = useQuery({
    queryKey: ["mesas_futebol"],
    queryFn: buscarMesasAguardando,
    refetchInterval: 5000,
  });

  const { data: mesaAtual } = useQuery({
    queryKey: ["mesa_atual", mesaId],
    queryFn: () => (mesaId ? buscarMesa(mesaId) : null),
    enabled: !!mesaId,
    refetchInterval: screen === "jogo" ? false : 3000, // Desativar polling durante partida
  });

  // Criar mesa
  const novaMesa = useMutation({
    mutationFn: async () => {
      if (!perfil || !userId) throw new Error("Perfil não carregado.");
      const timeId = meuTime?.id ?? "MTI";
      return criarMesa(timeId);
    },
    onSuccess: (novaMesaId) => {
      setMesaId(novaMesaId);
      setScreen("jogo");
      recarregarMesas();
    },
    onError: (error) => {
      // Silenciar erro
    },
  });

  // Entrar em mesa
  const entrar = useMutation({
    mutationFn: async (mesa: MesaFutebol) => {
      if (!perfil || !meuTime) throw new Error("Perfil não carregado.");
      return entrarMesa(mesa.mesa_id, meuTime.id);
    },
    onSuccess: (mesa) => {
      setMesaId(mesa.mesa_id);
      setScreen("jogo");
      recarregarMesas();
    },
    onError: (error) => {
      // Silenciar erro
    },
  });

  if (screen === "jogo" && mesaAtual && perfil && meuTime) {
    return (
      <MesaOnlineMatch
        mesa={mesaAtual}
        perfil={perfil}
        userId={userId}
        meuTime={meuTime}
        stageLabel="Amistoso Online"
        onSair={() => {
          setMesaId(null);
          setScreen("lobby-list");
          limparPersistencia();
        }}
        onFinalizada={async (_r: ResultadoMesa) => {
          // Recarrega o perfil para refletir soberania/ranking atualizados
          const novoPerfil = await recarregar();
          if (novoPerfil) aplicarPerfil(novoPerfil);
        }}
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <button onClick={onBack} className="btn-ghost">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h2 className="font-display text-2xl">Mesas Online v3</h2>
      </div>

      <section className="surface mb-6 space-y-4 p-5">
        <h2 className="text-xl">Seu time</h2>
        {meuTime && (
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <span
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border"
              style={{ background: meuTime.cores[0] }}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: meuTime.cores[1] }}
              >
                <span className="h-4 w-4 rounded-full" style={{ background: meuTime.cores[2] }} />
              </span>
            </span>
            <div>
              <p className="font-display text-lg">{meuTime.nome}</p>
              <p className="text-sm text-muted-foreground">{meuTime.abreviacao}</p>
            </div>
          </div>
        )}
      </section>

      <section className="surface mb-6 space-y-4 p-5">
        <h2 className="text-xl">Criar mesa</h2>
        <button
          onClick={() => novaMesa.mutate()}
          disabled={novaMesa.isPending || !perfil}
          className="btn-primary"
        >
          <Plus className="mr-1 h-4 w-4" /> {novaMesa.isPending ? "Criando..." : "Abrir mesa"}
        </button>
        {!perfil && (
          <p className="text-sm text-red-500">Você precisa estar logado para criar uma mesa.</p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Mesas disponíveis</h2>
          <button className="btn-ghost text-sm" onClick={() => recarregarMesas()}>
            <RefreshCw className="mr-1 h-4 w-4" /> Atualizar
          </button>
        </div>
        {mesas.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma mesa disponível. Seja o primeiro a abrir.
          </p>
        )}
        {mesas.map((mesa) => {
          const souJogador1 = mesa.jogador_1_id === userId;
          const souParticipante = souJogador1 || mesa.jogador_2_id === userId;
          return (
            <article key={mesa.id} className="surface flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg leading-tight">Mesa {mesa.mesa_id}</h3>
                <p className="text-xs text-muted-foreground">
                  {mesa.status === "aguardando"
                    ? "Aguardando adversário"
                    : mesa.status === "em_andamento"
                      ? `Em jogo · ${mesa.placar_j1} x ${mesa.placar_j2}`
                      : `Finalizado · ${mesa.placar_j1} x ${mesa.placar_j2}`}
                </p>
              </div>
              {souParticipante ? (
                <button
                  onClick={() => {
                    setMesaId(mesa.mesa_id);
                    setScreen("jogo");
                  }}
                  className="btn-primary"
                >
                  Reentrar
                </button>
              ) : mesa.status === "aguardando" ? (
                <button
                  onClick={() => entrar.mutate(mesa)}
                  disabled={entrar.isPending}
                  className="btn-primary"
                >
                  <Users className="mr-1 h-4 w-4" /> Entrar
                </button>
              ) : (
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Mesa ocupada
                </span>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
