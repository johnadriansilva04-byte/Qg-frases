import type { DesafioPatrocinador, TipoMetaPatrocinador } from "./types";

/**
 * Patrocinadores fictícios que mandam mensagens no celular do treinador com
 * metas para a próxima partida. Ao atingir a meta, o treinador ganha soberania.
 * Tudo em primeira pessoa, estilo chat/notificação corporativa do clube.
 */
const PATROCINADORES = [
  { 
    nome: "Bebida Esportiva Tão-Tão", 
    prefixo: "aqui é o representante da Tão-Tão",
    cargo: "Gerente de Marketing"
  },
  { 
    nome: "Construtora Alicerce", 
    prefixo: "sou do marketing da Alicerce",
    cargo: "Diretor de Parcerias"
  },
  { 
    nome: "Supermercado Preço Bom", 
    prefixo: "falo pelo Preço Bom",
    cargo: "Coordenador de Marca"
  },
  { 
    nome: "Auto Center Veloz", 
    prefixo: "aquii é o gerente do Veloz",
    cargo: "Gerente Comercial"
  },
  { 
    nome: "Restaurante Sabor de Casa", 
    prefixo: "to ligando do Sabor de Casa",
    cargo: "Proprietário"
  },
  { 
    nome: "Farmácia Bem-Estar", 
    prefixo: "sou da equipe da Bem-Estar",
    cargo: "Gerente de Operações"
  },
];

type ModeloDesafio = {
  meta: TipoMetaPatrocinador;
  alvo?: number;
  recompensa: number;
  mensagem: (prefixo: string, patrocinador: string) => string;
}

const MODELOS: ModeloDesafio[] = [
  {
    meta: "vencer",
    recompensa: 6,
    mensagem: (p, pat) =>
      `${p}, beleza? A ${pat} precisa de uma vitória hoje pra fortalecer a marca no mercado. O pessoal do marketing tá de olho. Vence a partida que a gente te banca com +6 de soberania. Tamo juntos!`,
  },
  {
    meta: "vencer_margem",
    alvo: 2,
    recompensa: 10,
    mensagem: (p, pat) =>
      `${p}, o jogo tá pegando! A diretoria da ${pat} quer ver um espetáculo. Mete uma goleada: vence por 2 gols ou mais que a gente solta +10 de soberania. Bora mostrar serviço!`,
  },
  {
    meta: "gols_feitos",
    alvo: 3,
    recompensa: 8,
    mensagem: (p, pat) =>
      `${p}, o pessoal da ${pat} tá reclamando que o ataque tá morno. Marca 3 gols hoje, não importa o resultado, que a gente libera +8 de soberania. O público quer gols! Manda ver!`,
  },
  {
    meta: "nao_sofrer",
    recompensa: 7,
    mensagem: (p, pat) =>
      `${p}, a diretoria da ${pat} quer uma defesa sólida pra mostrar nos comerciais. Não toma gol hoje (gols contra = 0) e ganha +7 de soberania. Segura a retranca com classe!`,
  },
  {
    meta: "empatar_ou_vencer",
    recompensa: 4,
    mensagem: (p, pat) =>
      `${p}, tô acompanhando de perto em nome da ${pat}. Não perde hoje, empatar ou vencer já tá valendo: +4 de soberania. Não decepciona, hein! A marca precisa de resultados.`,
  },
];

/** Sorteia um novo desafio de patrocinador para a próxima partida. */
export function gerarDesafioPatrocinador(rodada: number): DesafioPatrocinador {
  const pat = PATROCINADORES[Math.floor(Math.random() * PATROCINADORES.length)]!;
  const modelo = MODELOS[Math.floor(Math.random() * MODELOS.length)]!;
  return {
    id: `pat-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    patrocinador: pat.nome,
    mensagem: modelo.mensagem(pat.prefixo, pat.nome),
    meta: modelo.meta,
    alvo: modelo.alvo,
    recompensa: modelo.recompensa,
    rodada,
    concluido: false,
  };
}

/**
 * Avalia se o resultado da partida cumpre a meta do desafio do patrocinador.
 * Retorna true se a meta foi atingida (e o desafio não estava concluído).
 */
export function cumpriuDesafio(
  desafio: DesafioPatrocinador,
  golsPro: number,
  golsContra: number,
): boolean {
  if (desafio.concluido) return false;
  switch (desafio.meta) {
    case "vencer":
      return golsPro > golsContra;
    case "vencer_margem":
      return golsPro - golsContra >= (desafio.alvo ?? 2);
    case "gols_feitos":
      return golsPro >= (desafio.alvo ?? 3);
    case "nao_sofrer":
      return golsContra === 0;
    case "empatar_ou_vencer":
      return golsPro >= golsContra;
    default:
      return false;
  }
}
