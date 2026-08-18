import { ChevronRight, Play, Save, Trash2, ArrowLeft } from "lucide-react";
import type { CareerState } from "./types";

type Props = {
  career: CareerState | null;
  onLoadCareer: () => void;
  onNewCareer: () => void;
  onSaveCampaign: () => void;
  onDeleteCareer: () => void;
  onBack: () => void;
};

export function CareerMenu({
  career,
  onLoadCareer,
  onNewCareer,
  onSaveCampaign,
  onDeleteCareer,
  onBack,
}: Props) {
  const hasCareer = career && career.coach.nome;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Voltar ao menu
      </button>

      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl">Modo Carreira</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Brasileirão + Copa do Brasil. Suba de divisão e conquiste títulos.
          </p>
        </div>

        {hasCareer ? (
          <div className="space-y-4">
            <div className="panel p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Campanha Atual</p>
              <p className="mt-2 font-display text-2xl">{career.coach.apelido || career.coach.nome}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Temporada {career.temporada} · {career.divisao.toUpperCase().replace("SERIE-", "SÉRIE ")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Soberania: {career.coach.soberania} · Títulos: {career.coach.titulos}
              </p>
            </div>

            {/* Continuar campanha existente */}
            <button
              onClick={onLoadCareer}
              className="menu-card w-full"
            >
              <span className="menu-card-icon menu-accent-emerald">
                <Play className="size-5" />
              </span>
              <span className="mt-3 block font-display text-2xl leading-tight">Continuar Campanha</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Voltar para a carreira em andamento
              </span>
              <span className="menu-card-cta">Entrar →</span>
            </button>

            {/* Nova Carreira: cria um perfil de treinador novo (sem apagar a atual
                até confirmar). Mantém a opção de Carregar acima. */}
            <button
              onClick={onNewCareer}
              className="menu-card w-full"
            >
              <span className="menu-card-icon menu-accent-fuchsia">
                <Play className="size-5" />
              </span>
              <span className="mt-3 block font-display text-2xl leading-tight">Nova Carreira</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Criar perfil de treinador e selecionar o time. Comece do zero.
              </span>
              <span className="menu-card-cta">Começar →</span>
            </button>

            <button
              onClick={onSaveCampaign}
              className="menu-card w-full"
            >
              <span className="menu-card-icon menu-accent-sky">
                <Save className="size-5" />
              </span>
              <span className="mt-3 block font-display text-2xl leading-tight">Salvar Campanha</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Salva o progresso atual no servidor
              </span>
              <span className="menu-card-cta">Salvar →</span>
            </button>

            <button
              onClick={onDeleteCareer}
              className="menu-card menu-card-destructive w-full"
            >
              <span className="menu-card-icon menu-card-icon-destructive">
                <Trash2 className="size-5 text-destructive" />
              </span>
              <span className="mt-3 block font-display text-2xl leading-tight">Excluir Campanha</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Apaga todo o progresso da campanha atual
              </span>
              <span className="menu-card-cta text-destructive">Excluir →</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="panel p-4 text-center py-8">
              <p className="text-sm text-muted-foreground">
                Nenhuma campanha salva. Crie sua carreira e comece sua jornada!
              </p>
            </div>

            <button
              onClick={onNewCareer}
              className="menu-card w-full"
            >
              <span className="menu-card-icon menu-accent-fuchsia">
                <Play className="size-5" />
              </span>
              <span className="mt-3 block font-display text-2xl leading-tight">Iniciar Nova Carreira</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Crie o perfil do treinador, selecione o time e comece do zero
              </span>
              <span className="menu-card-cta">Começar →</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
