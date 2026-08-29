import type { Atividade, EstudanteState } from "@/components/campus/types";
import { novoEstudante, normalizarEstudante } from "@/components/campus/atividadesEngine";

/**
 * Pipeline científico do Pesquisador: coleta → análise → publicação.
 * Apublicar cedo vs validar mais = a encurralação narrativa central.
 * Engine puro.
 */
export const EXPERIMENTOS_INICIAIS: Atividade[] = [
  {
    id: "exp-coleta-forca",
    tipo: "experimento",
    area: "laboratorio",
    titulo: "Coleta de Dados: Força Explosiva do Botão",
    descricao:
      "A nova mesa de testes mede impulso dos discos. Você decide o rigor metodológico da coleta.",
    dificuldade: 2,
    prerequisitos: [],
    opcoes: [
      {
        texto: "Protocolo completo: 200 lançamentos",
        desfecho: "Dados limpinhos. A análise vai ser à prova.",
        efeitos: { reputacao: 4, traco: "diligente" },
      },
      {
        texto: "20 lançamentos e chutar a tendência",
        desfecho: "Rápido, mas com chi de interferência incômoda.",
        efeitos: { reputacao: -2, traco: "arriscado" },
      },
    ],
  },
  {
    id: "exp-analise-forca",
    tipo: "pesquisa",
    area: "laboratorio",
    titulo: "Análise: O Ângulo Mágico do Impulso",
    descricao:
      "Os dados apontam um ângulo ideal de lançamento. Confirmar exige revisar a literatura inteira.",
    dificuldade: 3,
    prerequisitos: ["exp-coleta-forca"],
    opcoes: [
      {
        texto: "Revisar a literatura antes de afirmar",
        desfecho: "O 'ângulo mágico' é real e replicável. Sério.",
        efeitos: { reputacao: 5, traco: "diligente" },
      },
      {
        texto: "Chamar de 'tendência clara' sem replicar",
        desfecho: "Hipótese publicada-no-peito; em pós-revisão vai arder.",
        efeitos: { sov: 6, reputacao: -4, traco: "arriscado" },
      },
    ],
  },
  {
    id: "exp-publicacao-forca",
    tipo: "publicacao",
    area: "laboratorio",
    titulo: "Publicação: Técnica de Impulso Otimizada",
    descricao:
      "Se seu achado for real, pode entrar nos treinos da Cidadela (e na memória do mundo).",
    dificuldade: 4,
    prerequisitos: ["exp-coleta-forca", "exp-analise-forca"],
    opcoes: [
      {
        texto: "Publicar agora com data completa",
        desfecho:
          "A comunidade científica valida. Descoberta registrada para todos na Cidadela.",
        efeitos: { sov: 10, reputacao: 8, traco: "diligente" },
      },
      {
        texto: "Segurar a publicação por mais uma rodada",
        desfecho: "Conservadorismo: o achado amadurece, mas um rival pode chegar antes.",
        efeitos: { reputacao: 2, traco: "pragmatico" },
      },
    ],
  },
];

export function novoPesquisador(): EstudanteState {
  const base = novoEstudante("pesquisador");
  return { ...base, atividades: EXPERIMENTOS_INICIAIS, tourConcluido: true };
}

export function normalizarPesquisador(raw: unknown): EstudanteState {
  const parcial = raw as Partial<EstudanteState> | null;
  if (!parcial || !Array.isArray(parcial.atividades)) return novoPesquisador();
  return normalizarEstudante(raw);
}
