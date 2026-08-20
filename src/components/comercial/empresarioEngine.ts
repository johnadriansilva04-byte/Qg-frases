import type { Atividade, EstudanteState } from "@/components/campus/types";
import { novoEstudante, normalizarEstudante } from "@/components/campus/atividadesEngine";

/**
 * Pauta inicial do Empresário — dilemas de negócio com trade-offs
 * (lucro contra ética/relacionamento). Engine puro.
 */
export const NEGOCIOS_INICIAIS: Atividade[] = [
  {
    id: "neg-clausula-oculta",
    tipo: "trabalho",
    area: "comercial",
    titulo: "Contrato com cláusula esquisita",
    descricao:
      "Um patrocinador oferece 80 SOV pelo naming do estádio — com uma cláusula que deixa o nome dele acima do time.",
    dificuldade: 3,
    prerequisitos: [],
    opcoes: [
      {
        texto: "Assinar: dinheiro agora, problemas depois",
        desfecho:
          "O caixa agradece; a torcida abre um processo. O Cartório da Cidadela te acionou.",
        efeitos: { sov: 80, reputacao: -8, traco: "pragmatico" },
      },
      {
        texto: "Renegociar até limpar a cláusula de nome",
        desfecho: "Contrato de 30 SOV e dormência de consciência.",
        efeitos: { sov: 30, reputacao: 6, traco: "diligente" },
      },
      {
        texto: "Recusar e expor o contrato no Portal de Notícias",
        desfecho: "Sua fama de honesto rende clientes decentes — com menos pipocagem.",
        efeitos: { reputacao: 8, traco: "solidario" },
      },
    ],
  },
  {
    id: "neg-socio-impaciente",
    tipo: "trabalho",
    area: "comercial",
    titulo: "Sócio impaciente na porta",
    descricao:
      "Seu sócio exige demitir o técnico do clube da empresa para 'virar a página' antes do conselho de amanhã.",
    dificuldade: 4,
    prerequisitos: [],
    opcoes: [
      {
        texto: "Demitir o técnico publicamente",
        desfecho: "O sócio aplaude; o mercado de treinadores te marca como carrasco.",
        efeitos: { sov: 15, reputacao: -6, traco: "arriscado" },
      },
      {
        texto: "Segurar a barra do técnico",
        desfecho: "O técnico vence o próximo risco. O sócio reduziu seu percentual.",
        efeitos: { reputacao: 5, traco: "solidario" },
      },
      {
        texto: "Propor uma saída com multa pré-programada",
        desfecho: "Quartos organizados: técnico sai com dignidade, você sai com comissão.",
        efeitos: { sov: 20, reputacao: 2, traco: "pragmatico" },
      },
    ],
  },
  {
    id: "neg-jogador-promessa",
    tipo: "trabalho",
    area: "comercial",
    titulo: "Investimento na promessa da base",
    descricao:
      "Um garoto de 16 anos desponta no campeonato de aspirantes. O empresário rival oferece 50% dos direitos por 25 SOV.",
    dificuldade: 3,
    prerequisitos: [],
    opcoes: [
      {
        texto: "Comprar a fatia do rival",
        desfecho:
          "Se o moleque explodir, foi o negócio da década. Se não, você comprou um sonho vazio.",
        efeitos: { sov: -25, reputacao: 4, traco: "arriscado" },
      },
      {
        texto: "Dobrar o jogo e assinar diretamente com a família",
        desfecho: "O rival te processa no Cartório; a família gostou da honestidade.",
        efeitos: { sov: -10, reputacao: 5, traco: "malandro" },
      },
      {
        texto: "Ignorar — estudar primeiro e investir depois",
        desfecho: "Prudência insegura: quando decidir, o preço pode explodir.",
        efeitos: { reputacao: 1, traco: "pragmatico" },
      },
    ],
  },
];

export function novoEmpresario(): EstudanteState {
  const base = novoEstudante("empresario");
  return { ...base, atividades: NEGOCIOS_INICIAIS, tourConcluido: true };
}

export function normalizarEmpresario(raw: unknown): EstudanteState {
  const parcial = raw as Partial<EstudanteState> | null;
  if (!parcial || !Array.isArray(parcial.atividades)) return novoEmpresario();
  return normalizarEstudante(raw);
}
