/**
 * Declaração de ambiente para o pacote opcional `webllm` (WebLLM/MLC on-device).
 * O pacote NÃO é uma dependência obrigatória: é carregado via dynamic import em
 * runtime, e se ausente, o jogo cai automaticamente no Motor de Templates
 * Procedurais. Esta declaração apenas silencia o type-checker para o import
 * dinâmico opcional.
 */
declare module "webllm" {
  export interface MLCEngine {
    chat: (opts: {
      messages: Array<{ role: string; content: string }>;
      stream?: boolean;
      temperature?: number;
      max_tokens?: number;
    }) => Promise<{ content: string }>;
    unload: () => Promise<void>;
  }
  export function CreateMLCEngine(
    modelId: string,
    opts?: { initProgressCallback?: (r: { progress: number }) => void },
  ): Promise<MLCEngine>;
  export const prebuiltAppConfig: { model_list: Array<{ model_id: string }> };
}
