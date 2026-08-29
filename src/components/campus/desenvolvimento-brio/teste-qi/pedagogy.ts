/**
 * Camada pedagógica — o módulo é uma ferramenta de letramento cognitivo e
 * conscientização, NÃO um instrumento de laudo de QI. Em vez de notas frias,
 * cada problema vem acompanhado de explicações sobre as regras ocultas,
 * para que o usuário aprenda o padrão depois de tentar.
 */
import type { GeneratedProblem, MatrixRule, RuleAttr, RuleName } from './types';

export interface RuleExplanation {
  rule: MatrixRule;
  titulo: string;
  explicacao: string;
  dica: string;
}

const ATTR_PT: Record<RuleAttr, string> = {
  Number: 'quantidade de elementos',
  Position: 'posição dos elementos',
  'Number/Position': 'quantidade/posição dos elementos',
  Type: 'forma geométrica',
  Size: 'tamanho',
  Color: 'cor (tons de cinza)',
};

const RULE_PT: Record<RuleName, string> = {
  Constant: 'Constância',
  Progression: 'Progressão',
  Arithmetic: 'Operação entre painéis',
  Distribute_Three: 'Distribuição de três valores',
};

export function explainRule(rule: MatrixRule): RuleExplanation {
  const attr = ATTR_PT[rule.attr];
  const titulo = `${RULE_PT[rule.name]} — ${attr}`;
  switch (rule.name) {
    case 'Constant':
      return {
        rule, titulo,
        explicacao: `A ${attr} permanece inalterada ao longo de cada linha da matriz.`,
        dica: 'Nem todo atributo muda. Identifique primeiro o que permanece igual — isso elimina distratores.',
      };
    case 'Progression': {
      const passo = Math.abs(rule.value);
      const direcao = rule.attr === 'Position'
        ? 'os elementos avançam pelas posições do painel'
        : `o atributo ${rule.value > 0 ? 'aumenta' : 'diminui'} ${passo} nível(is) por painel`;
      return {
        rule, titulo,
        explicacao: `A ${attr} progride de forma constante: ${direcao}, a cada painel da linha.`,
        dica: 'Compare o 1º com o 2º painel da linha e depois o 2º com o 3º. Se a variação for sempre igual, é uma progressão.',
      };
    }
    case 'Arithmetic': {
      const explicacao = rule.attr === 'Position'
        ? (rule.value > 0
          ? 'As posições do 3º painel são a UNIÃO (OU lógico) das posições dos dois primeiros painéis da linha.'
          : 'As posições do 3º painel são a DIFERENÇA entre as posições do 1º e do 2º painel da linha (semelhante a um XOR de conjuntos).')
        : `O 3º painel da linha combina os dois primeiros: ${rule.value > 0 ? 'soma' : 'subtração'} dos níveis de ${attr}.`;
      return {
        rule, titulo,
        explicacao,
        dica: 'Verifique se o 3º painel é uma combinação dos dois anteriores: some/subtraia quantidades ou sobreponha posições.',
      };
    }
    case 'Distribute_Three':
      return {
        rule, titulo,
        explicacao: `Três valores distintos de ${attr} se distribuem, sem repetição, pelas três células de cada linha — cada valor aparece exatamente uma vez por linha.`,
        dica: 'Procure o valor que ainda não apareceu na linha: é ele que completa o conjunto de três.',
      };
  }
}

/** Explicações de todas as regras ativas de um problema (pós-resposta). */
export function explainProblem(problem: GeneratedProblem): RuleExplanation[] {
  return problem.rules.map(explainRule);
}

/** Mensagem de abertura reforçando o caráter educativo (sem laudo). */
export const EDUCATIONAL_DISCLAIMER =
  'Este é um exercício de raciocínio lógico para treino e conscientização. ' +
  'Ele não mede nem certifica QI. Cada acerto rende SALVE ($SOVEREIGN) — ' +
  'e cada erro vem com uma explicação para você aprender o padrão.';
