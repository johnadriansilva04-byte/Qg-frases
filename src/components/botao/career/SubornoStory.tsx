import { useMemo, useState } from "react";
import { Briefcase, ShieldAlert, TrendingUp, Users, Zap } from "lucide-react";
import {
  SUBORNO_NODES,
  avancarSuborno,
  tituloDesfecho,
  type SubornoEscolha,
  type SubornoState,
} from "./subornoEngine";

type Props = {
  state: SubornoState;
  onAvancar: (escolha: SubornoEscolha) => void;
  onFechar?: () => void;
};

/** UI de texto/estratégia do enredo de suborno, integrada ao fluxo do torneio. */
export function SubornoStory({ state, onAvancar, onFechar }: Props) {
  const [local, setLocal] = useState<SubornoState>(state);
  const node = useMemo(() => (local.nodeAtual ? SUBORNO_NODES[local.nodeAtual] : null), [local]);

  if (!node) {
    // Desfecho já resolvido (flashback opcional).
    if (local.desfecho) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-8" data-testid="suborno-story">
          <div className="panel border-primary/40">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary">
              <Briefcase className="size-4" />
              <span>O Caso do Suborno · {tituloDesfecho(local.desfecho)}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              O caso já foi resolvido. As consequências acompanham sua carreira.
            </p>
            {onFechar && (
              <button onClick={onFechar} className="btn-ghost mt-4">
                Voltar ao torneio
              </button>
            )}
          </div>
        </div>
      );
    }
    return null;
  }

  const isFinal = node.final;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8" data-testid="suborno-story">
      <div
        className={`panel ${isFinal ? "border-primary/40" : "border-yellow-500/40 bg-yellow-500/[0.03]"}`}
      >
        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-yellow-300">
          <Briefcase className="size-4" />
          <span>Enredo do Suborno · Oferta {state.oferta}</span>
        </div>

        <p className="whitespace-pre-line font-display text-lg leading-relaxed text-foreground">
          {node.cena}
        </p>

        {isFinal ? (
          <div className="mt-5">
            <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
              <p className="font-display text-sm uppercase tracking-[0.2em] text-primary">
                Desfecho: {tituloDesfecho(local.desfecho ?? "recusou_limpo")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                O capítulo se encerra. Os efeitos já foram aplicados à sua carreira.
              </p>
            </div>
            {onFechar && (
              <button onClick={onFechar} className="btn-primary mt-4 w-full sm:w-auto">
                Continuar
              </button>
            )}
          </div>
        ) : (
          <div className="mt-5 grid gap-2">
            {node.escolhas.map((c) => (
              <button
                key={c.id}
                data-testid={`suborno-${c.id}`}
                onClick={() => {
                  const r = avancarSuborno(local, c);
                  setLocal(r.state);
                  onAvancar(c);
                }}
                className="rounded-xl border border-white/10 bg-slate-900/40 p-4 text-left transition hover:border-primary hover:bg-primary/5"
              >
                <div className="flex items-center gap-2">
                  <span className="font-display text-base">{c.texto}</span>
                </div>
                {c.descricao && <p className="mt-1 text-xs text-muted-foreground">{c.descricao}</p>}
                {c.efeitos && (
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                    {typeof c.efeitos.soberania === "number" && (
                      <Chip icon={<TrendingUp className="size-3" />}>
                        Soberania {c.efeitos.soberania > 0 ? "+" : ""}
                        {c.efeitos.soberania}
                      </Chip>
                    )}
                    {typeof c.efeitos.moral === "number" && (
                      <Chip icon={<Users className="size-3" />}>
                        Moral {c.efeitos.moral > 0 ? "+" : ""}
                        {c.efeitos.moral}
                      </Chip>
                    )}
                    {typeof c.efeitos.bonusPoder === "number" && (
                      <Chip icon={<Zap className="size-3" />}>
                        Força {c.efeitos.bonusPoder > 0 ? "+" : ""}
                        {c.efeitos.bonusPoder}
                      </Chip>
                    )}
                    {c.efeitos.flag && (
                      <Chip icon={<ShieldAlert className="size-3" />}>{c.efeitos.flag}</Chip>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-slate-950/50 px-1.5 py-0.5 text-muted-foreground">
      {icon}
      {children}
    </span>
  );
}
