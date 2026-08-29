import { Star, TrendingUp } from "lucide-react";
import type { CidadelaPerfil } from "@/lib/cidadela/profissoes";
import { profissaoById } from "@/lib/cidadela/profissoes";

type Props = { perfil: CidadelaPerfil };

/** Painel da identidade do jogador: reputação, nível e progresso ao próximo desbloqueio. */
export function PainelReputacao({ perfil }: Props) {
  const profAtiva = profissaoById(perfil.profissao_atual);
  const faltam = Math.max(0, 100 - perfil.reputacao_global);
  const progresso = Math.min(100, perfil.reputacao_global);

  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-300" />
          <div>
            <p className="text-xs font-bold text-foreground">
              {profAtiva?.nome ?? "Sem profissão"} · Nível {perfil.nivel_cidadela}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Reputação na Cidadela: {perfil.reputacao_global}
            </p>
          </div>
        </div>
        <TrendingUp className="h-4 w-4 text-amber-300/60" />
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
        <div
          className="h-1.5 rounded-full bg-amber-400 transition-all"
          style={{ width: `${progresso}%` }}
        />
      </div>
      {faltam > 0 ? (
        <p className="mt-1 text-[10px] text-muted-foreground">
          {faltam} reputação para desbloquear novas profissões
        </p>
      ) : (
        <p className="mt-1 text-[10px] text-emerald-300">
          Novas profissões desbloqueáveis — visite a seleção de identidade
        </p>
      )}
    </div>
  );
}
