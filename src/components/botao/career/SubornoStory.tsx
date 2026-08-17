import { useMemo } from "react";
import { Briefcase, ShieldAlert, TrendingUp, Users, Zap, Smartphone, X, MessageSquare } from "lucide-react";
import {
  SUBORNO_NODES,
  tituloDesfecho,
  type SubornoEscolha,
  type SubornoState,
} from "./subornoEngine";

type Props = {
  state: SubornoState;
  onAvancar: (escolha: SubornoEscolha) => void;
  onFechar?: () => void;
};

function Chip({ icon: Icon, children, variant = "default" }: { icon?: any; children: React.ReactNode; variant?: "default" | "warning" }) {
  return (
    <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
      variant === "warning" ? "bg-yellow-500/20 text-yellow-300" : "bg-primary/20 text-primary"
    }`}>
      {Icon && <Icon className="size-3" />}
      {children}
    </div>
  );
}

/** UI de texto/estratégia do enredo de suborno, integrada ao fluxo do torneio. */
export function SubornoStory({ state, onAvancar, onFechar }: Props) {
  const node = useMemo(() => (state.nodeAtual ? SUBORNO_NODES[state.nodeAtual] : null), [state.nodeAtual]);

  if (!node) {
    // Desfecho já resolvido (flashback opcional).
    if (state.desfecho) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-8" data-testid="suborno-story">
          <div className="panel border-primary/40">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary">
              <Briefcase className="size-4" />
              <span>O Caso do Suborno · {tituloDesfecho(state.desfecho)}</span>
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
    <div className="mx-auto max-w-md px-4 py-8" data-testid="suborno-story">
      {/* Celular */}
      <div className="relative mx-auto max-w-xs rounded-[2.5rem] border-4 border-slate-800 bg-slate-950 p-3 shadow-2xl">
        {/* Notch */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-6 w-24 rounded-b-xl bg-slate-800"></div>
        
        {/* Tela do celular */}
        <div className="rounded-2xl bg-slate-900 p-4 min-h-[400px]">
          {/* Header do celular */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Smartphone className="size-4 text-green-400" />
              <span className="text-xs text-slate-400">Celular do Treinador</span>
            </div>
            {onFechar && (
              <button onClick={onFechar} className="text-slate-400 hover:text-white transition">
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Conteúdo da mensagem */}
          <div className="space-y-3">
            {/* Mensagem recebida */}
            <div className="bg-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <MessageSquare className="size-4 text-yellow-300" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-300">Desconhecido</p>
                  <p className="text-[10px] text-slate-500">Oferta {state.oferta}</p>
                </div>
              </div>
              <p className="whitespace-pre-line text-sm text-slate-100">
                {node.cena}
              </p>
            </div>

            {isFinal ? (
              <div className="mt-4">
                <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2">
                  <p className="font-display text-xs uppercase tracking-[0.2em] text-primary">
                    Desfecho: {tituloDesfecho(state.desfecho ?? "recusou_limpo")}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    O capítulo se encerra. Os efeitos já foram aplicados à sua carreira.
                  </p>
                </div>
                {onFechar && (
                  <button onClick={onFechar} className="btn-primary mt-3 w-full text-xs py-2">
                    Continuar
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] text-slate-500 text-center">Respostas:</p>
                {node.escolhas.map((c) => (
                  <button
                    key={c.id}
                    data-testid={`suborno-${c.id}`}
                    onClick={() => onAvancar(c)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-left transition hover:border-yellow-500/50 hover:bg-yellow-500/5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xs text-slate-100">{c.texto}</span>
                    </div>
                    {c.descricao && <p className="mt-1 text-[10px] text-slate-400">{c.descricao}</p>}
                    {c.efeitos && (
                      <div className="mt-2 flex flex-wrap gap-1">
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
                        {typeof c.efeitos.bonusPoder === "number" && c.efeitos.bonusPoder > 0 && (
                          <Chip icon={<Zap className="size-3" />}>
                            Poder +{c.efeitos.bonusPoder}
                          </Chip>
                        )}
                        {c.efeitos.flag === "viu_envelope" && (
                          <Chip icon={<ShieldAlert className="size-3" />} variant="warning">
                            Comprometido
                          </Chip>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
