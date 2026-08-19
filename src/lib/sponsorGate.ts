/**
 * SPONSOR GATE — controle explícito de propaganda patrocinada.
 *
 * A zona OnClick do Monetag abre pop em qualquer clique enquanto o script está
 * na página. Este módulo é o ÚNICO caminho legítimo: um pop externo só passa
 * pelo adClickGuard quando um ponto estratégico foi "armado" (intervalo,
 * fim de partida, entrada no Modo Carreira, fim de jogo da Trilha).
 *
 * Regras:
 * - Nunca dispara sozinho: só ARMA. O pop acontece no próximo clique do usuário,
 *   que já foi avisado (pill discreta + aviso na tela de carregamento).
 * - O arm expira em 90s (evita pop espúrio muito depois do contexto).
 * - Ao passar, o gate é consumido (1 pop por ponto estratégico).
 * - A propaganda nunca é requisito: se o pop for bloqueado, o jogo segue.
 */

export type PontoSponsor =
  | "carreira-entrar"
  | "partida-intervalo"
  | "partida-fim"
  | "trilha-fim"
  | "trilha-intervalo";

const ARM_TTL_MS = 90 * 1000;
const STORAGE_KEY = "sponsor_gate_armed";

export const SPONSOR_MESSAGES: readonly string[] = [
  "Aviso: a próxima ação pode abrir uma página de patrocinador. Basta fechá-la e continuar jogando.",
  "Patrocinador à frente. Se uma nova aba abrir, feche-a e volte ao jogo normalmente.",
  "Intervalo rápido: este momento pode apresentar um patrocinador. Feche a aba e siga em frente.",
  "Antes de continuar: uma página patrocinada poderá abrir. É só fechar e retornar.",
  "A próxima ação pode abrir uma aba externa. Feche-a para voltar exatamente de onde parou.",
  "Você está entrando numa área patrocinada. O jogo continua normalmente depois.",
];

interface ArmState {
  ponto: PontoSponsor;
  timestamp: number;
  mensagem: string;
}

let armState: ArmState | null = null;
const listeners = new Set<(armado: ArmState | null) => void>();

function lerDoStorage(): ArmState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ArmState;
    if (Date.now() - parsed.timestamp > ARM_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function gravar(state: ArmState | null): void {
  armState = state;
  try {
    if (state) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage indisponível: mantém só em memória
  }
  for (const cb of listeners) cb(state);
}

/** Mensagem de aviso variada (selecionada por ponto + relógio, sem repetir 2x). */
let ultimaMensagem = -1;
export function mensagemSponsor(): string {
  let idx = Math.floor(Math.random() * SPONSOR_MESSAGES.length);
  if (idx === ultimaMensagem) idx = (idx + 1) % SPONSOR_MESSAGES.length;
  ultimaMensagem = idx;
  return SPONSOR_MESSAGES[idx]!;
}

/** Arma um ponto estratégico. Retorna a mensagem de aviso a exibir. */
export function armarSponsor(ponto: PontoSponsor): string {
  const mensagem = mensagemSponsor();
  gravar({ ponto, timestamp: Date.now(), mensagem });
  return mensagem;
}

/** Estado atual (null = desarmado ou expirado). */
export function sponsorArmado(): ArmState | null {
  if (armState && Date.now() - armState.timestamp <= ARM_TTL_MS) return armState;
  const doStorage = lerDoStorage();
  return doStorage;
}

/**
 * Chamado pelo adClickGuard quando um pop externo é solicitado.
 * Retorna true (e consome o gate) se um ponto estratégico estiver armado.
 */
export function consumirSponsorGate(): boolean {
  const arm = sponsorArmado();
  if (!arm) return false;
  gravar(null);
  return true;
}

/** Desarma manualmente (ex.: usuário dispensou o aviso). */
export function desarmarSponsor(): void {
  gravar(null);
}

/** Inscreve UI para reagir a arm/desarm (retorna função de unsubscribe). */
export function onSponsorChange(cb: (armado: ArmState | null) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
