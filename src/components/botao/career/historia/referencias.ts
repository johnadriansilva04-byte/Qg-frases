/**
 * Banco de Referências da investigação (§34, §35).
 *
 * Cada entrada é verificável e carrega sua classificação (§19). Regras:
 *  - FATO HISTÓRICO: documentado por instituição reconhecida (nomeada em `fonte`).
 *  - HYPOTHESIS: a tese do PERSONAGEM John Adrian — nunca apresentada como fato.
 *  - UNVERIFIED_CLAIM: alegações controversas (ex.: Stanley Meyer) marcadas como
 *    não comprovadas (§16).
 *  - FICTION: elementos do universo do jogo.
 * Nada aqui copia textos das obras — são resumos curtos para alimentar a
 * narrativa (§14).
 */

import type { ReferenciaHistorica } from "./types";

export const REFERENCIAS: ReferenciaHistorica[] = [
  {
    id: "ref-eugenia-ushmm",
    titulo: "Eugenia e políticas de exclusão no século XX",
    resumo:
      "A eugenia foi uma corrente intelectual e científica histórica que influenciou " +
      "políticas de higiene racial, incluindo esterilização compulsória e o programa T4 " +
      "na Alemanha nazista.",
    fonte: "US Holocaust Memorial Museum",
    classificacao: "HISTORICAL_FACT",
  },
  {
    id: "ref-leis-nuremberg",
    titulo: "Leis de Nuremberg (1935)",
    resumo:
      "As Leis de Nuremberg transformaram concepções raciais em categorias jurídicas. " +
      "A legislação antissemita nazista não surgiu num único ato: centenas de decretos e " +
      "regulamentos restringiram progressivamente a vida pública, econômica e civil dos judeus.",
    fonte: "US Holocaust Memorial Museum",
    classificacao: "HISTORICAL_FACT",
  },
  {
    id: "ref-feb-italia",
    titulo: "Força Expedicionária Brasileira na Campanha da Itália",
    resumo:
      "Mais de 25 mil brasileiros foram enviados à Itália na Segunda Guerra. Fontes " +
      "oficiais registram a participação da FEB em operações como Monte Castello e Montese. " +
      "O Arquivo Nacional mantém a documentação do envio dos contingentes.",
    fonte: "Arquivo Nacional / Ministério da Defesa",
    classificacao: "HISTORICAL_FACT",
  },
  {
    id: "ref-feb-memoria",
    titulo: "Memória disputada da FEB",
    resumo:
      "A lembrança pública da FEB oscilou ao longo das décadas — períodos de silêncio, " +
      "reconstruções e disputas de narrativa. Como a memória de um acontecimento é " +
      "preservada, esquecida ou disputada é uma questão aberta de pesquisa.",
    fonte: "Historiografia sobre memória da Segunda Guerra no Brasil",
    classificacao: "SECONDARY_SOURCE",
  },
  {
    id: "ref-jane-jacobs",
    titulo: "Jane Jacobs — Morte e Vida de Grandes Cidades",
    resumo:
      "Jacobs defendeu que a vida urbana saudável nasce da diversidade, do uso misto e da " +
      "interação cotidiana — não de planejamentos que decidem de cima quem pertence a cada " +
      "espaço da cidade.",
    fonte: "The Death and Life of Great American Cities (1961)",
    classificacao: "SECONDARY_SOURCE",
  },
  {
    id: "ref-tesla",
    titulo: "Nikola Tesla e a corrente alternada",
    resumo:
      "A trajetória de Tesla e o desenvolvimento de seus motores de corrente alternada são " +
      "documentados institucionalmente — um caso clássico da relação entre invenção, " +
      "financiamento e reconhecimento.",
    fonte: "Smithsonian Institution",
    classificacao: "HISTORICAL_FACT",
  },
  {
    id: "ref-stanley-meyer",
    titulo: "O caso Stanley Meyer",
    resumo:
      "Meyer alegou ter inventado um motor movido a água. Alegações extraordinárias exigem " +
      "evidência extraordinária: o caso é historicamente documentado como controverso e " +
      "suas alegações nunca foram validadas cientificamente — foi condenado por fraude em 1996.",
    fonte: "Registros judiciais (Ohio, 1996) e cobertura jornalística da época",
    classificacao: "UNVERIFIED_CLAIM",
  },
  {
    id: "ref-tese-john-adrian",
    titulo: "A tese de John Adrian",
    resumo:
      "John Adrian acredita que mecanismos de exclusão que historicamente assumiram formas " +
      "explicitamente raciais ou biológicas podem, em outros contextos, reaparecer sob " +
      "mecanismos institucionais, administrativos ou burocráticos. É uma HIPÓTESE do " +
      "personagem — a investigação existe para testá-la, não para confirmá-la.",
    fonte: "Cadernos de pesquisa de John Adrian (universo do jogo)",
    classificacao: "HYPOTHESIS",
  },
  {
    id: "ref-arquivo-cidadela",
    titulo: "O Arquivo da Cidadela",
    resumo:
      "O Arquivo Central da Cidadela guarda o registro de tudo: fundação, licenças, " +
      "cadastros, acessos. Quem controla o registro, controla a memória da cidade.",
    fonte: "Universo do jogo",
    classificacao: "FICTION",
  },
];

export function referenciaPorId(id: string): ReferenciaHistorica | null {
  return REFERENCIAS.find((r) => r.id === id) ?? null;
}
