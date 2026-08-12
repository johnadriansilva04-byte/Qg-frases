import { useCallback, useEffect, useState } from "react";
import { Campo, type FimDaJogada } from "@/components/botao/Campo";
import { Button } from "@/components/ui/button";
import type { Lado } from "@/lib/botao/engine";
import type { TimeBotao } from "@/lib/botao/api";

export type ResultadoPartida = { golsA: number; golsB: number };

type Props = {
  timeA: TimeBotao;
  timeB: TimeBotao;
  jogadas: number;
  tempoTurno: number;
  /** Lado controlado pela IA; null = dois jogadores no mesmo aparelho. */
  iaLado?: Lado | null;
  dificuldadeIA?: number;
  retro?: boolean;
  onFim: (r: ResultadoPartida) => void;
  onSair: () => void;
};

const TOQUES_POR_TURNO = 3;

export function Partida({
  timeA,
  timeB,
  jogadas,
  tempoTurno,
  iaLado = "B",
  dificuldadeIA = 0.7,
  retro = false,
  onFim,
  onSair,
}: Props) {
  const [ladoAtivo, setLadoAtivo] = useState<Lado>("A");
  const [toques, setToques] = useState(TOQUES_POR_TURNO);
  const [restantes, setRestantes] = useState(jogadas);
  const [golsA, setGolsA] = useState(0);
  const [golsB, setGolsB] = useState(0);
  const [relogio, setRelogio] = useState(tempoTurno);
  const [resetKey, setResetKey] = useState(0);
  const [encerrada, setEncerrada] = useState(false);
  const [aviso, setAviso] = useState("Arraste um botão para trás e solte para dar o toque.");

  const trocarTurno = useCallback(() => {
    setLadoAtivo((l) => (l === "A" ? "B" : "A"));
    setToques(TOQUES_POR_TURNO);
    setRelogio(tempoTurno);
  }, [tempoTurno]);

  // Cronômetro do turno
  useEffect(() => {
    if (encerrada) return;
    const id = window.setInterval(() => {
      setRelogio((t) => {
        if (t <= 1) {
          setAviso("Tempo esgotado — a vez passou para o adversário.");
          setRestantes((r) => Math.max(0, r - 1));
          trocarTurno();
          return tempoTurno;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [encerrada, tempoTurno, trocarTurno]);

  // Fim de partida
  useEffect(() => {
    if (restantes > 0 || encerrada) return;
    setEncerrada(true);
    onFim({ golsA, golsB });
  }, [restantes, encerrada, golsA, golsB, onFim]);

  const aoFinalizarJogada = useCallback(
    ({ golDe, tocouBola }: FimDaJogada) => {
      if (encerrada) return;
      setRestantes((r) => Math.max(0, r - 1));

      if (golDe) {
        if (golDe === "A") setGolsA((g) => g + 1);
        else setGolsB((g) => g + 1);
        setAviso(`GOL de ${golDe === "A" ? timeA.nome : timeB.nome}!`);
        setResetKey((k) => k + 1);
        setLadoAtivo(golDe === "A" ? "B" : "A");
        setToques(TOQUES_POR_TURNO);
        setRelogio(tempoTurno);
        return;
      }

      if (tocouBola && toques > 1) {
        setToques((t) => t - 1);
        setRelogio(tempoTurno);
        setAviso(`Tocou na bola — você tem ${toques - 1} toque(s) restante(s).`);
        return;
      }

      setAviso(tocouBola ? "Toques esgotados. Vez do adversário." : "Não tocou na bola. Vez do adversário.");
      trocarTurno();
    },
    [encerrada, timeA.nome, timeB.nome, tempoTurno, toques, trocarTurno],
  );

  const ladosControlados: Lado[] = iaLado ? (["A", "B"] as Lado[]).filter((l) => l !== iaLado) : ["A", "B"];
  const nomeAtivo = ladoAtivo === "A" ? timeA.nome : timeB.nome;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="surface flex items-center justify-between gap-3 p-4">
        <TimePlacar time={timeA} gols={golsA} ativo={ladoAtivo === "A"} />
        <div className="text-center">
          <p className="font-display text-3xl leading-none text-primary">
            {golsA} <span className="text-muted-foreground">x</span> {golsB}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {restantes} jogada(s) • {relogio}s
          </p>
        </div>
        <TimePlacar time={timeB} gols={golsB} ativo={ladoAtivo === "B"} alinharDireita />
      </div>

      <Campo
        coresA={timeA.cores}
        coresB={timeB.cores}
        ladoAtivo={ladoAtivo}
        ladosControlados={ladosControlados}
        iaLado={iaLado}
        dificuldadeIA={dificuldadeIA}
        bloqueado={encerrada}
        retro={retro}
        resetKey={resetKey}
        onFimDaJogada={aoFinalizarJogada}
      />

      <div className="surface space-y-1 p-4">
        <p className="font-display text-lg">
          Vez de <span className="text-primary">{nomeAtivo}</span> · {toques} toque(s)
        </p>
        <p className="text-sm text-muted-foreground">{aviso}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setResetKey((k) => k + 1)}>
          Recolocar peças
        </Button>
        <Button variant="ghost" onClick={onSair}>
          Sair da mesa
        </Button>
      </div>
    </div>
  );
}

function TimePlacar({
  time,
  gols,
  ativo,
  alinharDireita = false,
}: {
  time: TimeBotao;
  gols: number;
  ativo: boolean;
  alinharDireita?: boolean;
}) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${alinharDireita ? "flex-row-reverse text-right" : ""}`}>
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${ativo ? "border-primary glow" : "border-border"}`}
        style={{ background: time.cores[0] }}
      >
        <span className="h-3 w-3 rounded-full" style={{ background: time.cores[1] }} />
      </span>
      <div className="min-w-0">
        <p className="truncate font-display text-lg leading-tight">{time.abreviacao}</p>
        <p className="truncate text-xs text-muted-foreground">
          {time.nome} · {gols}
        </p>
      </div>
    </div>
  );
}
