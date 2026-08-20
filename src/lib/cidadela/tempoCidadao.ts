/**
 * Tempo de Cidadão — presença real e tempo ativo na Cidadela (§1–§6, §26).
 *
 * - Heartbeat a cada 60s SOMENTE com a aba visível (aba suspensa/oculta não
 *   conta tempo — uma aba abandonada não acumula indefinidamente).
 * - O servidor trava cada chamada em ≤120s: refresh/reconexão no máximo
 *   perdem 2 min, nunca ganham tempo fantasma.
 * - MULTI-ABA: só a aba "líder" envia heartbeats (lock em localStorage com
 *   expiração); se a líder morre, outra assume. A recompensa por hora é
 *   idempotente no servidor (chave tempo:{user}:{hora}) — mesmo duas abas
 *   simultâneas não duplicam SOV.
 * - Sem polling agressivo: 1 RPC/minuto por usuário online.
 */

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TempoCidadao = {
  tempoTotalSegundos: number;
  horasRecompensadas: number;
  online: boolean;
};

const INTERVALO_MS = 60_000;
const LOCK_KEY = "cidadela:tempo:lider";
const LOCK_TTL_MS = 90_000;

/** Líder entre abas: uma única aba envia heartbeats por vez. */
function assumirLideranca(tabId: string): boolean {
  try {
    const bruto = localStorage.getItem(LOCK_KEY);
    if (bruto) {
      const lock = JSON.parse(bruto) as { id: string; ts: number };
      if (lock.id !== tabId && Date.now() - lock.ts < LOCK_TTL_MS) return false;
    }
    localStorage.setItem(LOCK_KEY, JSON.stringify({ id: tabId, ts: Date.now() }));
    return true;
  } catch {
    return true; // sem localStorage: segue como líder (idempotência do servidor protege)
  }
}

async function heartbeat(segundos: number): Promise<TempoCidadao | null> {
  const { data, error } = await supabase.rpc("tempo_cidadao_heartbeat", {
    p_segundos: Math.min(Math.max(Math.round(segundos), 0), 120),
  });
  if (error) return null;
  const linha = (data ?? [])[0];
  if (!linha) return null;
  return {
    tempoTotalSegundos: Number(linha.tempo_total_segundos),
    horasRecompensadas: Number(linha.horas_recompensadas),
    online: true,
  };
}

/**
 * Mantém o cidadão online e acumula Tempo de Cidadão enquanto a aba está
 * visível. Retorna o tempo acumulado (segundos) e o nº de horas pagas agora
 * (para o chamador notificar "+10 SOV").
 */
export function useTempoCidadao(
  userId: string | null,
  onRecompensa?: (horasPagas: number) => void,
): TempoCidadao {
  const [tempo, setTempo] = useState<TempoCidadao>({
    tempoTotalSegundos: 0,
    horasRecompensadas: 0,
    online: false,
  });
  const tabIdRef = useRef(`tab-${Math.random().toString(36).slice(2)}`);
  const ultimoTickRef = useRef<number>(Date.now());
  const onRecompensaRef = useRef(onRecompensa);
  onRecompensaRef.current = onRecompensa;

  useEffect(() => {
    if (!userId) return;
    ultimoTickRef.current = Date.now();

    const tick = async () => {
      if (document.visibilityState !== "visible") {
        ultimoTickRef.current = Date.now();
        return;
      }
      if (!assumirLideranca(tabIdRef.current)) {
        ultimoTickRef.current = Date.now();
        return;
      }
      const agora = Date.now();
      const decorrido = (agora - ultimoTickRef.current) / 1000;
      ultimoTickRef.current = agora;
      if (decorrido < 10) return; // tick duplo (ex.: dois timers) — ignora
      const { data, error } = await supabase.rpc("tempo_cidadao_heartbeat", {
        p_segundos: Math.min(Math.round(decorrido), 120),
      });
      if (error || !data?.[0]) return;
      const linha = data[0];
      setTempo({
        tempoTotalSegundos: Number(linha.tempo_total_segundos),
        horasRecompensadas: Number(linha.horas_recompensadas),
        online: true,
      });
      const pagas = Number(linha.horas_pagas_agora ?? 0);
      if (pagas > 0) onRecompensaRef.current?.(pagas);
    };

    void tick(); // heartbeat imediato: marca presença ao entrar
    const timer = window.setInterval(() => void tick(), INTERVALO_MS);
    const aoVoltar = () => {
      // Voltou a ver a aba: zera o contador (o tempo oculto NÃO conta).
      ultimoTickRef.current = Date.now();
      void tick();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [userId]);

  return tempo;
}

/** Formata "10h 24min" a partir de segundos. */
export function formatarTempoCidadao(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  if (h === 0) return `${m}min`;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

export { heartbeat as tempoCidadaoHeartbeat };
