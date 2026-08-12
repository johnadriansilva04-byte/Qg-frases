import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, Trophy } from "lucide-react";
import { Cabecalho } from "@/routes/_authenticated/amistoso";
import { Partida, type ResultadoPartida } from "@/components/botao/Partida";
import { Button } from "@/components/ui/button";
import { useJogador } from "@/hooks/useJogador";
import {
  ETAPAS_RETRO,
  getDesafiosRetro,
  getLendarios,
  lerProgresso,
  salvarResultado,
  type EtapaRetro,
  type TimeBotao,
} from "@/lib/botao/api";

export const Route = createFileRoute("/_authenticated/retro")({
  head: () => ({
    meta: [
      { title: "Seminário Retro Challenge — Mesa Soberana" },
      {
        name: "description",
        content:
          "Desafio histórico de futebol de botão em cinco etapas, de 1940 ao século XVIII: Rendukuoso, REN Negro e Sanetzinganshen.",
      },
      { property: "og:title", content: "Seminário Retro Challenge — Mesa Soberana" },
      {
        property: "og:description",
        content: "Avance pelas eras clássicas do futebol de botão e acumule troféus no seu perfil.",
      },
    ],
  }),
  component: Retro,
});

function Retro() {
  const queryClient = useQueryClient();
  const { data: jogador } = useJogador();
  const [etapaAtiva, setEtapaAtiva] = useState<EtapaRetro | null>(null);
  const [adversario, setAdversario] = useState<TimeBotao | null>(null);
  const [resultado, setResultado] = useState<ResultadoPartida | null>(null);

  const { data: catalogo = [] } = useQuery({ queryKey: ["botao_times"], queryFn: getLendarios });

  const progresso = useMemo(() => lerProgresso(jogador?.progresso_caminpanha), [jogador]);
  const meuTime = useMemo(
    () => catalogo.find((t) => t.usuario_id === jogador?.user_id) ?? catalogo[0] ?? null,
    [catalogo, jogador],
  );

  const desbloqueadas = ETAPAS_RETRO.filter((e) => progresso.trophies.includes(e.id)).length;

  const iniciar = useMutation({
    mutationFn: async (etapa: EtapaRetro) => {
      const times = await getDesafiosRetro(etapa);
      if (!times.length) throw new Error("Nenhum time desta era encontrado.");
      return times[Math.floor(Math.random() * times.length)]!;
    },
    onSuccess: (time, etapa) => {
      setAdversario(time);
      setEtapaAtiva(etapa);
      setResultado(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao abrir a etapa."),
  });

  const concluir = useMutation({
    mutationFn: async ({ r, etapa }: { r: ResultadoPartida; etapa: EtapaRetro }) => {
      if (!jogador) return;
      const venceu = r.golsA > r.golsB;
      const empatou = r.golsA === r.golsB;
      await salvarResultado({
        usuario: jogador,
        resultado: venceu ? "v" : empatou ? "e" : "d",
        pontos: venceu ? 25 : empatou ? 8 : 2,
        trofeu: venceu ? etapa.id : undefined,
        titulo: venceu ? (etapa.dificuldade >= 0.8 ? "lenda" : etapa.dificuldade >= 0.65 ? "profissional" : "amador") : undefined,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["botao_usuarios", "atual"] }),
    onError: () => toast.error("Não foi possível registrar o seminário."),
  });

  if (etapaAtiva && adversario && meuTime && !resultado) {
    return (
      <main className="retro-grain min-h-screen px-4 py-6">
        <p className="mx-auto mb-3 max-w-2xl text-center text-xs uppercase tracking-[0.3em] text-retro">
          {etapaAtiva.era} · {etapaAtiva.ambiente}
        </p>
        <Partida
          timeA={meuTime}
          timeB={adversario}
          jogadas={20}
          tempoTurno={25}
          iaLado="B"
          dificuldadeIA={etapaAtiva.dificuldade}
          retro
          onFim={(r) => {
            setResultado(r);
            concluir.mutate({ r, etapa: etapaAtiva });
          }}
          onSair={() => setEtapaAtiva(null)}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <Cabecalho
        titulo="Seminário / Retro Challenge"
        subtitulo="De 1940 ao século XVIII — cinco etapas, feltro envelhecido e troféus."
      />

      <section className="surface mb-6 flex flex-wrap items-center gap-4 p-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Pontos de soberania</p>
          <p className="font-display text-2xl text-primary">{jogador?.pontos_soberania ?? 0}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Etapas conquistadas</p>
          <p className="font-display text-2xl">
            {desbloqueadas}/{ETAPAS_RETRO.length}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Títulos</p>
          <p className="font-display text-2xl">
            {progresso.titles.amador + progresso.titles.profissional + progresso.titles.lenda}
          </p>
        </div>
      </section>

      {resultado && etapaAtiva && (
        <section className="surface retro-grain mb-6 p-5">
          <h2 className="text-2xl">
            {resultado.golsA > resultado.golsB ? "Seminário cumprido!" : "Etapa não cumprida"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {etapaAtiva.titulo} — placar {resultado.golsA} x {resultado.golsB}.
          </p>
          <Button className="mt-4" variant="secondary" onClick={() => { setEtapaAtiva(null); setResultado(null); }}>
            Voltar às etapas
          </Button>
        </section>
      )}

      <div className="space-y-3">
        {ETAPAS_RETRO.map((etapa, i) => {
          const conquistada = progresso.trophies.includes(etapa.id);
          const anterior = ETAPAS_RETRO[i - 1];
          const bloqueada = i > 0 && !!anterior && !progresso.trophies.includes(anterior.id);
          return (
            <article
              key={etapa.id}
              className={`surface retro-grain flex flex-wrap items-center gap-4 p-5 ${bloqueada ? "opacity-55" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.25em] text-retro">Era {etapa.era}</p>
                <h2 className="text-xl leading-tight">{etapa.titulo}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{etapa.ambiente}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Confrarias: {etapa.paises.join(" · ")} · dificuldade {Math.round(etapa.dificuldade * 100)}%
                </p>
              </div>
              {conquistada && <Trophy className="h-5 w-5 text-primary" />}
              <Button
                disabled={bloqueada || iniciar.isPending || !meuTime}
                onClick={() => iniciar.mutate(etapa)}
                variant={conquistada ? "secondary" : "default"}
              >
                {bloqueada ? <Lock className="mr-1 h-4 w-4" /> : null}
                {bloqueada ? "Bloqueada" : conquistada ? "Rejogar" : "Disputar etapa"}
              </Button>
            </article>
          );
        })}
      </div>
    </main>
  );
}
