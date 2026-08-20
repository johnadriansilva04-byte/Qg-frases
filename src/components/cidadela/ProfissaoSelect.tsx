import { useState } from "react";
import { Briefcase, GraduationCap, Landmark, Library, Microscope, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { CidadelaEmblem } from "@/components/CidadelaBranding";
import type { CidadelaPerfil, ProfissaoId } from "@/lib/cidadela/profissoes";
import { PROFISSOES } from "@/lib/cidadela/profissoes";

const ICONES: Record<ProfissaoId, typeof Trophy> = {
  tecnico: Trophy,
  estudante: GraduationCap,
  empresario: Briefcase,
  bibliotecario: Library,
  pesquisador: Microscope,
};

type Props = {
  perfil: CidadelaPerfil;
  nomeJogador?: string | null | undefined;
  onEscolher: (profissao: ProfissaoId) => Promise<void> | void;
};

/**
 * Escolha de identidade na Cidadela. O jogador recebe um contexto forte,
 * nunca uma personalidade pronta — quem ele é emerge das decisões.
 */
export function ProfissaoSelect({ perfil, nomeJogador, onEscolher }: Props) {
  const [selecionando, setSelecionando] = useState<ProfissaoId | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<ProfissaoId | null>(null);

  const primeiraEscolha = perfil.profissoes_desbloqueadas.length === 0;

  const escolher = async (id: ProfissaoId, disponivel: boolean) => {
    if (!disponivel || selecionando) return;
    setErro(null);
    setSelecionando(id);
    try {
      await onEscolher(id);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível registrar a escolha.");
      setSelecionando(null);
    }
  };

  const toggleExpand = (id: ProfissaoId) => {
    setExpandido(expandido === id ? null : id);
  };

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 p-3 md:p-6">
      <main className="painel my-auto w-full max-w-3xl rounded-3xl p-5 shadow-2xl md:p-8">
        <header className="mb-6 flex flex-col items-center text-center">
          <CidadelaEmblem className="mb-3 h-14 w-14 drop-shadow-lg md:h-16 md:w-16" />
          <h1 className="texto-marca text-3xl font-black tracking-tight md:text-4xl">
            {primeiraEscolha ? "Quem é você na Cidadela?" : "Trocar de profissão"}
          </h1>
          <p className="mt-2 max-w-xl text-sm font-medium text-muted-foreground md:text-base">
            {nomeJogador ? `${nomeJogador}, aqui` : "Aqui"} você não escolhe um modo de jogo —
            escolhe uma vida. A profissão define onde sua história começa, quem você conhece
            e quais dilemas vão bater à sua porta.
          </p>
          {!primeiraEscolha && (
            <p className="mt-1 text-xs text-muted-foreground">
              Novas profissões são desbloqueadas com 100 de reputação na Cidadela.
            </p>
          )}
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {PROFISSOES.map((prof) => {
            const Icon = ICONES[prof.id];
            const desbloqueada = perfil.profissoes_desbloqueadas.includes(prof.id);
            const bloqueadaPorReputacao =
              !primeiraEscolha && !desbloqueada && perfil.reputacao_global < 100;
            const ativa = perfil.profissao_atual === prof.id;
            const clicavel = prof.disponivel && !bloqueadaPorReputacao && !ativa;
            const isExpandido = expandido === prof.id;

            return (
              <div
                key={prof.id}
                className={`rounded-xl border transition-all ${
                  ativa
                    ? "border-emerald-400/60 bg-emerald-400/10"
                    : clicavel
                      ? "border-border bg-surface/50"
                      : "border-border/50 bg-surface/30 opacity-60"
                }`}
              >
                <button
                  onClick={() => clicavel ? void escolher(prof.id, clicavel) : toggleExpand(prof.id)}
                  disabled={!clicavel && !isExpandido && selecionando === null}
                  className="flex items-start gap-3 p-3 w-full text-left"
                >
                  <div
                    className={`rounded-lg p-2.5 shrink-0 ${
                      ativa
                        ? "bg-emerald-400/20 text-emerald-300"
                        : clicavel
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-foreground text-sm">{prof.nome}</h3>
                      {!clicavel && !ativa && (
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] ${
                            bloqueadaPorReputacao
                              ? "bg-muted text-muted-foreground"
                              : prof.disponivel
                                ? "bg-success/20 text-success"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {bloqueadaPorReputacao
                            ? `Bloqueada (${perfil.reputacao_global}/100)`
                            : prof.disponivel
                              ? desbloqueada
                                ? "Desbloqueada"
                                : "Disponível"
                              : "Em breve"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground truncate">{prof.pontoDePartida}</p>
                  </div>
                  {clicavel && (
                    <div className="shrink-0">
                      {selecionando === prof.id ? (
                        <span className="text-xs text-primary">Registrando...</span>
                      ) : ativa ? (
                        <span className="text-xs text-emerald-300">Atual</span>
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </button>

                {/* Detalhes expansíveis */}
                {isExpandido && (
                  <div className="px-3 pb-3 pt-0 border-t border-border/50 mt-2">
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{prof.contexto}</p>
                    <p className="mt-2 text-xs text-muted-foreground/80">
                      <Landmark className="mr-1 inline h-3 w-3" />
                      Dilema típico: {prof.conflitoTipico}
                    </p>
                    {clicavel && (
                      <button
                        onClick={() => void escolher(prof.id, clicavel)}
                        disabled={selecionando !== null}
                        className="mt-3 w-full rounded-lg bg-primary/10 border border-primary/30 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition disabled:opacity-50"
                      >
                        {selecionando === prof.id ? "Registrando..." : "Escolher esta profissão"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {erro && (
          <p className="mt-4 rounded-lg border border-red-400/40 bg-red-400/10 p-3 text-center text-sm text-red-300">
            {erro}
          </p>
        )}
      </main>
    </div>
  );
}
