/**
 * Os Pergaminhos de John Adrian — FRAGMENTOS da pesquisa (§12).
 *
 * Cada pergaminho contém apenas UMA parte: fragmento → referência → pergunta.
 * Nenhum entrega a tese; o jogador monta o pensamento (§11, §27).
 * A ordem de entrega é definida pelo historiaEngine (gatilho = entrevista).
 */

import type { PergaminhoFragmento } from "./types";

export const PERGAMINHOS: PergaminhoFragmento[] = [
  {
    id: "perg-01",
    capitulo: 1,
    titulo: "Ficha solta do arquivo",
    fragmento:
      "Uma ficha catalográfica antiga, fora de ordem. Anotação à margem: " +
      "'Todo arquivo decide o que merece ser lembrado. Quem decide o critério?' " +
      "A assinatura está borrada: só se lê 'J.A.'.",
    referenciaId: "ref-arquivo-cidadela",
    pergunta: "Quem era J.A. — e por que essa ficha estava escondida no acervo errado?",
    classificacao: "FICTION",
  },
  {
    id: "perg-02",
    capitulo: 2,
    titulo: "A cidade que observa",
    fragmento:
      "Anotação de estudo: 'Uma cidade saudável se organiza pelo convívio: ruas " +
      "mistas, vizinhos diversos, olhos na calçada. O perigo começa quando alguém " +
      "planeja de cima quem pertence a cada lugar.' Referência marcada: Jane Jacobs.",
    referenciaId: "ref-jane-jacobs",
    pergunta: "Na Cidadela, quem decide quem pertence a cada espaço?",
    classificacao: "SECONDARY_SOURCE",
  },
  {
    id: "perg-03",
    capitulo: 3,
    titulo: "Os que voltaram e os que foram esquecidos",
    fragmento:
      "Recorte de estudo histórico: mais de 25 mil brasileiros combateram na Itália " +
      "pela FEB — Monte Castello, Montese. O documento termina com uma anotação: " +
      "'A memória deles foi preservada, esquecida ou disputada? Depende de quem escreve.'",
    referenciaId: "ref-feb-italia",
    pergunta: "O que faz a memória de um acontecimento sobreviver — ou sumir?",
    classificacao: "HISTORICAL_FACT",
  },
  {
    id: "perg-04",
    capitulo: 4,
    titulo: "Quando a classificação vira regra",
    fragmento:
      "Nota de pesquisa: 'Em 1935, as Leis de Nuremberg transformaram uma ideologia " +
      "em categorias administrativas. Não foi um único decreto: foram centenas, " +
      "acumulados, cada um restringindo um pouco mais. A exclusão virou papelada.'",
    referenciaId: "ref-leis-nuremberg",
    pergunta: "Como regras e formulários podem produzir exclusão sem nunca nomeá-la?",
    classificacao: "HISTORICAL_FACT",
  },
  {
    id: "perg-05",
    capitulo: 4,
    titulo: "A hipótese de J.A.",
    fragmento:
      "Manuscrito atribuído a J.A.: 'Minha hipótese: mecanismos de exclusão que um dia " +
      "usaram biologia explícita podem reaparecer como procedimento, critério, cadastro. " +
      "Não afirmo que sejam o mesmo fenômeno — pergunto quais evidências provariam " +
      "que um padrão voltou sob outra forma.'",
    referenciaId: "ref-tese-john-adrian",
    pergunta: "Isso é uma tese a testar — ou alguém enxergando padrões onde não há?",
    classificacao: "HYPOTHESIS",
  },
  {
    id: "perg-06",
    capitulo: 5,
    titulo: "Invenção, patente e balcão fechado",
    fragmento:
      "Duas fichas lado a lado. Uma sobre Tesla: 'a corrente alternada venceu porque " +
      "funcionava — e porque alguém financiou.' Outra sobre Stanley Meyer: 'alegou um " +
      "motor a água; a justiça chamou de fraude. Nem toda história de gênio sufocado " +
      "é verdade. Como separar descoberta, alegação e evidência?'",
    referenciaId: "ref-stanley-meyer",
    pergunta: "Quando uma instituição rejeita uma ideia, está errada — ou está testando?",
    classificacao: "UNVERIFIED_CLAIM",
  },
  {
    id: "perg-07",
    capitulo: 5,
    titulo: "O mapa dos excluídos",
    fragmento:
      "Um mapa da Cidadela com marcações antigas: áreas onde certas famílias 'não " +
      "cumpriam os critérios de cadastro'. Ao lado, datas e números de portaria. " +
      "Anotação: 'Nenhuma portaria dizia por quê. Só diziam: não atende ao critério.'",
    referenciaId: "ref-arquivo-cidadela",
    pergunta: "Isso é um padrão real do passado da Cidadela — ou uma montagem de J.A.?",
    classificacao: "FICTION",
  },
  {
    id: "perg-08",
    capitulo: 6,
    titulo: "A pergunta final",
    fragmento:
      "Última página do caderno de J.A.: 'Reúna os fragmentos. Pergunte-se: existe " +
      "mesmo um padrão — ou eu montei um com pedaços soltos? A resposta honesta " +
      "importa mais do que a resposta confortável. Assinado: John Adrian, pesquisador.'",
    referenciaId: "ref-tese-john-adrian",
    pergunta: "Existe realmente um padrão? Quais evidências sustentam — e quais contradizem?",
    classificacao: "CHARACTER_INTERPRETATION",
  },
];

export function pergaminhoPorId(id: string): PergaminhoFragmento | null {
  return PERGAMINHOS.find((p) => p.id === id) ?? null;
}

/** Fragmentos de um capítulo (um capítulo pode ter mais de um). */
export function pergaminhosDoCapitulo(capitulo: number): PergaminhoFragmento[] {
  return PERGAMINHOS.filter((p) => p.capitulo === capitulo);
}
