import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, RefreshCw, Users, ArrowLeft } from "lucide-react";
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
      {toastLink && (
        <div className="mb-4 rounded-xl border border-sky-400/40 bg-sky-400/10 p-3 text-xs text-sky-200">
          Link de convite copiado: <span className="break-all font-mono">{toastLink}</span>
          <button onClick={() => setToastLink(null)} className="ml-2 underline">fechar</button>
        </div>
      )}
      {erroMesa && (
        <div className="mb-4 rounded-xl border border-rose-400/40 bg-rose-400/10 p-3 text-xs text-rose-200">
          {erroMesa}
          <button onClick={() => setErroMesa(null)} className="ml-2 underline">fechar</button>
        </div>
      )}

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
              <p className="text-sm text-muted-foreground">
                {meuTime.abreviacao} · {perfil?.nome ?? "Treinador"}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="surface mb-6 space-y-4 p-5">
        <h2 className="text-xl">Criar mesa</h2>
        <p className="text-sm text-muted-foreground">
          SOV disponível: <span className="font-semibold text-amber-300">{soberaniaAtual}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium">Apostar SOV:</label>
          <input
            type="number"
            min={0}
            max={soberaniaAtual}
            value={apostaSoberania}
            onChange={(e) =>
              setApostaSoberania(
                Math.max(0, Math.min(soberaniaAtual, Number(e.target.value) || 0)),
              )
            }
            className="w-28 rounded-md border border-border bg-transparent px-2 py-1 text-sm"
          />
          <div className="flex gap-1">
            {[5, 10, 25].map((v) => (
              <button
                key={v}
                onClick={() => setApostaSoberania(Math.min(soberaniaAtual, v))}
                className="btn-ghost px-2 py-1 text-xs"
              >
                {v}
              </button>
            ))}
            <button
              onClick={() => setApostaSoberania(0)}
              className="btn-ghost px-2 py-1 text-xs"
            >
              Limpar
            </button>
          </div>
          {apostaSoberania > 0 && (
            <span className="text-xs text-emerald-400">
              Vence: +{apostaSoberania} · Perde: -{Math.min(apostaSoberania, soberaniaAtual)}
            </span>
          )}
        </div>
        {/* §9: data de liberação (opcional) — a mesa só abre para convidados a partir dela. */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium">Liberação (opcional):</label>
          <input
            type="datetime-local"
            value={dataLiberacao}
            onChange={(e) => setDataLiberacao(e.target.value)}
            className="rounded-md border border-border bg-transparent px-2 py-1 text-sm"
          />
          {dataLiberacao && (
            <button onClick={() => setDataLiberacao("")} className="btn-ghost px-2 py-1 text-xs">
              Abrir agora
            </button>
          )}
          {dataLiberacao && (
            <span className="text-xs text-sky-300">
              Mesa bloqueada até {new Date(dataLiberacao).toLocaleString("pt-BR")}
            </span>
          )}
        </div>
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
          const bloqueada =
            mesa.data_liberacao != null && new Date(mesa.data_liberacao).getTime() > Date.now();
          return (
            <article key={mesa.id} className="surface flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg leading-tight">Mesa {mesa.mesa_id}</h3>
                <p className="text-xs text-muted-foreground">
                  {bloqueada
                    ? `Bloqueada até ${new Date(mesa.data_liberacao!).toLocaleString("pt-BR")}`
                    : mesa.status === "aguardando"
                      ? "Aguardando adversário"
                      : mesa.status === "em_andamento"
                        ? `Em jogo · ${mesa.placar_j1} x ${mesa.placar_j2}`
                        : `Finalizado · ${mesa.placar_j1} x ${mesa.placar_j2}`}
                </p>
                {/* §11: link direto de convite para a mesa. */}
                <button
                  onClick={() => {
                    const link = linkConviteMesa(mesa.mesa_id);
                    void navigator.clipboard?.writeText(link).catch(() => {});
                    setToastLink(link);
                  }}
                  className="mt-1 text-[11px] text-sky-300 underline underline-offset-2 hover:text-sky-200"
                >
                  Copiar link de convite
                </button>
              </div>
              {souParticipante ? (
                <div className="flex flex-col items-end gap-1.5">
                  <button
                    onClick={() => {
                      setMesaId(mesa.mesa_id);
                      setScreen("jogo");
                    }}
                    className="btn-primary"
                  >
                    Reentrar
                  </button>
                  {souJogador1 && (
                    <button
                      onClick={() => {
                        setMesaId(mesa.mesa_id);
                        setScreen("admin");
                      }}
                      className="btn-ghost text-xs"
                      data-testid={`admin-${mesa.mesa_id}`}
                    >
                      Administrar mesa
                    </button>
                  )}
                </div>
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
