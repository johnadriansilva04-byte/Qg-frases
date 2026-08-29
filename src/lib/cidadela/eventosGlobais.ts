import type { EventoGlobalAtivo, ProfissaoId } from "./profissoes";

/**
 * Eventos globais da Cidadela (memória do mundo em movimento).
 * Cada evento tem um efeito de leitura por profissão — o mesmo evento
 * dobrado pela lente de cada identidade. Engine puro, rotação semanal.
 */
export const EVENTOS_GLOBAIS: EventoGlobalAtivo[] = [
  {
    id: "crise-financeira",
    titulo: "Crise Financeira na Cidadela",
    descricao:
      "O Banco Central apertou o crédito e o SOV valoriza. Todo mundo repensa o orçamento.",
    efeitos: {
      tecnico: "O clube cortou o orçamento de preparação — resultados renderão mais que nunca.",
      estudante: "A bolsa do Campus foi reavaliada: aguentar o semestre exige criatividade.",
      empresario: "Investimentos travam, mas oportunidades baratas aparecem para quem tem caixa.",
      bibliotecario: "O acervo ganhou importância: quando falta dinheiro, sobra história.",
      pesquisador: "Financiamento suspenso — reescrever o projeto torna o achado mais enxuto.",
    },
  },
  {
    id: "feira-ciencias",
    titulo: "Feira de Ciências do Campus",
    descricao:
      "A programação abre os laboratórios à cidade inteira e provoca a concorrência mais honesta do ano.",
    efeitos: {
      tecnico: "Analistas de dados do clube caçam pesquisas aplicáveis aos treinos.",
      estudante: "Apresentar um projeto pode dobrar sua reputação no Campus.",
      empresario: "Investidores de verdade circulam pelos estandes do evento.",
      bibliotecario: "O acervo abre a sessão de livros raros para os visitantes ilustres.",
      pesquisador: "Sua hipótese finalmente pode chegar a publico (e publicação).",
    },
  },
  {
    id: "escandalo-empresarial",
    titulo: "Escândalo Empresarial",
    descricao:
      "Um grande grupo comercial cai por contratos ocultos. O Cartório da Cidadela está acelerado.",
    efeitos: {
      tecnico: "O clube do rival foi desmontado no escândalo. O campeonato abre.",
      estudante: "Estudar direito empresarial nunca pareceu tão útil.",
      empresario: "Due diligence vira obrigação: contratos opacos queimam reputação agora.",
      bibliotecario: "Os documentos históricos do grupo provam (ou desmentem) tudo.",
      pesquisador: "Auditoria forense contrata pesquisadores de dados — OF.",
    },
  },
];

/** Evento global determinístico da semana corrente. */
export function eventoDaSemana(dataISO: string): EventoGlobalAtivo {
  const semana = semanaDoAno(dataISO);
  return EVENTOS_GLOBAIS[semana % EVENTOS_GLOBAIS.length]!;
}

export function semanaDoAno(dataISO: string): number {
  const d = new Date(`${dataISO.slice(0, 10)}T00:00:00Z`);
  const inicio = new Date(`${dataISO.slice(0, 4)}-01-01T00:00:00Z`);
  return Math.floor((d.getTime() - inicio.getTime()) / 604800000);
}

/** Efeito do evento global sob a lente da profissão do jogador. */
export function efeitoParaProfissao(
  evento: EventoGlobalAtivo,
  profissao: ProfissaoId | null,
): string | null {
  if (!profissao) return null;
  return evento.efeitos[profissao] ?? null;
}

/** Sufixo determinístico da semana para ids de eventos rotativos. */
export function idEventoSemana(dataISO: string): string {
  return `semana-${semanaDoAno(dataISO)}-${eventoDaSemana(dataISO).id}`;
}
