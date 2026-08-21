import { supabase } from "@/integrations/supabase/client";

/**
 * Sistema de Profissões da Cidadela dos Clássicos.
 *
 * Princípio: profissão é IDENTIDADE (a lente pela qual o jogador vê o mundo),
 * não modo de jogo. O jogador não recebe personalidade pré-definida — recebe
 * um contexto forte e constrói quem é através das decisões.
 */

export type ProfissaoId =
  | "tecnico"
  | "estudante"
  | "empresario"
  | "bibliotecario"
  | "pesquisador";

export interface ProfissaoInfo {
  id: ProfissaoId;
  nome: string;
  /** Contexto inicial neutro — nunca uma personalidade pronta. */
  contexto: string;
  /** Onde a história dessa profissão começa na Cidadela. */
  pontoDePartida: string;
  /** Dilema típico (trade-off sem resposta perfeita). */
  conflitoTipico: string;
  /** Se false, aparece como "em breve" na seleção. */
  disponivel: boolean;
}

export const PROFISSOES: ProfissaoInfo[] = [
  {
    id: "tecnico",
    nome: "Técnico de Futebol",
    contexto:
      "O clube atravessa uma crise financeira e a torcida perdeu a paciência. A diretoria quer resultados imediatos.",
    pontoDePartida: "Estádio da Cidadela",
    conflitoTipico: "Manter um ídolo em má forma ou apostar na base?",
    disponivel: true,
  },
  {
    id: "estudante",
    nome: "Estudante",
    contexto:
      "Você acabou de ser aprovado no Campus Universitário do Brio. A bolsa cobre o estudo, mas não o aluguel.",
    pontoDePartida: "Campus Universitário",
    conflitoTipico: "Aceitar um bico que paga o mês ou se dedicar à prova decisiva?",
    disponivel: true,
  },
  {
    id: "empresario",
    nome: "Empresário",
    contexto:
      "Seu escritório no Setor Comercial tem três propostas na mesa e um sócio impaciente cobrando retorno.",
    pontoDePartida: "Setor Comercial",
    conflitoTipico: "Contrato lucrativo com cláusula duvidosa: assinar ou renegociar?",
    disponivel: true,
  },
  {
    id: "bibliotecario",
    nome: "Bibliotecário",
    contexto:
      "O acervo da Biblioteca guarda segredos da Cidadela — e mais gente do que deveria está interessada neles.",
    pontoDePartida: "Biblioteca da Cidadela",
    conflitoTipico: "Dois grupos disputam o mesmo livro raro. Para quem emprestar?",
    disponivel: true,
  },
  {
    id: "pesquisador",
    nome: "Pesquisador",
    contexto:
      "Os Laboratórios do Campus têm equipamento básico, um financiamento apertado e um problema que ninguém resolveu.",
    pontoDePartida: "Laboratórios do Campus",
    conflitoTipico: "Publicar uma descoberta promissora cedo ou validar por mais tempo?",
    disponivel: true,
  },
];

export function profissaoById(id: ProfissaoId | null | undefined): ProfissaoInfo | null {
  if (!id) return null;
  return PROFISSOES.find((p) => p.id === id) ?? null;
}

/** Linha de cidadela_perfis (fonte de verdade da identidade do jogador). */
export interface CidadelaPerfil {
  id: string;
  user_id: string;
  profissao_atual: ProfissaoId | null;
  profissoes_desbloqueadas: ProfissaoId[];
  reputacao_global: number;
  nivel_cidadela: number;
  /** Estado individual da profissão ativa (EstudanteState, onboarding, etc.). */
  estado: Record<string, unknown>;
  bio?: string | null;
  created_at: string;
  updated_at: string;
}

export type ClimaEconomico = "prospera" | "estavel" | "crise";
export type ClimaSocial = "harmonia" | "tensao" | "conflito";

/** Memória do mundo: estado global compartilhado da Cidadela. */
export interface WorldState {
  id: string;
  clima_economico: ClimaEconomico;
  clima_social: ClimaSocial;
  eventos_ativos: EventoGlobalAtivo[];
  descobertas_cientificas: DescobertaCientifica[];
  decisoes_globais: Record<string, unknown>;
  updated_at: string;
}

export interface EventoGlobalAtivo {
  id: string;
  titulo: string;
  descricao: string;
  /** Efeitos por profissão: texto mostrado a cada identidade. */
  efeitos: Partial<Record<ProfissaoId, string>>;
}

export interface DescobertaCientifica {
  id: string;
  titulo: string;
  autor: string;
  efeito: string;
}

export const WORLD_STATE_INICIAL: WorldState = {
  id: "global",
  clima_economico: "estavel",
  clima_social: "harmonia",
  eventos_ativos: [],
  descobertas_cientificas: [],
  decisoes_globais: {},
  updated_at: new Date(0).toISOString(),
};

// ---------------------------------------------------------------------------
// Persistência: Apenas Supabase como fonte de verdade.
// localStorage é usado apenas para estado temporário de UI (intro visto, etc.)
// ---------------------------------------------------------------------------

function perfilLocalInicial(userId: string): CidadelaPerfil {
  return {
    id: `local-${userId}`,
    user_id: userId,
    profissao_atual: null,
    profissoes_desbloqueadas: [],
    reputacao_global: 0,
    nivel_cidadela: 1,
    estado: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function normalizarPerfil(raw: Record<string, unknown>, userId: string): CidadelaPerfil {
  const base = perfilLocalInicial(userId);
  const estadoBruto = raw["estado"] ?? raw["estado_cidadela"];
  return {
    ...base,
    ...(raw as Partial<CidadelaPerfil>),
    user_id: userId,
    profissao_atual: (raw["profissao_atual"] as ProfissaoId | null) ?? null,
    profissoes_desbloqueadas: Array.isArray(raw["profissoes_desbloqueadas"])
      ? (raw["profissoes_desbloqueadas"] as ProfissaoId[])
      : [],
    reputacao_global: Number(raw["reputacao_global"] ?? 0),
    nivel_cidadela: Number(raw["nivel_cidadela"] ?? 1),
    estado:
      estadoBruto && typeof estadoBruto === "object"
        ? (estadoBruto as Record<string, unknown>)
        : {},
  };
}

export async function carregarPerfilCidadela(userId: string): Promise<CidadelaPerfil> {
  // Apenas Supabase como fonte de verdade - sem localStorage para dados persistentes
  try {
    const { data, error } = await supabase.rpc("obter_perfil_cidadela");
    if (!error && data) {
      return normalizarPerfil(data as Record<string, unknown>, userId);
    }
  } catch (err) {
    console.error("[Cidadela] RPC obter_perfil_cidadela falhou:", err);
  }

  // Se RPC falhar, retorna perfil inicial (usuário precisa ter migrations aplicadas)
  return perfilLocalInicial(userId);
}

export async function escolherProfissao(
  userId: string,
  profissao: ProfissaoId,
): Promise<CidadelaPerfil> {
  try {
    const { data, error } = await supabase.rpc("escolher_profissao", {
      p_profissao: profissao,
    });
    if (!error && data) {
      return normalizarPerfil(data as Record<string, unknown>, userId);
    }
  } catch (err) {
    console.error("[Cidadela] RPC escolher_profissao falhou:", err);
  }

  // Se RPC falhar, recarrega o perfil atual
  return carregarPerfilCidadela(userId);
}

/** Mescla um patch no estado individual e aplica delta de reputação. */
export async function salvarEstadoCidadela(
  userId: string,
  patch: Record<string, unknown>,
  reputacaoDelta = 0,
): Promise<CidadelaPerfil> {
  try {
    const { data, error } = await supabase.rpc("atualizar_estado_cidadela", {
      p_estado: patch as never,
      p_reputacao_delta: reputacaoDelta,
    });
    if (!error && data) {
      return normalizarPerfil(data as Record<string, unknown>, userId);
    }
  } catch (err) {
    console.error("[Cidadela] RPC atualizar_estado_cidadela falhou:", err);
  }

  // Se RPC falhar, recarrega o perfil atual
  return carregarPerfilCidadela(userId);
}

export async function carregarWorldState(): Promise<WorldState> {
  try {
    const { data, error } = await supabase.rpc("obter_world_state");
    if (!error && data) {
      const raw = data as Record<string, unknown>;
      return {
        ...WORLD_STATE_INICIAL,
        ...(raw as Partial<WorldState>),
        eventos_ativos: Array.isArray(raw["eventos_ativos"])
          ? (raw["eventos_ativos"] as EventoGlobalAtivo[])
          : [],
        descobertas_cientificas: Array.isArray(raw["descobertas_cientificas"])
          ? (raw["descobertas_cientificas"] as DescobertaCientifica[])
          : [],
      };
    }
  } catch (err) {
    console.warn("[Cidadela] RPC obter_world_state indisponível:", err);
  }
  return WORLD_STATE_INICIAL;
}
