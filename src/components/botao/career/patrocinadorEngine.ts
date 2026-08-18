import type { DesafioPatrocinador, TipoMetaPatrocinador } from "./types";

/**
 * Patrocinadores fictícios que mandam mensagens no celular do treinador com
 * metas para a próxima partida. Ao atingir a meta, o treinador ganha soberania.
 * Tudo em primeira pessoa, estilo chat/notificação corporativa do clube.
 */
const PATROCINADORES = [
  { nome: "Bebida Esportiva Tão-Tão", prefixo: "aqui é o representante da Tão-Tão" },
  { nome: "Construtora Alicerce", prefixo: "sou do marketing da Alicerce" },
  { nome: "Supermercado Preço Bom", prefixo: "falo pelo Preço Bom" },
  { nome: "Auto Center Veloz", prefixo: "aquii é o gerente do Veloz" },
  { nome: "Restaurante Sabor de Casa", prefixo: "to ligando do Sabor de Casa" },
  { nome: "Farmácia Bem-Estar", prefixo: "sou da equipe da Bem-Estar" },
];

type ModeloDesafio = {
  meta: TipoMetaPatrocinador;
  alvo?: number;
  recompensa: number;
  mensagem: (prefixo: string) => string;
};

const MODELOS: ModeloDesafio[] = [
  {
    meta: "vencer",
    recompensa: 6,
    mensagem: (p) =>
      `${p}, beleza? Precisamos de uma vitória hoje pra fortalecer a marca. Vence a partida que a gente te banca com +6 de soberania. Tamo junto!`,
  },
  {
    meta: "vencer_margem",
    alvo: 2,
    recompensa: 10,
    mensagem: (p) =>
      `${p}, o jogo tá pegando! Mete uma goleada: vence por 2 gols ou mais que a gente solta +10 de soberania pra ti. Bora!`,
  },
  {
    meta: "gols_feitos",
    alvo: 3,
    recompensa: 8,
    mensagem: (p) =>
      `${p}, o pessoal quer ver o ataque funcionando. Marca 3 gols hoje, não importa o resultado, que a gente libera +8 de soberania. Manda ver!`,
  },
  {
    meta: "nao_sofrer",
    recompensa: 7,
    mensagem: (p) =>
      `${p}, a diretoria quer uma defesa sólida. Não toma gol hoje (gols contra = 0) e ganha +7 de soberania. Segura a retranca com classe!`,
  },
  {
    meta: "empatar_ou_vencer",
    recompensa: 4,
    mensagem: (p) =>
      `${p}, tô acompanhando de perto. Não perde hoje, empatar ou vencer já tá valendo: +4 de soberania. Não decepciona, hein!`,
  },
];

/** Sorteia um novo desafio de patrocinador para a próxima partida. */
export function gerarDesafioPatrocinador(rodada: number): DesafioPatrocinador {
  const pat = PATROCINADORES[Math.floor(Math.random() * PATROCINADORES.length)]!;
  const modelo = MODELOS[Math.floor(Math.random() * MODELOS.length)]!;
  return {
    id: `pat-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    patrocinador: pat.nome,
    mensagem: modelo.mensagem(pat.prefixo),
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
