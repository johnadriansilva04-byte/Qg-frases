/**
 * AIService — Módulo/Serviço Centralizado de IA ("Comentarista Sarcástica").
 *
 * Construído como uma API/Classe interna independente: `AIService.generateText(
 * context, promptType)`. Conectado prioritariamente ao Torneio Offline, mas
 * modular e expansível para reuso em outros modos do app.
 *
 * Estratégia de execução (Zero Crash Guarantee):
 *  1. Detecta o hardware (WebGPU + núcleos/RAM).
 *  2. Se POTENTE: tenta ativar IA local on-device (WebLLM/SmolLM2-360M ou
 *     Qwen2.5-0.5B). Carregamento lazy via dynamic import — nunca derruba o
 *     bundle se a lib não estiver instalada.
 *  3. Se FRACO (ou WebLLM ausente/falhou): ativa o Motor de Templates
 *     Procedurais (banco de frases `botao_frases_ia` no Supabase, com fallback
 *     local). O jogo roda liso em qualquer aparelho.
 *
 * Custo ZERO de API: tudo roda no dispositivo ou por templates pré-definidos.
 */

import { detectarHardware, vereditoHardware, type HardwareInfo } from "./hardwareDetect";
import { gerarTemplate } from "./templateEngine";
import { SYSTEM_PROMPT_COMENTARISTA, type AIContext, type PromptType } from "./types";

type WebLLMEngine = {
  generate: (input: string, opts?: unknown) => Promise<string>;
  unload: () => Promise<void>;
};

interface WebLLMLib {
  CreateMLCEngine: (
    modelId: string,
    opts?: { initProgress?: (r: { progress: number; text: string }) => void },
  ) => Promise<WebLLMEngine>;
  prebuiltAppConfig?: { models?: Array<{ model_id: string }> };
}

const MODEL_ID = "smollm2-360m-instruct-q4f16_1-MLC";
let webllmLib: WebLLMLib | null = null;
let webllmLibTried = false;
let engineLoading: Promise<WebLLMEngine | null> | null = null;
let activeEngine: WebLLMEngine | null = null;

/** Tenta carregar a lib webllm (dynamic import) — retorna null se ausente. */
async function loadWebLLMLib(): Promise<WebLLMLib | null> {
  if (webllmLibTried) return webllmLib;
  webllmLibTried = true;
  try {
    // Import dinâmico com especificador em variável + ignore: evita que o
    // bundler tente resolver "webllm" estaticamente (o pacote é opcional).
    // Se não estiver instalado em runtime, cai no catch → fallback de templates.
    const modName = "webllm";
    const mod = (await import(/* @vite-ignore */ modName)) as unknown as WebLLMLib;
    if (typeof mod?.CreateMLCEngine === "function") {
      webllmLib = mod;
    }
  } catch {
    webllmLib = null;
  }
  return webllmLib;
}

/** Carrega (lazy) o engine WebLLM se o aparelho for potente e a lib existir. */
async function getEngine(hw: HardwareInfo): Promise<WebLLMEngine | null> {
  if (activeEngine) return activeEngine;
  if (engineLoading) return engineLoading;
  if (hw.veredito !== "potente") return null;

  engineLoading = (async () => {
    const lib = await loadWebLLMLib();
    if (!lib) return null;
    try {
      const engine = await lib.CreateMLCEngine(MODEL_ID, {
        initProgress: () => {},
      });
      activeEngine = engine;
      return engine;
    } catch {
      return null;
    } finally {
      engineLoading = null;
    }
  })();
  return engineLoading;
}

/** Monta o prompt de chat no padrão instruction do SmolLM2/Qwen. */
function buildUserPrompt(promptType: PromptType, ctx: AIContext): string {
  const base: Record<PromptType, string> = {
    comentarista: "Comente o resultado da partida de futebol de botão em tom sarcástico.",
    coletiva: "Faça uma pergunta ácida de imprensa na coletiva pós-jogo.",
    medico: "Redija um relatório do departamento médico, irônico, sobre o preparo dos botões.",
    redes_sociais: "Gere um tweet de torcedor reagindo ao último placar.",
    noticia: "Escreva uma manchete de bastidores conectada ao jogo.",
  };
  const vars: string[] = [];
  if (ctx.coach) vars.push(`Treinador: ${ctx.coach}`);
  if (ctx.timeNome) vars.push(`Time: ${ctx.timeNome}`);
  if (ctx.vencedor) vars.push(`Vencedor: ${ctx.vencedor}`);
  if (ctx.perdedor) vars.push(`Perdedor: ${ctx.perdedor}`);
  if (ctx.golsPro != null && ctx.golsContra != null)
    vars.push(`Placar: ${ctx.golsPro} x ${ctx.golsContra}`);
  if (ctx.rodada != null) vars.push(`Rodada: ${ctx.rodada}`);

  return `${base[promptType]}\nContexto do jogo:\n${vars.join("\n")}\nResponda em português, no máximo 2 frases.`;
}

/**
 * Singleton exposto para o app. `generateText` é a API pública usada por todo o
 * jogo (narração, coletiva, médico, redes sociais, notícias).
 */
export const AIService = {
  /** Inicializa a detecção de hardware + (se potente) pré-carrega o engine. */
  async init(): Promise<HardwareInfo> {
    const hw = await detectarHardware();
    if (hw.veredito === "potente") {
      // Não bloqueia: apenas dispara o carregamento do engine em background.
      void getEngine(hw);
    }
    return hw;
  },

  /** Veredito síncrono: "potente" | "fraco". */
  status(): "potente" | "fraco" {
    return vereditoHardware();
  },

  /**
   * Gera um texto na voz da comentarista sarcástica. Tenta a IA local on-device
   * primeiro; se indisponível, cai no Motor de Templates Procedurais. Nunca
   * rejeita: sempre devolve uma string (pode ser fallback simples em último
   * caso).
   */
  async generateText(context: AIContext, promptType: PromptType): Promise<string> {
    const hw = await detectarHardware();
    // 1. IA local on-device (WebLLM) — só em aparelhos potentes.
    if (hw.veredito === "potente") {
      const engine = await getEngine(hw);
      if (engine) {
        try {
          const user = buildUserPrompt(promptType, context);
          const out = await engine.generate(user, { max_tokens: 80 });
          if (out && out.trim()) return out.trim();
        } catch {
          // desliga o engine defeituoso e cai no template
          activeEngine = null;
        }
      }
    }
    // 2. Motor de Templates Procedurais (Supabase > fallback local).
    try {
      return await gerarTemplate(promptType, context);
    } catch {
      return "Comentarista offline: bola rolando no Futebol de Botão!";
    }
  },

  /** Encerra o engine local (libera memória da GPU). */
  async shutdown(): Promise<void> {
    if (activeEngine) {
      try {
        await activeEngine.unload();
      } catch {
        // ignore
      }
      activeEngine = null;
    }
  },

  /** Expõe o system prompt padrão (para auditoria/reuso externo). */
  get systemPrompt(): string {
    return SYSTEM_PROMPT_COMENTARISTA;
  },
};

/** Instância default exportada para import direto em qualquer módulo. */
export const ai = AIService;
export default AIService;
