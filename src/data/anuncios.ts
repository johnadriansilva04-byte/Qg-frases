/**
 * ANÚNCIOS PESSOAIS (só seus, sem Google).
 * Adicione/edite quantos quiser. Eles aparecem no lugar reservado do site.
 */
export type AnuncioPessoal = {
  titulo: string;
  texto: string;
  botao: string;
  link: string;
  externo?: boolean;
  emoji: string;
};

export const ANUNCIOS_PESSOAIS: AnuncioPessoal[] = [
  {
    emoji: "📚",
    titulo: "Você gosta de ler?",
    texto: "Clique na nossa Biblioteca e adquira um livro que combina com você.",
    botao: "Abrir a Biblioteca",
    link: "/biblioteca",
    externo: false,
  },
  {
    emoji: "💌",
    titulo: "Quer sua marca aqui?",
    texto: "Este espaço é exclusivo para divulgações próprias e parceiros.",
    botao: "Anunciar",
    link: "/biblioteca",
    externo: false,
  },
];
