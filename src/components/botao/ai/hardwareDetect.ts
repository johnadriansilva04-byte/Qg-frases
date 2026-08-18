/**
 * Detecção automática de hardware para a IA on-device (Zero Crash Guarantee).
 *
 * O front-end testa capacidades reais do aparelho:
 *  - `deviceMemory` (RAM em GB, quando exposto pelo navegador)
 *  - `hardwareConcurrency` (núcleos lógicos da CPU)
 *  - `WebGPU` (adapter) — pré-requisito para rodar WebLLM confortavelmente.
 *
 * Retorno: um veredito simples que decide se o AIService ativa a IA local
 * (WebLLM/On-Device) ou cai no Motor de Templates Procedurais (banco de
 * frases no Supabase). Em caso de qualquer erro, assume aparelho FRACO —
 * nunca trava o jogo.
 */

export type AparatoVeredito = "potente" | "fraco";

export interface HardwareInfo {
  veredito: AparatoVeredito;
  deviceMemoryGB: number | null;
  hardwareConcurrency: number | null;
  hasWebGPU: boolean;
  motivo: string;
}

let cached: HardwareInfo | null = null;

/** Verifica suporte a WebGPU sem travar em ambientes sem a API. */
async function checkWebGPU(): Promise<boolean> {
  try {
    const nav = navigator as unknown as {
      gpu?: {
        requestAdapter?: () => Promise<unknown | null>;
      };
    };
    if (!nav.gpu || typeof nav.gpu.requestAdapter !== "function") return false;
    const adapter = await Promise.race([
      nav.gpu.requestAdapter(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);
    return adapter != null;
  } catch {
    return false;
  }
}

/** Detecta o hardware do aparelho uma única vez (cache). */
export async function detectarHardware(): Promise<HardwareInfo> {
  if (cached) return cached;

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };
  const deviceMemoryGB = typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;
  const hardwareConcurrency =
    typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null;
  const hasWebGPU = await checkWebGPU();

  // Critério: WebGPU + (>=4 núcleos ou >=4GB) → potente. Caso contrário, fraco.
  const cores = hardwareConcurrency ?? 0;
  const ram = deviceMemoryGB ?? 0;
  const potente = hasWebGPU && (cores >= 4 || ram >= 4);

  const motivo = !hasWebGPU
    ? "Sem WebGPU no navegador"
    : cores < 4 && ram < 4
      ? "Poucos núcleos/RAM"
      : "Aparelho compatível com WebLLM";

  cached = {
    veredito: potente ? "potente" : "fraco",
    deviceMemoryGB,
    hardwareConcurrency,
    hasWebGPU,
    motivo,
  };
  return cached;
}

/** Acesso síncrono ao veredito (assume fraco se ainda não detectado). */
export function vereditoHardware(): AparatoVeredito {
  return cached?.veredito ?? "fraco";
}
