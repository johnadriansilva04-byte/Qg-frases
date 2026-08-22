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
  chat: {
    completions: {
      create: (req: {
        messages: Array<{ role: "system" | "user"; content: string }>;
        max_tokens?: number;
        temperature?: number;
      }) => Promise<{ choices?: Array<{ message?: { content?: string } }> }>;
    };
  };
  unload: () => Promise<void>;
};

interface WebLLMLib {
  CreateMLCEngine: (
    modelId: string,
    opts?: { initProgressCallback?: (r: { progress: number; text: string }) => void },
  ) => Promise<WebLLMEngine>;
  prebuiltAppConfig?: { model_list?: Array<{ model_id: string }> };
}

// Qwen2.5-0.5B: multilíngue (pt-BR razoável), ~400MB cacheados no navegador.
const MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
let webllmLib: WebLLMLib | null = null;
let webllmLibTried = false;
let engineLoading: Promise<WebLLMEngine | null> | null = null;
let activeEngine: WebLLMEngine | null = null;
// Diagnóstico público (E2E/dev): qual motor respondeu a última geração.
let ultimoMotor: "llm" | "template" | "nenhum" = "nenhum";
function marcarMotor(m: "llm" | "template" | "nenhum") {
  ultimoMotor = m;
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)["__aiMotor"] = m;
  }
}

/** Tenta carregar a lib webllm (dynamic import) — retorna null se ausente. */
async function loadWebLLMLib(): Promise<WebLLMLib | null> {
  if (webllmLibTried) return webllmLib;
  webllmLibTried = true;
  try {
    // Import dinâmico com especificador em variável + ignore: o pacote é
    // grande e só deve baixar em aparelhos potentes (lazy chunk).
    const modName = "@mlc-ai/web-llm";
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
        initProgressCallback: () => {},
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

/** Extrai o texto da resposta do chat.completions (tolerante a variações). */
function extrairResposta(resp: unknown): string | null {
  const content = (resp as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]
    ?.message?.content;
  const txt = typeof content === "string" ? content.trim() : "";
  return txt.length > 0 ? txt : null;
}

const DIVISAO_LABEL_AI = {
  "serie-a": "Série A",
  "serie-b": "Série B",
  "serie-c": "Série C",
} as const;

/** Monta o prompt de chat no padrão instruction do SmolLM2/Qwen. */
function buildUserPrompt(promptType: PromptType, ctx: AIContext): string {
  const base: Record<PromptType, string> = {
    comentarista: "Comente o resultado da partida de futebol de botão em tom sarcástico.",
    coletiva: "Faça uma pergunta ácida de imprensa na coletiva pós-jogo.",
    medico: "Redija um relatório do departamento médico, irônico, sobre o preparo dos botões.",
    redes_sociais: "Gere um tweet de torcedor reagindo ao último placar.",
    noticia: "Escreva uma manchete de bastidores conectada ao jogo.",
    pracinha:
      "Fale como Pracinha, o robô militar retrô e guia da Cidadela. Convoque o jogador para missões diárias, exploração dos Pergaminhos e partidas online em tom heroico e intrigante.",
  };
  const vars: string[] = [];
  if (ctx.coach) vars.push(`Treinador: ${ctx.coach}`);
  if (ctx.timeNome) vars.push(`Time: ${ctx.timeNome}`);
  if (ctx.vencedor) vars.push(`Vencedor: ${ctx.vencedor}`);
  if (ctx.perdedor) vars.push(`Perdedor: ${ctx.perdedor}`);
  if (ctx.golsPro != null && ctx.golsContra != null)
    vars.push(`Placar: ${ctx.golsPro} x ${ctx.golsContra}`);
  if (ctx.rodada != null) vars.push(`Rodada: ${ctx.rodada}`);
  if (ctx.competicao) vars.push(`Competição: ${ctx.competicaoNome ?? ctx.competicao}`);
  if (ctx.adversarioNome) vars.push(`Adversário: ${ctx.adversarioNome}`);
  if (ctx.divisao) vars.push(`Divisão: ${DIVISAO_LABEL_AI[ctx.divisao]}`);
  if (ctx.temporada != null) vars.push(`Temporada: ${ctx.temporada}`);
  if (ctx.posicaoTabela != null) vars.push(`Posição na tabela: ${ctx.posicaoTabela}º`);
  if (ctx.moralTime != null) vars.push(`Moral do elenco: ${ctx.moralTime}/100`);
  if (ctx.soberania != null) vars.push(`Soberania: ${ctx.soberania}`);
  if (ctx.rodadasRestantes != null) vars.push(`Rodadas restantes: ${ctx.rodadasRestantes}`);
  if (ctx.decisaoPendente) vars.push(`Decisão pendente: ${ctx.decisaoPendente}`);

  return `${base[promptType]}\nContexto do jogo:\n${vars.join("\n")}\n` +
    `Nunca invente fatos fora do contexto; use somente dados reais e varie aberturas. ` +
    `Responda em português, no máximo 2 frases.`;
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
          const resp = await engine.chat.completions.create({
            messages: [
              { role: "system", content: SYSTEM_PROMPT_COMENTARISTA },
              { role: "user", content: buildUserPrompt(promptType, context) },
            ],
            max_tokens: 90,
            temperature: 0.85,
          });
          const out = extrairResposta(resp);
          if (out) {
            marcarMotor("llm");
            return out;
          }
        } catch {
          // desliga o engine defeituoso e cai no template
          activeEngine = null;
        }
      }
    }
    // 2. Motor de Templates Procedurais (Supabase > fallback local).
    try {
      const out = await gerarTemplate(promptType, context);
      marcarMotor("template");
      return out;
    } catch {
      marcarMotor("template");
      return "Comentarista offline: bola rolando no Futebol de Botão!";
    }
  },

  /**
   * Conversa com persona livre (NPCs do RPG). Tenta apenas a LLM local — se
   * indisponível, retorna null e o chamador usa o fallback procedural. Isso
   * mantém a voz do personagem: template genérico estragaria a persona.
   */
  async generatePersona(systemPrompt: string, userPrompt: string): Promise<string | null> {
    const hw = await detectarHardware();
    if (hw.veredito !== "potente") return null;
    const engine = await getEngine(hw);
    if (!engine) return null;
    try {
      const resp = await engine.chat.completions.create({
        messages: [
          { role: "system", content: `${systemPrompt}\nResponda em português, no máximo 2 frases, sem sair do personagem.` },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 100,
        temperature: 0.85,
      });
      const out = extrairResposta(resp);
      if (out) {
        marcarMotor("llm");
        return out;
      }
      return null;
    } catch {
      activeEngine = null;
      return null;
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

  /**
   * Diagnóstico: qual motor respondeu a última geração ("llm" | "template" |
   * "nenhum"). Expõe também no window (`__aiMotor`) para o E2E auditar se a
   * LLM realmente gerou a frase.
   */
  motorAtual(): "llm" | "template" | "nenhum" {
    return ultimoMotor;
  },

  /** Expõe o system prompt padrão (para auditoria/reuso externo). */
  get systemPrompt(): string {
    return SYSTEM_PROMPT_COMENTARISTA;
  },
};

/** Instância default exportada para import direto em qualquer módulo. */
export const ai = AIService;
export default AIService;
