/**
 * Notificação do celular (§14): som curto + helper para o indicador visual.
 * Som gerado com WebAudio (sem assets), falha silenciosa quando o navegador
 * bloqueia autoplay (o som só toca após interação do usuário).
 */

let ctx: AudioContext | null = null;

/** Toca um beep curto estilo "notificação de mensagem". */
export function tocarNotificacao(): void {
  try {
    if (typeof window === "undefined") return;
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.start(t);
    osc.stop(t + 0.4);
    // Segundo "blip" mais agudo, clássico de notificação de celular.
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "sine";
    osc2.frequency.value = 1320;
    gain2.gain.setValueAtTime(0.0001, t + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.1, t + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    osc2.start(t + 0.12);
    osc2.stop(t + 0.5);
  } catch {
    // Autoplay bloqueado ou WebAudio ausente: sem som, sem crash.
  }
}
