import { useState } from "react";
import { X } from "lucide-react";
import { ControlledMonetagButton } from "./ControlledMonetagButton";

/**
 * MatchEndAdCard — Card de anúncio para tela de fim de partida
 * 
 * Regras:
 * - Aparece na parte inferior da tela de resultado
 * - Texto fixo: "Cansou de jogar? Descubra algo novo."
 * - Usa ControlledMonetagButton (já tem confirmação + proteção contra duplo clique)
 * - Visual secundário, não cobre o resultado principal
 * - Animação sutil de pulsação para chamar atenção
 * - Responsivo para celular
 */
export function MatchEndAdCard() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="mt-6 flex justify-center">
      <div className="relative w-full max-w-md">
        {/* Botão de dispensar (X) discreto */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          aria-label="Dispensar"
        >
          <X className="size-3" />
        </button>

        {/* Card principal com animação de pulsação */}
        <div 
          className="relative rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/40 to-indigo-950/40 p-5 shadow-lg shadow-purple-900/20"
          style={{ animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
        >
          {/* Efeito de brilho sutil */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/10 via-transparent to-indigo-500/10 pointer-events-none" />
          
          <div className="relative">
            {/* Ícone decorativo */}
            <div className="flex justify-center mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
                <svg 
                  className="size-5 text-purple-300" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M13 10V3L4 14h7v7l9-11h-7z" 
                  />
                </svg>
              </div>
            </div>

            {/* Texto principal */}
            <p className="text-center text-sm font-semibold text-purple-100 mb-4 leading-relaxed">
              Cansou de jogar? Descubra algo novo.
            </p>

            {/* Botão controlado */}
            <ControlledMonetagButton
              className="w-full text-xs font-medium"
              message="Você será direcionado para uma nova aba. Deseja continuar?"
            >
              Descobrir algo novo
            </ControlledMonetagButton>
          </div>
        </div>
      </div>
    </div>
  );
}
