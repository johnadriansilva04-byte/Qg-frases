/**
 * Central de sons de notificação da Cidadela (§13).
 *
 * Toda categoria de evento tem UMA identidade sonora definida aqui — nenhum
 * componente cria AudioContext próprio nem espalha padrões de beep. Som
 * gerado com WebAudio (sem assets), falha silenciosa quando o navegador
 * bloqueia autoplay (o som só toca após interação do usuário).
 *
 * Regra de uso: tocar APENAS quando um evento novo realmente aconteceu
 * (§13) — nunca em renderização. A idempotência do evento é responsabilidade
 * da origem (fila do celular, RPCs, chaves idempotentes).
 */

export type CategoriaNotificacao =
  | "mensagem"
  | "missao"
  | "recompensa"
  | "entrevista"
  | "noticia"
  | "pergaminho";

let ctx: AudioContext | null = null;

function contexto(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

type Nota = { freq: number; inicio: number; duracao: number; volume?: number };

/** Padrões sonoros por categoria — curtos, discretos, distinguíveis. */
const PADROES: Record<CategoriaNotificacao, Nota[]> = {
  mensagem: [
    { freq: 880, inicio: 0, duracao: 0.35 },
    { freq: 1320, inicio: 0.12, duracao: 0.33 },
  ],
  missao: [
    { freq: 660, inicio: 0, duracao: 0.18 },
    { freq: 880, inicio: 0.14, duracao: 0.18 },
    { freq: 1100, inicio: 0.28, duracao: 0.3 },
  ],
  recompensa: [
    { freq: 1568, inicio: 0, duracao: 0.12 },
    { freq: 1568, inicio: 0.12, duracao: 0.12 },
    { freq: 2093, inicio: 0.24, duracao: 0.35, volume: 0.14 },
  ],
  entrevista: [
    { freq: 520, inicio: 0, duracao: 0.25 },
    { freq: 780, inicio: 0.2, duracao: 0.35 },
  ],
  noticia: [
    { freq: 440, inicio: 0, duracao: 0.2 },
    { freq: 660, inicio: 0.16, duracao: 0.28 },
  ],
  pergaminho: [
    { freq: 392, inicio: 0, duracao: 0.3, volume: 0.08 },
    { freq: 523, inicio: 0.22, duracao: 0.3, volume: 0.08 },
    { freq: 784, inicio: 0.44, duracao: 0.4, volume: 0.1 },
  ],
};

/** Toca a identidade sonora de uma categoria de notificação. */
export function tocarSom(categoria: CategoriaNotificacao): void {
  const audio = contexto();
  if (!audio) return;
  try {
    const t0 = audio.currentTime;
    for (const nota of PADROES[categoria]) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.type = "sine";
      osc.frequency.value = nota.freq;
      const t = t0 + nota.inicio;
      const vol = nota.volume ?? 0.12;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + nota.duracao);
      osc.start(t);
      osc.stop(t + nota.duracao + 0.05);
    }
  } catch {
    // WebAudio indisponível: sem som, sem crash.
  }
}

/** Compat: beep clássico de mensagem (chamadas antigas). */
export function tocarNotificacao(): void {
  tocarSom("mensagem");
}
