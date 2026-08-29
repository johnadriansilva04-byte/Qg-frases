import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { onSponsorChange, desarmarSponsor, type PontoSponsor } from "@/lib/sponsorGate";

interface ArmView {
  ponto: PontoSponsor;
  timestamp: number;
  mensagem: string;
}

const TITULO_POR_PONTO: Record<PontoSponsor, string> = {
  "carreira-entrar": "Entrando no Modo Carreira",
  "partida-intervalo": "Intervalo da partida",
  "partida-fim": "Partida encerrada",
  "trilha-fim": "Jogo da Trilha encerrado",
  "trilha-intervalo": "Pausa na Trilha",
};

/**
 * SponsorNotice — pill discreta avisando que há um botão de patrocinador disponível.
 * MODIFICADO: Não dispara automaticamente - apenas avisa que o botão existe.
 */
export function SponsorNotice() {
  const [arm, setArm] = useState<ArmView | null>(null);
  const [dispensado, setDispensado] = useState(false);

  useEffect(() => {
    const unsub = onSponsorChange((estado) => {
      setArm(estado);
      setDispensado(false);
    });
    return unsub;
  }, []);

  if (!arm || dispensado) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-md items-center gap-2 rounded-full border border-amber-400/30 bg-slate-950/90 py-1.5 pl-3 pr-1.5 shadow-lg shadow-black/40 backdrop-blur-md">
        <Megaphone className="size-3.5 shrink-0 text-amber-300" />
        <p className="text-[11px] font-medium leading-tight text-amber-100">
          <span className="font-bold">{TITULO_POR_PONTO[arm.ponto]}: </span>
          {arm.mensagem}
        </p>
        <button
          onClick={() => {
            setDispensado(true);
            desarmarSponsor();
          }}
          className="shrink-0 rounded-full p-1 text-slate-400 transition hover:text-white"
          aria-label="Dispensar aviso"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
