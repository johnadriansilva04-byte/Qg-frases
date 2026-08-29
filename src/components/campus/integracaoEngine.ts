import type { Atividade } from "./types";

/**
 * Atividades inter-profissionais do Campus: conectam o Estudante a outras
 * identidades da Cidadela (Técnico, Bibliotecário, Empresário, Pesquisador).
 * Rotação diária determinística pelo ISO do dia — engine puro, sem I/O.
 */

type ProfissaoKey = "tecnico" | "estudante" | "empresario" | "bibliotecario" | "pesquisador";

interface DefinicaoIntegracao {
  requer: ProfissaoKey[];
  atividade: Omit<Atividade, "id" | "prerequisitos">;
}

const INTEGRACOES: DefinicaoIntegracao[] = [
  {
    requer: ["tecnico"],
    atividade: {
      tipo: "pesquisa",
      area: "biblioteca",
      titulo: "Estágio no Clube: Souto adversário",
      descricao:
        "O treinador do clube precisa de um relatório sobre o próximo adversário até o fim da tarde. Público do estádio agradece.",
      dificuldade: 2,
      opcoes: [
        {
          texto: "Levantar histórico completo, jogo a jogo",
          desfecho:
            "O treinador usou seu dossiê no treino fechado. A comissão te elogia no rádio do clube.",
          efeitos: { sov: 6, reputacao: 5, traco: "diligente" },
        },
        {
          texto: "Resumir só as últimas 3 partidas",
          desfecho: "Material útil, mas incompleto. O clube ganhou mesmo assim.",
          efeitos: { sov: 3, reputacao: 2, traco: "pragmatico" },
        },
      ],
    },
  },
  {
    requer: ["bibliotecario"],
    atividade: {
      tipo: "pesquisa",
      area: "biblioteca",
      titulo: "Catalogação Colaborativa com a Biblioteca",
      descricao:
        "O bibliotecário abriu o acervo reservado para você catalogar documentos históricos sobre a Cidadela.",
      dificuldade: 2,
      opcoes: [
        {
          texto: "Catalogar e descobrir um segredo do acervo",
          desfecho:
            "Entre os volumes, um contrato histórico da fundação do clube muda o que todos sabiam.",
          efeitos: { sov: 4, reputacao: 5, traco: "diligente" },
        },
        {
          texto: "Catalogar e vender a achado primeiro",
          desfecho: "Dinheiro rápido do caderno. A Biblioteca nunca mais te chama.",
          efeitos: { sov: 10, reputacao: -4, traco: "malandro" },
        },
      ],
    },
  },
  {
    requer: ["pesquisador"],
    atividade: {
      tipo: "experimento",
      area: "laboratorio",
      titulo: "Assistente de Laboratório: Teste de Eficiência",
      descricao:
        "O pesquisador do Campus te recruta para a coleta de dados de um experimento que pode mudar treinos do clube.",
      dificuldade: 3,
      opcoes: [
        {
          texto: "Coletar com método rigoroso",
          desfecho: "Os dados publicam e levam seu nome de assistente.",
          efeitos: { sov: 5, reputacao: 6, traco: "diligente" },
        },
        {
          texto: "Apontar um dado surpreendente e publicar cedo",
          desfecho: "A descoberta corre o Campus — e entra para a memória do mundo.",
          efeitos: { sov: 8, reputacao: 4, traco: "arriscado" },
        },
      ],
    },
  },
  {
    requer: ["empresario"],
    atividade: {
      tipo: "trabalho",
      area: "comercial",
      titulo: "Estágio no Setor Comercial",
      descricao:
        "Um empresário da Praça paga para você analisar um balanço apertado enquanto estuda para a prova.",
      dificuldade: 3,
      opcoes: [
        {
          texto: "Fazer o balanço com rigor e perder o estudo",
          desfecho: "O empresário paga bem e te convida para a próxima.",
          efeitos: { sov: 12, nota: -5, traco: "pragmatico" },
        },
        {
          texto: "Devolver avisando que não dá conta honesta",
          desfecho: "O empresário respeita a ética. Guarda sua lista de contatos.",
          efeitos: { reputacao: 4, traco: "diligente" },
        },
      ],
    },
  },
  {
    requer: [],
    atividade: {
      tipo: "trabalho",
      area: "convivencia",
      titulo: "Bar do Campus: turno extra",
      descricao: "O dono do bar precisa de alguém hoje. Trampo honesto, gorjeta possível.",
      dificuldade: 1,
      opcoes: [
        {
          texto: "Encarar o turno",
          desfecho: "SOV garantido e histórias novas do balcão.",
          efeitos: { sov: 5, traco: "pragmatico" },
        },
        {
          texto: "Encarar e fazer networking com os clientes",
          desfecho: "Você sai do turno com contatos melhores que o salário.",
          efeitos: { sov: 3, reputacao: 3, traco: "solidario" },
        },
      ],
    },
  },
];

function hashDia(dataISO: string): number {
  let h = 0;
  for (let i = 0; i < dataISO.length; i++) h = (h * 31 + dataISO.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Atividades do dia para um Estudante. Inclui todas as integrações cujas
 * profissões exigidas estão desbloqueadas + a rotina neutra, até 3 por dia.
 * IDs ganham sufixo do dia para permitir repetição diária.
 */
export function atividadesIntegracao(
  profissoesDesbloqueadas: ProfissaoKey[],
  dataISO: string,
): Atividade[] {
  const eleg = INTEGRACOES.filter((def) =>
    def.requer.every((r) => profissoesDesbloqueadas.includes(r)),
  );
  if (eleg.length === 0) return [];
  const inicio = hashDia(dataISO) % eleg.length;
  const quantidade = Math.min(3, eleg.length);
  const picked: Atividade[] = [];
  for (let i = 0; i < quantidade; i++) {
    const def = eleg[(inicio + i) % eleg.length]!;
    picked.push({
      ...def.atividade,
      id: `integracao-${dataISO}-${def.atividade.titulo.slice(0, 12)}`,
      prerequisitos: [],
    });
  }
  return picked;
}

/** Junta atividades fixas pendentes com as integrativas do dia. */
export function atividadesDoDia(
  fixas: Atividade[],
  profissoes: ProfissaoKey[],
  dataISO: string,
  concluidasIds: Set<string>,
): Atividade[] {
  const integrativas = atividadesIntegracao(profissoes, dataISO).filter(
    (a) => !concluidasIds.has(a.id),
  );
  return [...integrativas, ...fixas];
}
