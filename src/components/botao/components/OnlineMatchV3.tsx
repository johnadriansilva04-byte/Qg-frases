import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Coins } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useJogador } from "@/hooks/useJogador";
import { useBotaoAuth } from "../online/useBotaoAuth";
import {
  criarMesa,
  entrarMesa,
  buscarMesa,
  buscarMesasAguardando,
  linkConviteMesa,
  pagarPremioMesa,
  type MesaFutebol,
} from "@/lib/multiplayer/mesa.api";
import { MesaOnlineMatch, type ResultadoMesa } from "./MesaOnlineMatch";
import { AdminMesaPanel } from "./AdminMesaPanel";
import { useAdManager } from "@/lib/adManager";
import { OnlineLobbyLayout, type LobbyRoom, nomeAmigavel } from "@/components/online/OnlineLobbyLayout";

type Screen = "lobby-list" | "lobby-view" | "jogo" | "resultado" | "admin";

export function OnlineMatchV3({
  onBack,
  onEstadoPartida,
  mesaInicialId,
}: {
  onBack?: () => void;
  onEstadoPartida?: (emPartida: boolean) => void;
  /** Link direto (?mesa=...): entra direto nesta mesa ao carregar o perfil. */
  mesaInicialId?: string | undefined;
}) {
  const queryClient = useQueryClient();
  const { data: jogador } = useJogador();
  const { perfil, recarregar, aplicarPerfil } = useBotaoAuth();
  const { markFirstGamePlayed } = useAdManager("/botao");
  const userId = jogador?.user_id ?? perfil?.user_id ?? "";

  const [mesaId, setMesaId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("lobby-list");
  // Aposta de SOV da mesa (opcional, 0 = sem aposta) — cobrada no servidor na
  // criação/entrada e paga ao vencedor (zero-sum).
  const [apostaSoberania, setApostaSoberania] = useState<number>(0);
  // §9: data de liberação da mesa (vazio = abre na hora).
  const [dataLiberacao, setDataLiberacao] = useState<string>("");
  const [toastLink, setToastLink] = useState<string | null>(null);
  const [erroMesa, setErroMesa] = useState<string | null>(null);
  const linkDiretoTentado = useRef<string | null>(null);
  const soberaniaAtual = perfil?.pontos_soberania ?? 0;

  // Notificar estado de partida online
  useEffect(() => {
    if (onEstadoPartida) onEstadoPartida(screen === "jogo");
  }, [screen, onEstadoPartida]);

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
      botoesNomes: perfil.botoes_nomes ?? undefined,
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

  // Criar mesa — a aposta é cobrada no servidor na hora (débito do criador).
  const novaMesa = useMutation({
    mutationFn: async () => {
      if (!perfil || !userId) throw new Error("Perfil não carregado.");
      const timeId = meuTime?.id ?? "MTI";
      return criarMesa(timeId, {
        dataLiberacao: dataLiberacao ? new Date(dataLiberacao).toISOString() : null,
        apostaSov: apostaSoberania,
      });
    },
    onSuccess: (novaMesaId) => {
      setMesaId(novaMesaId);
      setScreen("jogo");
      recarregarMesas();
    },
    onError: (error) => {
      setErroMesa((error as Error)?.message ?? "Não foi possível criar a mesa.");
    },
  });

  // Entrar em mesa — a aposta é cobrada no servidor na entrada.
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
      setErroMesa((error as Error)?.message ?? "Não foi possível entrar na mesa.");
    },
  });

  // Link direto (?mesa=...): entra nesta mesa exata assim que o perfil carrega —
  // o convidado não precisa procurar a mesa na lista.
  useEffect(() => {
    if (!mesaInicialId || !perfil || !meuTime || linkDiretoTentado.current === mesaInicialId) return;
    linkDiretoTentado.current = mesaInicialId;
    void (async () => {
      const mesa = await buscarMesa(mesaInicialId).catch(() => null);
      if (!mesa) {
        setErroMesa("Mesa do link não encontrada.");
        return;
      }
      const souParticipante = mesa.jogador_1_id === userId || mesa.jogador_2_id === userId;
      if (!souParticipante && mesa.status === "aguardando") {
        entrar.mutate(mesa);
      } else {
        setMesaId(mesa.mesa_id);
        setScreen("jogo");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesaInicialId, perfil?.user_id, meuTime?.id]);

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
        }}
        onFinalizada={async (r: ResultadoMesa) => {
          // Marcar que o usuário jogou o primeiro jogo (habilita anúncios após)
          markFirstGamePlayed();

          // Aposta da mesa: o pote é pago NO SERVIDOR (zero-sum, idempotente)
          // — nunca mais um delta local solto no cliente.
          await pagarPremioMesa(mesaAtual.mesa_id).catch(() => null);
          // Recarrega o perfil para refletir SOV/ranking atualizados
          const novoPerfil = await recarregar();
          if (novoPerfil) aplicarPerfil(novoPerfil);
        }}
      />
    );
  }

  // §10: Administração da Mesa (só o criador).
  if (screen === "admin" && mesaAtual && perfil) {
    return (
      <AdminMesaPanel
        mesa={mesaAtual}
        userId={userId}
        onVoltar={() => setScreen("lobby-list")}
        onEntrar={() => setScreen("jogo")}
        onCopiarLink={() => {
          const link = linkConviteMesa(mesaAtual.mesa_id);
          void navigator.clipboard?.writeText(link).catch(() => {});
          setToastLink(link);
        }}
      />
    );
  }

  // Map mesas to shared room type
  const lobbyRooms: LobbyRoom[] = mesas.map((mesa) => {
    const souJ1 = mesa.jogador_1_id === userId;
    const bloqueada = mesa.data_liberacao != null && new Date(mesa.data_liberacao).getTime() > Date.now();
    return {
      id: mesa.mesa_id,
      status: bloqueada ? "bloqueada" : mesa.status === "em_andamento" ? "em_andamento" : mesa.status === "aguardando" ? "aguardando" : "finalizado",
      playerCount: (mesa.jogador_1_id ? 1 : 0) + (mesa.jogador_2_id ? 1 : 0),
      maxPlayers: 2,
      meta: bloqueada
        ? `Liberação: ${new Date(mesa.data_liberacao!).toLocaleString("pt-BR")}`
        : mesa.status === "em_andamento"
          ? `Placar: ${mesa.placar_j1} x ${mesa.placar_j2}`
          : (mesa.aposta_sov ?? 0) > 0 ? `Aposta: ${mesa.aposta_sov} SOV` : undefined,
      isParticipant: souJ1 || mesa.jogador_2_id === userId,
      isCreator: souJ1,
    };
  });

  // Create form JSX
  const createForm = (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[10px] text-white/40">
        <Coins className="size-3 text-amber-400" />
        <span>Saldo: <span className="font-bold text-amber-300">{soberaniaAtual} SOV</span></span>
      </div>
      <div>
        <p className="text-[9px] uppercase tracking-wider text-white/20 font-bold mb-1.5">Apostar SOV</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={soberaniaAtual}
            value={apostaSoberania}
            onChange={(e) => setApostaSoberania(Math.max(0, Math.min(soberaniaAtual, Number(e.target.value) || 0)))}
            className="w-20 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white font-bold focus:border-sky-500/40 focus:outline-none"
          />
          <div className="flex gap-1">
            {[5, 10, 25].map((v) => (
              <button key={v} onClick={() => setApostaSoberania(Math.min(soberaniaAtual, v))} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-white/40 transition hover:border-white/20 hover:text-white">
                {v}
              </button>
            ))}
            <button onClick={() => setApostaSoberania(0)} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-white/30 transition hover:text-white">Limpar</button>
          </div>
        </div>
      </div>
      <div>
        <p className="text-[9px] uppercase tracking-wider text-white/20 font-bold mb-1.5">Liberação (opcional)</p>
        <input
          type="datetime-local"
          value={dataLiberacao}
          onChange={(e) => setDataLiberacao(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white focus:border-sky-500/40 focus:outline-none"
        />
      </div>
      <button
        onClick={() => novaMesa.mutate()}
        disabled={novaMesa.isPending || !perfil}
        className="w-full rounded-lg bg-gradient-to-r from-sky-600 to-sky-500 py-2.5 text-xs font-black uppercase tracking-wider text-white transition-all hover:from-sky-500 hover:to-sky-400 active:scale-[0.98] disabled:opacity-50"
      >
        {novaMesa.isPending ? "Criando..." : "+ Criar Mesa"}
      </button>
      {!perfil && <p className="text-center text-[10px] text-red-400/80">Precisa estar logado.</p>}
    </div>
  );

  return (
    <OnlineLobbyLayout
      title="AMISTOSO ONLINE"
      subtitle="Partida 1v1 · Tempo Real"
      onBack={onBack}
      accent="emerald"
      createForm={createForm}
      rooms={lobbyRooms}
      onJoinRoom={(id) => {
        const mesa = mesas.find((m) => m.mesa_id === id);
        if (mesa) entrar.mutate(mesa);
      }}
      onReenterRoom={(id) => { setMesaId(id); setScreen("jogo"); }}
      onAdminRoom={(id) => { setMesaId(id); setScreen("admin"); }}
      onCopyRoomLink={(id) => {
        const link = linkConviteMesa(id);
        void navigator.clipboard?.writeText(link).catch(() => {});
        setToastLink(link);
      }}
      onRefresh={() => recarregarMesas()}
      toastLink={toastLink}
      onDismissToast={() => setToastLink(null)}
      error={erroMesa}
      onDismissError={() => setErroMesa(null)}
    />
  );
}
