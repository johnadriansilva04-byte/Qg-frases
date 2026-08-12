import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { GradeTimes } from "@/components/botao/GradeTimes";
import { Partida, type ResultadoPartida } from "@/components/botao/Partida";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useJogador } from "@/hooks/useJogador";
import { getLendarios, salvarResultado, type TimeBotao } from "@/lib/botao/api";

export const Route = createFileRoute("/_authenticated/amistoso")({
  head: () => ({
    meta: [
      { title: "Amistoso Lendário — Mesa Soberana" },
      {
        name: "description",
        content:
          "Monte confrontos épicos de futebol de botão escolhendo livremente as duas confrarias do catálogo e o formato da partida.",
      },
      { property: "og:title", content: "Amistoso Lendário — Mesa Soberana" },
      { property: "og:description", content: "Escolha os dois lados e dispute um amistoso lendário de botão." },
    ],
  }),
  component: Amistoso,
});

const JOGADAS = [10, 20, 30];
const TEMPOS = [15, 30, 45];

function Amistoso() {
  const queryClient = useQueryClient();
  const { data: jogador } = useJogador();
  const { data: times = [], isLoading } = useQuery({ queryKey: ["botao_times"], queryFn: getLendarios });

  const [etapa, setEtapa] = useState<"selecao" | "config" | "jogo" | "fim">("selecao");
  const [timeA, setTimeA] = useState<TimeBotao | null>(null);
  const [timeB, setTimeB] = useState<TimeBotao | null>(null);
  const [jogadas, setJogadas] = useState(20);
  const [tempo, setTempo] = useState(30);
  const [adversario, setAdversario] = useState<"ia" | "local">("ia");
  const [resultado, setResultado] = useState<ResultadoPartida | null>(null);
  const [filtro, setFiltro] = useState<string>("Todos");

  const paises = useMemo(() => ["Todos", ...new Set(times.map((t) => t.pais))], [times]);
  const visiveis = useMemo(
    () => (filtro === "Todos" ? times : times.filter((t) => t.pais === filtro)),
    [times, filtro],
  );

  const salvar = useMutation({
    mutationFn: async (r: ResultadoPartida) => {
      if (!jogador) return;
      const res = r.golsA > r.golsB ? "v" : r.golsA === r.golsB ? "e" : "d";
      await salvarResultado({
        usuario: jogador,
        resultado: res,
        pontos: res === "v" ? 10 : res === "e" ? 4 : 1,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["botao_usuarios", "atual"] }),
    onError: () => toast.error("Não foi possível salvar o resultado."),
  });

  const escolher = (time: TimeBotao) => {
    if (!timeA) setTimeA(time);
    else if (!timeB && time.id !== timeA.id) setTimeB(time);
  };

  if (etapa === "jogo" && timeA && timeB) {
    return (
      <main className="px-4 py-6">
        <Partida
          timeA={timeA}
          timeB={timeB}
          jogadas={jogadas}
          tempoTurno={tempo}
          iaLado={adversario === "ia" ? "B" : null}
          onFim={(r) => {
            setResultado(r);
            setEtapa("fim");
            salvar.mutate(r);
          }}
          onSair={() => setEtapa("config")}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <Cabecalho titulo="Amistoso Lendário" subtitulo="Escolha as confrarias e configure o confronto." />

      {etapa === "fim" && resultado && timeA && timeB && (
        <section className="surface mb-6 p-5">
          <h2 className="text-2xl">
            {resultado.golsA > resultado.golsB
              ? `${timeA.nome} venceu!`
              : resultado.golsA < resultado.golsB
                ? `${timeB.nome} venceu!`
                : "Empate no feltro"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Placar final {resultado.golsA} x {resultado.golsB}. Resultado somado ao seu perfil.
          </p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => setEtapa("jogo")}>Revanche</Button>
            <Button variant="secondary" onClick={() => setEtapa("selecao")}>
              Trocar times
            </Button>
          </div>
        </section>
      )}

      {etapa === "selecao" && (
        <>
          <div className="surface mb-4 flex flex-wrap items-center gap-3 p-4">
            <Escolhido rotulo="Lado A" time={timeA} onLimpar={() => setTimeA(null)} />
            <span className="font-display text-xl text-muted-foreground">x</span>
            <Escolhido rotulo="Lado B" time={timeB} onLimpar={() => setTimeB(null)} />
            <Button className="ml-auto" disabled={!timeA || !timeB} onClick={() => setEtapa("config")}>
              Configurar
            </Button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {paises.map((pais) => (
              <button
                key={pais}
                onClick={() => setFiltro(pais)}
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wide transition-colors ${
                  filtro === pais ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                }`}
              >
                {pais}
              </button>
            ))}
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando catálogo…</p>
          ) : (
            <GradeTimes
              times={visiveis}
              selecionado={timeB?.id ?? timeA?.id}
              desabilitado={timeA && !timeB ? timeA.id : null}
              onSelecionar={escolher}
            />
          )}
        </>
      )}

      {etapa === "config" && timeA && timeB && (
        <section className="surface space-y-5 p-5">
          <h2 className="text-2xl">
            {timeA.nome} <span className="text-muted-foreground">x</span> {timeB.nome}
          </h2>

          <div className="space-y-2">
            <Label>Jogadas da partida</Label>
            <Opcoes valores={JOGADAS} valor={jogadas} onEscolher={setJogadas} sufixo=" jogadas" />
          </div>

          <div className="space-y-2">
            <Label>Tempo por turno</Label>
            <Opcoes valores={TEMPOS} valor={tempo} onEscolher={setTempo} sufixo="s" />
          </div>

          <div className="space-y-2">
            <Label>Adversário</Label>
            <div className="flex flex-wrap gap-2">
              <Chip ativo={adversario === "ia"} onClick={() => setAdversario("ia")}>
                Máquina
              </Chip>
              <Chip ativo={adversario === "local"} onClick={() => setAdversario("local")}>
                Dois jogadores no mesmo aparelho
              </Chip>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setEtapa("jogo")}>Entrar em campo</Button>
            <Button variant="secondary" onClick={() => setEtapa("selecao")}>
              Voltar
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}

export function Cabecalho({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <header className="mb-6">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link to="/">
          <ArrowLeft className="mr-1 h-4 w-4" /> Portal
        </Link>
      </Button>
      <h1 className="text-3xl sm:text-4xl">{titulo}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitulo}</p>
    </header>
  );
}

function Escolhido({
  rotulo,
  time,
  onLimpar,
}: {
  rotulo: string;
  time: TimeBotao | null;
  onLimpar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onLimpar}
      className="flex min-w-[9rem] items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-left"
    >
      {time ? (
        <>
          <span className="h-5 w-5 rounded-full border border-border" style={{ background: time.cores[0] }} />
          <span className="min-w-0">
            <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">{rotulo}</span>
            <span className="block truncate font-display">{time.nome}</span>
          </span>
        </>
      ) : (
        <span className="text-sm text-muted-foreground">{rotulo}: escolha um time</span>
      )}
    </button>
  );
}

function Opcoes({
  valores,
  valor,
  onEscolher,
  sufixo,
}: {
  valores: number[];
  valor: number;
  onEscolher: (v: number) => void;
  sufixo: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {valores.map((v) => (
        <Chip key={v} ativo={valor === v} onClick={() => onEscolher(v)}>
          {v}
          {sufixo}
        </Chip>
      ))}
    </div>
  );
}

export function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
        ativo ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}
