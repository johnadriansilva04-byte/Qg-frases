import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  CircleHelp,
  FileText,
  FlaskConical,
  Landmark,
  Quote,
  ScrollText,
  Theater,
} from "lucide-react";
import {
  CAPITULO_DESFECHO,
  CLASSIFICACAO_LABEL,
  type ClassificacaoFonte,
  type HistoriaState,
  type PosicaoFinal,
} from "./types";
import { dicaInvestigacao, pergaminhosColetados } from "./historiaEngine";
import { referenciaPorId } from "./referencias";

type Props = {
  historia: HistoriaState;
  /** Chamado quando o jogador registra sua posição final (capítulo do desfecho). */
  onRegistrarPosicao?: ((posicao: PosicaoFinal) => void) | undefined;
};

const ESTILO_CLASSIFICACAO: Record<
  ClassificacaoFonte,
  { cor: string; Icone: typeof Landmark }
> = {
  HISTORICAL_FACT: { cor: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300", Icone: Landmark },
  PRIMARY_SOURCE: { cor: "border-teal-500/40 bg-teal-500/10 text-teal-300", Icone: FileText },
  SECONDARY_SOURCE: { cor: "border-sky-500/40 bg-sky-500/10 text-sky-300", Icone: BookOpen },
  CHARACTER_INTERPRETATION: { cor: "border-violet-500/40 bg-violet-500/10 text-violet-300", Icone: Quote },
  HYPOTHESIS: { cor: "border-amber-500/40 bg-amber-500/10 text-amber-300", Icone: FlaskConical },
  FICTION: { cor: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300", Icone: Theater },
  UNVERIFIED_CLAIM: { cor: "border-red-500/40 bg-red-500/10 text-red-300", Icone: CircleHelp },
};

const POSICOES: Array<{ id: PosicaoFinal; titulo: string; descricao: string }> = [
  {
    id: "padrao_existe",
    titulo: "As evidências sustentam um padrão",
    descricao: "Você acha que os fragmentos se conectam de verdade.",
  },
  {
    id: "padrao_nao_existe",
    titulo: "As evidências não sustentam",
    descricao: "Você acha que John montou uma tese com peças soltas.",
  },
  {
    id: "inconclusivo",
    titulo: "Faltam evidências para decidir",
    descricao: "Você prefere continuar investigando antes de concluir.",
  },
];

/**
 * Arquivo do Campus — app do celular com os fragmentos de pesquisa coletados.
 * Cada informação exibe sua CLASSIFICAÇÃO (fato/fonte/hipótese/ficção) para o
 * jogador sempre distinguir "isso aconteceu" de "John acredita nisso" (§19).
 */
export function ArquivoApp({ historia, onRegistrarPosicao }: Props) {
  const [aberto, setAberto] = useState<string | null>(null);
  const fragmentos = pergaminhosColetados(historia);
  const desfechoAberto = historia.capitulo >= CAPITULO_DESFECHO && !historia.posicaoFinal;

  return (
    <div className="space-y-3 p-3">
      {/* Estado da investigação — dica VAGA, nunca revela a tese (§27). */}
      <div className="rounded-2xl border border-purple-500/25 bg-purple-500/10 p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-300">
          Arquivo do Campus
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-200">{dicaInvestigacao(historia)}</p>
        <p className="mt-1 text-[10px] text-slate-500">
          {fragmentos.length} fragmento{fragmentos.length === 1 ? "" : "s"} reunido
          {fragmentos.length === 1 ? "" : "s"}
        </p>
      </div>

      {fragmentos.length === 0 && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 text-center">
          <ScrollText className="mx-auto mb-2 size-6 text-slate-500" />
          <p className="text-xs text-slate-400">
            Nenhum fragmento ainda. Coisas estranhas costumam aparecer depois de uma boa coletiva.
          </p>
        </div>
      )}

      {/* Fragmentos coletados — fragmento → referência → pergunta (§12). */}
      {fragmentos.map((f) => {
        const estilo = ESTILO_CLASSIFICACAO[f.classificacao];
        const ref = referenciaPorId(f.referenciaId);
        const expandido = aberto === f.id;
        return (
          <button
            key={f.id}
            onClick={() => setAberto(expandido ? null : f.id)}
            className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/60 p-3 text-left transition hover:border-purple-500/30"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-100">{f.titulo}</p>
                <p className="text-[10px] text-slate-500">Pergaminho · capítulo {f.capitulo}</p>
              </div>
              <span
                className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold ${estilo.cor}`}
              >
                <estilo.Icone className="size-3" />
                {CLASSIFICACAO_LABEL[f.classificacao]}
              </span>
            </div>
            {expandido && (
              <div className="mt-2 space-y-2 border-t border-slate-800 pt-2">
                <p className="text-[11px] leading-relaxed text-slate-300">{f.fragmento}</p>
                {ref && (
                  <div className="rounded-xl bg-slate-950/60 p-2">
                    <p className="text-[10px] font-bold text-slate-400">Referência: {ref.titulo}</p>
                    <p className="text-[10px] text-slate-500">Fonte: {ref.fonte}</p>
                  </div>
                )}
                <p className="flex items-start gap-1 text-[10px] italic leading-relaxed text-purple-300/90">
                  <CircleHelp className="mt-0.5 size-3 shrink-0" />
                  {f.pergunta}
                </p>
              </div>
            )}
          </button>
        );
      })}

      {/* Desfecho do primeiro arco (§28): a pergunta final é do jogador. */}
      {desfechoAberto && (
        <div className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
            A pergunta final
          </p>
          <p className="text-xs leading-relaxed text-slate-200">
            Existe realmente um padrão — ou os fragmentos foram montados para parecer um? Qual é a
            sua leitura, com base no que reuniu?
          </p>
          {POSICOES.map((p) => (
            <button
              key={p.id}
              onClick={() => onRegistrarPosicao?.(p.id)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/70 p-2.5 text-left transition hover:border-amber-500/40"
            >
              <p className="text-xs font-bold text-slate-100">{p.titulo}</p>
              <p className="text-[10px] text-slate-400">{p.descricao}</p>
            </button>
          ))}
        </div>
      )}

      {historia.posicaoFinal && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
          <div>
            <p className="text-xs font-bold text-emerald-200">Primeiro arco concluído</p>
            <p className="text-[10px] leading-relaxed text-slate-300">
              Sua posição:{" "}
              {POSICOES.find((p) => p.id === historia.posicaoFinal)?.titulo ?? "registrada"}. O
              arquivo permanece aberto — novas evidências podem mudar tudo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
