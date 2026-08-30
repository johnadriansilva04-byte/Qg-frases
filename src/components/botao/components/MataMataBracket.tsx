import { useMemo } from "react";
import { Crown, Zap } from "lucide-react";
import type { ConfrontoCampeonato, ParticipanteCampeonato } from "@/lib/multiplayer/campeonato.api";

type Props = {
  confrontos: ConfrontoCampeonato[];
  participantes: ParticipanteCampeonato[];
  userId: string;
  totalRodadas: number;
};

/**
 * Bracket visual profissional para Mata-Mata.
 * Mostra rounds horizontais com connectors SVG, cards de time,
 * e destaque para o caminho do usuário.
 */
export function MataMataBracket({ confrontos, participantes, userId, totalRodadas }: Props) {
  // Organiza confrontos por rodada (1 = final, 2 = semi, etc.)
  const rounds = useMemo(() => {
    const grouped: Map<number, ConfrontoCampeonato[]> = new Map();
    for (const c of confrontos) {
      const rod = c.rodada;
      if (!grouped.has(rod)) grouped.set(rod, []);
      grouped.get(rod)!.push(c);
    }
    // Para formatos com rodadas >= 10000 (grupos+elim), normaliza
    // para numeração sequencial a partir de 1
    const rodadas = Array.from(grouped.keys()).sort((a, b) => a - b);
    const isHighNumbering = rodadas.some((r) => r >= 10000);
    const normalizedMap = new Map<number, number>();
    if (isHighNumbering) {
      rodadas.forEach((r, i) => normalizedMap.set(r, i + 1));
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([rodada, lista]) => {
        const norm = isHighNumbering ? (normalizedMap.get(rodada) ?? rodada) : rodada;
        return {
          rodada,
          nome: norm === 1 ? "Final" : norm === 2 ? "Semifinal" : norm === 3 ? "Quartas" : norm === 4 ? "Oitavas" : `Rodada ${norm}`,
          confrontos: lista,
        };
      });
  }, [confrontos]);

  const nomeDo = (uid: string | null) => {
    if (!uid) return "BYE";
    const p = participantes.find((x) => x.user_id === uid);
    return p ? (p.abreviacao ?? p.nome.slice(0, 6)) : "???";
  };

  const isUser = (uid: string | null) => uid === userId;
  const isFinished = (c: ConfrontoCampeonato) => c.status === "finalizado" && !c.bye;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Crown className="size-4 text-emerald-400" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Chaveamento Eliminatório</p>
      </div>

      {/* Bracket horizontal scroll */}
      <div className="overflow-x-auto rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-slate-950/20 p-4 shadow-lg shadow-emerald-500/10">
        <div className="flex gap-6" style={{ minWidth: `${rounds.length * 200}px` }}>
          {rounds.map((round, ri) => (
            <div key={round.rodada} className="flex flex-col gap-4" style={{ minWidth: 180 }}>
              {/* Label da rodada */}
              <div className="flex items-center gap-2 mb-2">
                <Zap className="size-3 text-emerald-400/60" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/60">{round.nome}</p>
              </div>

              {/* Confrontos */}
              <div className="flex flex-col gap-3">
                {round.confrontos.map((c, ci) => {
                  const j1 = nomeDo(c.j1_id);
                  const j2 = nomeDo(c.j2_id);
                  const userInMatch = isUser(c.j1_id) || isUser(c.j2_id);
                  const finished = isFinished(c);
                  const j1Won = finished && (c.pl_j1 ?? 0) > (c.pl_j2 ?? 0);
                  const j2Won = finished && (c.pl_j2 ?? 0) > (c.pl_j1 ?? 0);

                  return (
                    <div key={ci} className={`rounded-xl border p-3 transition ${
                      userInMatch
                        ? "border-emerald-400/60 bg-emerald-400/15 shadow-lg shadow-emerald-400/15"
                        : "border-emerald-500/20 bg-emerald-950/30"
                    }`}>
                      {/* J1 */}
                      <div className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition ${
                        j1Won ? "bg-emerald-500/20" : ""
                      }`}>
                        <span className={`text-sm font-bold ${isUser(c.j1_id) ? "text-emerald-300" : "text-white"} ${j1Won ? "text-emerald-300" : ""}`}>
                          {j1}
                        </span>
                        {finished && !c.bye && (
                          <span className={`font-mono text-lg font-black ${j1Won ? "text-emerald-400" : "text-white/40"}`}>
                            {c.pl_j1}
                          </span>
                        )}
                        {!finished && !c.bye && <span className="text-xs text-white/20">vs</span>}
                      </div>

                      {/* Divider */}
                      <div className="my-1 h-px bg-emerald-500/20" />

                      {/* J2 */}
                      <div className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition ${
                        j2Won ? "bg-emerald-500/20" : ""
                      }`}>
                        <span className={`text-sm font-bold ${isUser(c.j2_id) ? "text-emerald-300" : "text-white"} ${j2Won ? "text-emerald-300" : ""}`}>
                          {j2}
                        </span>
                        {finished && !c.bye && (
                          <span className={`font-mono text-lg font-black ${j2Won ? "text-emerald-400" : "text-white/40"}`}>
                            {c.pl_j2}
                          </span>
                        )}
                        {!finished && !c.bye && <span className="text-xs text-white/20">vs</span>}
                      </div>

                      {/* Bye badge */}
                      {c.bye && (
                        <p className="mt-1 text-center text-[10px] text-white/30">BYE</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
