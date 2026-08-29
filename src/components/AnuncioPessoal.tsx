import { Link } from "@tanstack/react-router";
import { ANUNCIOS_PESSOAIS } from "@/data/anuncios";

/** Espaço de anúncio PESSOAL (não é Google). Conteúdo em src/data/anuncios.ts */
export function AnuncioPessoal({ indice = 0 }: { indice?: number }) {
  const a = ANUNCIOS_PESSOAIS[indice % ANUNCIOS_PESSOAIS.length];
  if (!a) return null;

  const conteudo = (
    <>
      <span className="text-2xl">{a.emoji}</span>
      <div className="flex-1 text-left">
        <p className="text-sm font-bold text-foreground">{a.titulo}</p>
        <p className="text-xs text-muted-foreground">{a.texto}</p>
      </div>
      <span className="rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-xs font-bold text-primary-foreground">
        {a.botao}
      </span>
    </>
  );

  const classe =
    "flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-surface/80 p-4 transition hover:border-primary/60";

  return a.externo ? (
    <a href={a.link} target="_blank" rel="noopener noreferrer sponsored" className={classe}>
      {conteudo}
    </a>
  ) : (
    <Link to={a.link} className={classe}>
      {conteudo}
    </Link>
  );
}
