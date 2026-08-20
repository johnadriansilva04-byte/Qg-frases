import { useState } from "react";
import { Briefcase, GraduationCap, Landmark, Library, Microscope, Trophy } from "lucide-react";
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

        <div className="grid gap-4 sm:grid-cols-2">
          {PROFISSOES.map((prof) => {
            const Icon = ICONES[prof.id];
            const desbloqueada = perfil.profissoes_desbloqueadas.includes(prof.id);
            const bloqueadaPorReputacao =
              !primeiraEscolha && !desbloqueada && perfil.reputacao_global < 100;
            const ativa = perfil.profissao_atual === prof.id;
            const clicavel = prof.disponivel && !bloqueadaPorReputacao && !ativa;

            return (
              <button
                key={prof.id}
                onClick={() => void escolher(prof.id, clicavel)}
                disabled={!clicavel || selecionando !== null}
                className={`flex items-start gap-4 rounded-xl border p-4 text-left transition-all ${
                  ativa
                    ? "border-emerald-400/60 bg-emerald-400/10"
                    : clicavel
                      ? "cursor-pointer border-border bg-surface/50 hover:border-primary hover:bg-primary/10 active:scale-[0.98]"
                      : "cursor-not-allowed border-border/50 bg-surface/30 opacity-60"
                }`}
              >
                <div
                  className={`rounded-lg p-3 ${
                    ativa
                      ? "bg-emerald-400/20 text-emerald-300"
                      : clicavel
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{prof.nome}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{prof.contexto}</p>
                  <p className="mt-2 text-xs text-muted-foreground/80">
                    <Landmark className="mr-1 inline h-3 w-3" />
                    {prof.pontoDePartida} · Dilema: {prof.conflitoTipico}
                  </p>
                  <span
                    className={`mt-2 inline-block rounded-full px-2 py-1 text-xs ${
                      ativa
                        ? "bg-emerald-400/20 text-emerald-300"
                        : bloqueadaPorReputacao
                          ? "bg-muted text-muted-foreground"
                          : prof.disponivel
                            ? "bg-success/20 text-success"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {selecionando === prof.id
                      ? "Registrando..."
                      : ativa
                        ? "Profissão atual"
                        : bloqueadaPorReputacao
                          ? `Bloqueada (${perfil.reputacao_global}/100 reputação)`
                          : prof.disponivel
                            ? desbloqueada
                              ? "Desbloqueada"
                              : "Disponível"
                            : "Em breve"}
                  </span>
                </div>
              </button>
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
