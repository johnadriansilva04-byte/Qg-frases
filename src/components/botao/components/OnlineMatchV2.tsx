import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Users, ArrowLeft, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GradeTimes } from "./GradeTimes";
import { Campo, type FimDaJogada } from "./Campo";
import { supabase } from "@/integrations/supabase/client";
import { useJogador } from "@/hooks/useJogador";
import { useBotaoAuth } from "../online/useBotaoAuth";
import {
  criarBloco,
  criarLobby,
  encerrarLobby,
  entrarNoBloco,
  finalizarBloco,
  getBlocos,
  getLendarios,
  getLobbiesAtivos,
  registrarGolBloco,
  registrarJogadaBloco,
  sairDoBloco,
  salvarResultado,
  type Bloco,
  type Lobby,
  type TimeBotao,
} from "@/lib/botao/api";

type Screen = "lobby-list" | "lobby-view" | "jogo" | "resultado";

const FORMATOS = [
  { valor: "melhor_de_3", rotulo: "Melhor de 3", jogadas: 12 },
  { valor: "melhor_de_6", rotulo: "Melhor de 6", jogadas: 20 },
  { valor: "melhor_de_9", rotulo: "Melhor de 9", jogadas: 30 },
];

export function OnlineMatchV2({ onBack }: { onBack?: () => void }) {
  const queryClient = useQueryClient();
  const { data: jogador } = useJogador();
  const { perfil } = useBotaoAuth();
  
  const [lobbyAtivo, setLobbyAtivo] = useState<Lobby | null>(null);
  const [nomeSala, setNomeSala] = useState("");
  const [formato, setFormato] = useState("melhor_de_3");
  const [timeEscolhido, setTimeEscolhido] = useState<TimeBotao | null>(null);
  const [blocoId, setBlocoId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("lobby-list");

  const session = jogador?.user_id ?? perfil?.user_id ?? "";

  const { data: times = [] } = useQuery({ queryKey: ["botao_times"], queryFn: getLendarios });
  const { data: lobbies = [], refetch: recarregarLobbies } = useQuery({
    queryKey: ["botao_lobbies"],
    queryFn: getLobbiesAtivos,
    refetchInterval: 8000,
  });
  const { data: blocos = [] } = useQuery({
    queryKey: ["botao_blocos", lobbyAtivo?.id],
    queryFn: () => getBlocos(lobbyAtivo!.id),
    enabled: !!lobbyAtivo,
    refetchInterval: 4000,
  });

  const meuTime = useMemo(
    () => timeEscolhido ?? times.find((t) => t.usuario_id === session) ?? times[0] ?? null,
    [timeEscolhido, times, session],
  );

  // Sincronização em tempo real dos blocos da sala aberta
  useEffect(() => {
    if (!lobbyAtivo) return;
    const canal = supabase
      .channel(`blocos-${lobbyAtivo.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "botao_blocos", filter: `lobby_id=eq.${lobbyAtivo.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["botao_blocos", lobbyAtivo.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [lobbyAtivo, queryClient]);

  const novaSala = useMutation({
    mutationFn: async () => {
      if (!jogador) throw new Error("Perfil não carregado.");
      return criarLobby({
        nome: nomeSala.trim() || `Mesa de ${jogador.nome}`,
        criadorSession: jogador.user_id,
        criadorNome: jogador.nome,
        formato,
      });
    },
    onSuccess: (lobby) => {
      setNomeSala("");
      setLobbyAtivo(lobby);
      setScreen("lobby-view");
      recarregarLobbies();
    },
  });

  const novoBloco = useMutation({
    mutationFn: async () => {
      if (!jogador || !lobbyAtivo || !meuTime) throw new Error("Escolha um time primeiro.");
      const cfg = FORMATOS.find((f) => f.valor === lobbyAtivo.formato) ?? FORMATOS[0]!;
      return criarBloco({
        lobbyId: lobbyAtivo.id,
        session: jogador.user_id,
        nome: jogador.nome,
        timeId: meuTime.id,
        jogadas: cfg.jogadas,
        tempoTurno: 30,
      });
    },
    onSuccess: (bloco) => {
      setBlocoId(bloco.id);
      queryClient.invalidateQueries({ queryKey: ["botao_blocos", lobbyAtivo?.id] });
    },
  });

  const entrar = useMutation({
    mutationFn: async (bloco: Bloco) => {
      if (!jogador || !meuTime) throw new Error("Escolha um time primeiro.");
      return entrarNoBloco({
        blocoId: bloco.id,
        session: jogador.user_id,
        nome: jogador.nome,
        timeId: meuTime.id,
      });
    },
    onSuccess: (bloco) => {
      setBlocoId(bloco.id);
      queryClient.invalidateQueries({ queryKey: ["botao_blocos", lobbyAtivo?.id] });
    },
  });

  const blocoAtual = blocos.find((b) => b.id === blocoId) ?? null;

  if (screen === "jogo" && blocoAtual && jogador) {
    return (
      <main className="px-4 py-6">
        <MesaOnline
          bloco={blocoAtual}
          times={times}
          souJogador1={blocoAtual.jogador1_session === jogador.user_id}
          onSair={() => {
            setBlocoId(null);
            setScreen("lobby-view");
          }}
          onVoltarLobby={() => setScreen("lobby-view")}
        />
      </main>
    );
  }

  if (screen === "lobby-view" && lobbyAtivo) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setScreen("lobby-list")} className="btn-ghost">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-display text-2xl">{lobbyAtivo.nome}</h2>
        </div>

        <section className="surface mb-6 space-y-4 p-5">
          <h2 className="text-xl">Seu time nesta sessão</h2>
          <GradeTimes
            times={times.slice(0, 12)}
            selecionado={meuTime?.id ?? null}
            onSelecionar={setTimeEscolhido}
          />
        </section>

        <section className="space-y-3">
          <div className="surface flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl leading-tight">{lobbyAtivo.nome}</h2>
              <p className="text-xs text-muted-foreground">
                {FORMATOS.find((f) => f.valor === lobbyAtivo.formato)?.rotulo} · blocos {blocos.length}/
                {lobbyAtivo.max_blocos}
              </p>
            </div>
            <button
              onClick={() => novoBloco.mutate()}
              disabled={novoBloco.isPending || blocos.length >= lobbyAtivo.max_blocos}
              className="btn-primary"
            >
              <Plus className="mr-1 h-4 w-4" /> Abrir bloco
            </button>
            {lobbyAtivo.criador_session === session && (
              <button
                className="btn-ghost"
                onClick={async () => {
                  await encerrarLobby(lobbyAtivo.id);
                  setLobbyAtivo(null);
                  setScreen("lobby-list");
                  recarregarLobbies();
                }}
              >
                Encerrar sala
              </button>
            )}
            <button className="btn-secondary" onClick={() => setScreen("lobby-list")}>
              Voltar
            </button>
          </div>

          {blocos.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum bloco aberto nesta sala ainda.</p>
          )}

          {blocos.map((bloco) => {
            const t1 = times.find((t) => t.id === bloco.jogador1_time);
            const t2 = times.find((t) => t.id === bloco.jogador2_time);
            const meuBloco = bloco.jogador1_session === session || bloco.jogador2_session === session;
            return (
              <article key={bloco.id} className="surface flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-lg leading-tight">
                    {bloco.jogador1_nome} ({t1?.abreviacao ?? "—"}) x{" "}
                    {bloco.jogador2_nome ?? "aguardando"} ({t2?.abreviacao ?? "—"})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {bloco.status === "aguardando"
                      ? "Aguardando adversário"
                      : bloco.status === "em_jogo"
                        ? `Em jogo · ${bloco.jogador1_gols} x ${bloco.jogador2_gols} · ${bloco.jogadas_restantes} jogadas`
                        : `Finalizado · ${bloco.jogador1_gols} x ${bloco.jogador2_gols}`}
                  </p>
                </div>
                {meuBloco ? (
                  <>
                    <button onClick={() => { setBlocoId(bloco.id); setScreen("jogo"); }} className="btn-primary">
                      Abrir mesa
                    </button>
                    {bloco.status === "aguardando" && bloco.jogador1_session === session && (
                      <button
                        className="btn-ghost"
                        onClick={async () => {
                          await sairDoBloco(bloco.id);
                          queryClient.invalidateQueries({ queryKey: ["botao_blocos", lobbyAtivo.id] });
                        }}
                      >
                        Cancelar
                      </button>
                    )}
                  </>
                ) : bloco.status === "aguardando" ? (
                  <button onClick={() => entrar.mutate(bloco)} disabled={entrar.isPending} className="btn-primary">
                    Assumir o outro lado
                  </button>
                ) : (
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Mesa ocupada</span>
                )}
              </article>
            );
          })}
        </section>
      </main>
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
        <h2 className="font-display text-2xl">Mesas Online</h2>
      </div>

      <section className="surface mb-6 space-y-4 p-5">
        <h2 className="text-xl">Seu time nesta sessão</h2>
        <GradeTimes
          times={times.slice(0, 12)}
          selecionado={meuTime?.id ?? null}
          onSelecionar={setTimeEscolhido}
        />
      </section>

      {!lobbyAtivo ? (
        <>
          <section className="surface mb-6 space-y-4 p-5">
            <h2 className="text-xl">Criar sala</h2>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Nome da sala</label>
              <input
                value={nomeSala}
                onChange={(e) => setNomeSala(e.target.value)}
                placeholder={`Mesa de ${jogador?.nome ?? "jogador"}`}
                className="w-full px-3 py-2 rounded border bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Formato</label>
              <div className="flex flex-wrap gap-2">
                {FORMATOS.map((f) => (
                  <button
                    key={f.valor}
                    onClick={() => setFormato(f.valor)}
                    className={`px-3 py-1 rounded border ${
                      formato === f.valor ? "bg-primary text-primary-foreground" : "bg-background"
                    }`}
                  >
                    {f.rotulo}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => novaSala.mutate()} disabled={novaSala.isPending} className="btn-primary">
              <Plus className="mr-1 h-4 w-4" /> Abrir sala
            </button>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl">Salas ativas</h2>
              <button className="btn-ghost text-sm" onClick={() => recarregarLobbies()}>
                <RefreshCw className="mr-1 h-4 w-4" /> Atualizar
              </button>
            </div>
            {lobbies.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma sala ativa. Seja o primeiro a abrir.</p>
            )}
            {lobbies.map((lobby) => (
              <article key={lobby.id} className="surface flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg leading-tight">{lobby.nome}</h3>
                  <p className="text-xs text-muted-foreground">
                    {lobby.criador_nome} · {FORMATOS.find((f) => f.valor === lobby.formato)?.rotulo ?? lobby.formato}{" "}
                    · até {lobby.max_blocos} blocos
                  </p>
                </div>
                <button onClick={() => { setLobbyAtivo(lobby); setScreen("lobby-view"); }} className="btn-primary">
                  <Users className="mr-1 h-4 w-4" /> Entrar
                </button>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </main>
  );
}

/** Mesa online: cada jogada parte da formação inicial e o placar vive no banco. */
function MesaOnline({
  bloco,
  times,
  souJogador1,
  onSair,
  onVoltarLobby,
}: {
  bloco: Bloco;
  times: TimeBotao[];
  souJogador1: boolean;
  onSair: () => void;
  onVoltarLobby: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: jogador } = useJogador();
  const [salvo, setSalvo] = useState(false);

  const timeA = times.find((t) => t.id === bloco.jogador1_time) ?? times[0]!;
  const timeB = times.find((t) => t.id === (bloco.jogador2_time ?? "")) ?? times[1] ?? timeA;
  const meuLado = souJogador1 ? "A" : "B";
  const ladoAtivo = bloco.turno === "jogador1" ? "A" : "B";
  const minhaVez = ladoAtivo === meuLado && bloco.status === "em_jogo";

  // Registra resultado no perfil quando a mesa termina
  useEffect(() => {
    if (bloco.status !== "finalizado" || salvo || !jogador) return;
    const meu = souJogador1 ? "jogador1" : "jogador2";
    const res = bloco.vencedor === "empate" ? "e" : bloco.vencedor === meu ? "v" : "d";
    setSalvo(true);
    salvarResultado({
      usuario: jogador,
      resultado: res,
      pontos: res === "v" ? 20 : res === "e" ? 6 : 2,
    })
      .then(() => queryClient.invalidateQueries({ queryKey: ["botao_usuarios", "atual"] }))
      .catch(() => console.error("Não foi possível salvar o resultado."));
  }, [bloco.status, bloco.vencedor, salvo, jogador, souJogador1, queryClient]);

  const aoFinalizar = async ({ golDe }: FimDaJogada) => {
    try {
      if (golDe) {
        await registrarGolBloco(bloco.id, golDe === "A" ? "jogador1" : "jogador2");
      }
      await registrarJogadaBloco(bloco.id);
      queryClient.invalidateQueries({ queryKey: ["botao_blocos", bloco.lobby_id] });
    } catch {
      console.error("Falha ao enviar a jogada.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="surface flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate font-display text-lg leading-tight">
            {bloco.jogador1_nome} · {timeA.abreviacao}
          </p>
          <p className="text-xs text-muted-foreground">{souJogador1 ? "você" : "adversário"}</p>
        </div>
        <div className="text-center">
          <p className="font-display text-3xl leading-none text-primary">
            {bloco.jogador1_gols} <span className="text-muted-foreground">x</span> {bloco.jogador2_gols}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{bloco.jogadas_restantes} jogada(s)</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="truncate font-display text-lg leading-tight">
            {bloco.jogador2_nome ?? "aguardando"} · {timeB.abreviacao}
          </p>
          <p className="text-xs text-muted-foreground">{souJogador1 ? "adversário" : "você"}</p>
        </div>
      </div>

      <Campo
        coresA={timeA.cores}
        coresB={timeB.cores}
        ladoAtivo={ladoAtivo}
        ladosControlados={[meuLado]}
        bloqueado={!minhaVez}
        resetKey={bloco.jogadas_restantes}
        onFimDaJogada={aoFinalizar}
      />

      <div className="surface space-y-1 p-4">
        <p className="font-display text-lg">
          {bloco.status === "aguardando"
            ? "Aguardando um adversário assumir o outro lado…"
            : bloco.status === "finalizado"
              ? bloco.vencedor === "empate"
                ? "Mesa encerrada em empate"
                : `Vitória de ${bloco.vencedor === "jogador1" ? bloco.jogador1_nome : bloco.jogador2_nome}`
              : minhaVez
                ? "Sua vez — arraste um botão para trás e solte"
                : "Vez do adversário…"}
        </p>
        <p className="text-sm text-muted-foreground">
          Online, cada jogada parte da formação inicial e o placar é sincronizado em tempo real.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {bloco.status === "em_jogo" && (
          <button className="btn-secondary" onClick={() => finalizarBloco(bloco.id, "empate")}>
            Encerrar mesa
          </button>
        )}
        <button className="btn-ghost" onClick={onVoltarLobby}>
          Voltar à sala
        </button>
      </div>
    </div>
  );
}
