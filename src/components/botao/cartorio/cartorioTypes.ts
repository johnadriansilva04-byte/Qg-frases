/**
 * Tipos e templates do Cartório da Cidadela.
 * A Bibliotecária (IA) redige os documentos a partir dos dados do jogo.
 */

export interface CartorioFormContrato {
  nomeClube: string;
  treinador: string;
  tempo: string;
  valor: string;
  clausulas: string;
}

export interface CartorioFormPeticao {
  tipoIncidente: string;
  descricao: string;
  anexos: string;
}

export interface CartorioFormMulta {
  motivo: string;
  valor: string;
}

/** Mapa de campos por tipo de documento (preenchimento por dados do jogo). */
export const CARTORIO_CAMPOS = {
  contrato: {
    nomeClube: "",
    treinador: "",
    tempo: "Temporada 1",
    valor: "50.000 SOV",
    clausulas: "Vínculo",
  } as CartorioFormContrato,
  peticao: {
    tipoIncidente: "Incidente em quadra",
    descricao: "",
    anexos: "",
  } as CartorioFormPeticao,
  multa: {
    motivo: "",
    valor: "30 SOV",
  } as CartorioFormMulta,
};

/** System prompt da Bibliotecária (geração do texto do documento). */
export const SYSTEM_PROMPT_BIBLIOTECARIA =
  "Você é a Bibliotecária da Cidadela: tabeliã que lavra documentos do clube " +
  "com tom jurídico leve e pitada de humor. Redige contrato, petição de defesa " +
  "e comprovante de multa usando os dados recebidos. Responda apenas com o " +
  "texto final do documento — sem comentários ou formatação especial.";

export const CLAUSULAS_PADRAO = [
  "Vínculo até fim da temporada declarada",
  "Multa rescisória em caso de descumprimento",
  "Bônus por classificação na mata-mata",
];

/** Dados do jogo lidos do pedido (temporada/time/coach/soberania). */
export interface DadosJogo {
  temporada?: number;
  rodada?: number;
  timeId?: string;
  timeNome?: string;
  coach?: string;
  soberania?: number;
  eventoId?: string;
  valor?: string | number;
}

/** Gera texto fallback (procedural) caso a IA esteja indisponível. */
export function montarDocumentoFallback(
  tipo: "contrato" | "peticao" | "multa",
  form: CartorioFormContrato | CartorioFormPeticao | CartorioFormMulta,
  dados?: DadosJogo,
): string {
  if (tipo === "contrato") {
    const f = form as CartorioFormContrato;
    return [
      `CONTRATO DE VÍNCULO — ${f.nomeClube || "(clube)"}`,
      ``,
      `O clube ${f.nomeClube || "________"} declara a formalização do vínculo com ${f.treinador || "________"} (treinador) na temporada ${f.tempo}.`,
      ``,
      `Valor do vínculo: ${f.valor || "a convenir"}.`,
      `Cláusulas escolhidas: ${f.clausulas || CARTORIO_CAMPOS.contrato.clausulas}.`,
      dados?.temporada ? `Registrado na temporada ${dados.temporada} da carreira.` : "",
      `Lavrado pela Bibliotecária da Cidadela.`,
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (tipo === "peticao") {
    const f = form as CartorioFormPeticao;
    return [
      `PETIÇÃO DE DEFESA — ${f.tipoIncidente || "(incidente)"}`,
      ``,
      `O solicitante declara para a Justiça da Cidadela:`,
      ``,
      `Incidente: ${f.tipoIncidente || "________"}.`,
      `Descrição: ${f.descricao || "________"}.`,
      `Anexos/provas: ${f.anexos || "manejadora mãe"}.`,
      ``,
      `Pede-se a absolitude, com resguardo do clube.`,
      `Lavrado pela Bibliotecária da Cidadela.`,
    ].join("\n");
  }
  const f = form as CartorioFormMulta;
  return [
    `COMPROVANTE DE MULTA — QUITAÇÃO`,
    ``,
    `Fica quitado o débito judicial do clibe motivo: ${f.motivo || "________"}.`,
    `Valor recolhido: ${f.valor || "________"}.`,
    `Dado quitação. Lavrado pela Bibliotecária da Cidadela.`,
  ].join("\n");
}
