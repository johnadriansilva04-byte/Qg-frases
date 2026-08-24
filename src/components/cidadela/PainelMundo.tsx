import { useEffect, useState } from "react";
import { Globe2, Thermometer, Users } from "lucide-react";
import {
  carregarWorldState,
  type CidadelaPerfil,
  type WorldState,
} from "@/lib/cidadela/profissoes";
import {
  efeitoParaProfissao,
  eventoDaSemana,
} from "@/lib/cidadela/eventosGlobais";

const CLIMA_ECON: Record<string, string> = {
  prospera: "Economia próspera",
  estavel: "Economia estável",
  crise: "Economia em crise",
};
const CLIMA_SOC: Record<string, string> = {
  harmonia: "Clima social em harmonia",
  tensao: "Clima social em tensão",
  conflito: "Clima social em conflito",
};

type Props = { perfil: CidadelaPerfil | null };

/**
 * Memória do mundo: o estado global da Cidadela + evento da semana
 * (fallback determinístico quando o banco ainda não foi alimentado).
 */
export function PainelMundo({ perfil }: Props) {
  const [world, setWorld] = useState<WorldState | null>(null);

  useEffect(() => {
    let vivo = true;
    void carregarWorldState().then((w) => {
      if (vivo) setWorld(w);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const dataISO = new Date().toISOString().slice(0, 10);
  const evento =
    world && world.eventos_ativos && world.eventos_ativos.length > 0
      ? world.eventos_ativos[0]!
      : eventoDaSemana(dataISO);
  const efeito = perfil
    ? efeitoParaProfissao(evento, perfil.profissao_atual)
    : null;
  const descobertas = world?.descobertas_cientificas ?? [];

  return (
    <div className="mb-6 rounded-xl border border-sky-400/30 bg-sky-400/10 p-3">
      <div className="flex items-center gap-2">
        <Globe2 className="h-4 w-4 text-sky-300" />
        <div className="flex-1">
          <p className="text-xs font-bold text-foreground">{evento.titulo}</p>
          <p className="text-[11px] text-muted-foreground">{evento.descricao}</p>
        </div>
      </div>
      {efeito && (
        <p className="mt-2 rounded-lg bg-background/60 p-2 text-[11px] text-foreground">
          ➔ {efeito}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Thermometer className="h-3 w-3" />
          {CLIMA_ECON[world?.clima_economico ?? "estavel"] ?? "Economia estável"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          {CLIMA_SOC[world?.clima_social ?? "harmonia"] ?? "Clima social em harmonia"}
        </span>
        {descobertas.length > 0 && (
          <span>· {descobertas.length} descoberta(s) registrada(s) no mundo</span>
        )}
      </div>
    </div>
  );
}
