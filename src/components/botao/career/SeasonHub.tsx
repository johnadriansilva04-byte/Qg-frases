import { Trophy, Calendar, TrendingUp, Lock } from "lucide-react";
import type { SeasonState, Competition, TableData } from "./seasonTypes";

interface SeasonHubProps {
  seasonState: SeasonState | null;
  onPlayBrasileirao: (rodada: number) => void;
  onPlayCopa: (fase: string) => void;
  onPlayLibertadores: (fase: string) => void;
}

export function SeasonHub({ seasonState, onPlayBrasileirao, onPlayCopa, onPlayLibertadores }: SeasonHubProps) {
  if (!seasonState?.season) {
    return (
      <div className="panel text-center py-8">
        <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Nenhuma season ativa. Inicie uma campanha para começar.</p>
      </div>
    );
  }

  const brasileirao = seasonState.competicoes.find(c => c.tipo === "brasileirao");
  const copa = seasonState.competicoes.find(c => c.tipo === "copa_brasil");
  const libertadores = seasonState.competicoes.find(c => c.tipo === "libertadores");

  return (
    <div className="space-y-6">
      {/* Header da Season */}
      <div className="panel">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl">Season {seasonState.season.ano}</h2>
            <p className="text-sm text-muted-foreground">
              Mês {seasonState.mes_atual} · Rodada {seasonState.rodada_atual}
            </p>
          </div>
          {seasonState.economia && (
            <div className="text-right">
              <p className="font-display text-xl">{seasonState.economia.soberania_atual}</p>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Soberania</p>
            </div>
          )}
        </div>
      </div>

      {/* Brasileirão */}
      {brasileirao && (
        <CompetitionCard
          competition={brasileirao}
          icon={<Trophy className="h-5 w-5 text-yellow-500" />}
          onPlay={() => onPlayBrasileirao(seasonState.rodada_atual)}
          isLocked={false}
        />
      )}

      {/* Copa do Brasil */}
      {copa && (
        <CompetitionCard
          competition={copa}
          icon={<Trophy className="h-5 w-5 text-green-500" />}
          onPlay={() => onPlayCopa(copa.fase_atual || "oitavas")}
          isLocked={false}
        />
      )}

      {/* Libertadores */}
      {libertadores ? (
        <CompetitionCard
          competition={libertadores}
          icon={<Trophy className="h-5 w-5 text-blue-500" />}
          onPlay={() => onPlayLibertadores(libertadores.fase_atual || "fase_grupos")}
          isLocked={false}
        />
      ) : (
        <div className="panel opacity-50">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-display text-lg">Libertadores</h3>
              <p className="text-sm text-muted-foreground">
                Classifique-se no top 4 do Brasileirão para participar
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Economia */}
      {seasonState.economia && (
        <EconomyPanel economia={seasonState.economia} />
      )}
    </div>
  );
}

interface CompetitionCardProps {
  competition: Competition;
  icon: React.ReactNode;
  onPlay: () => void;
  isLocked: boolean;
}

function CompetitionCard({ competition, icon, onPlay, isLocked }: CompetitionCardProps) {
  const tabela = competition.dados.tabela as TableData[] | undefined;
  const posicaoUsuario = tabela?.findIndex(t => t.time_id === "user") ?? -1;

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h3 className="font-display text-lg">{competition.nome}</h3>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {competition.status === "em_andamento" ? "Em andamento" : competition.status}
            </p>
          </div>
        </div>
        {!isLocked && (
          <button
            onClick={onPlay}
            className="btn-primary text-sm"
          >
            Jogar
          </button>
        )}
      </div>

      {tabela && tabela.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Classificação</p>
          <div className="space-y-1">
            {tabela.slice(0, 5).map((time, i) => (
              <div key={time.time_id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-6 text-center font-mono">{i + 1}</span>
                  <span>{time.time_nome}</span>
                </span>
                <span className="font-mono">{time.pontos} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface EconomyPanelProps {
  economia: {
    soberania_atual: number;
    custo_mensal: number;
    meses_negativos: number;
    game_over: boolean;
  };
}

function EconomyPanel({ economia }: EconomyPanelProps) {
  if (economia.game_over) {
    return (
      <div className="panel border-red-500/50 bg-red-500/10">
        <div className="text-center">
          <p className="font-display text-xl text-red-500">FALÊNCIA</p>
          <p className="text-sm text-muted-foreground">
            Você ficou 3 meses consecutivos com soberania negativa
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg">Economia</h3>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Saldo atual</span>
          <span className="font-mono">{economia.soberania_atual}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Custo mensal</span>
          <span className="font-mono text-red-500">-{economia.custo_mensal}</span>
        </div>
        {economia.meses_negativos > 0 && (
          <div className="flex justify-between text-yellow-500">
            <span>Meses negativos</span>
            <span className="font-mono">{economia.meses_negativos}/3</span>
          </div>
        )}
      </div>
    </div>
  );
}
