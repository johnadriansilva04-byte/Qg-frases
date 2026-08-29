import { useState } from "react";
import { ArrowLeft, BookOpen, Dna, FlaskConical, GraduationCap, Users } from "lucide-react";

const PASSOS = [
  {
    icone: GraduationCap,
    titulo: "Bem-vindo ao Campus Universitário do Brio",
    texto:
      "Aqui começa sua vida acadêmica na Cidadela. A bolsa cobre o estudo — o resto é com você.",
  },
  {
    icone: BookOpen,
    titulo: "Biblioteca",
    texto:
      "O acervo da Cidadela. Pesquisas, trabalhos e segredos históricos passam por aqui.",
  },
  {
    icone: FlaskConical,
    titulo: "Laboratórios",
    texto: "Experimentos e pesquisas que podem mudar a Cidadela — literalmente.",
  },
  {
    icone: Dna,
    titulo: "Salas de Aula",
    texto: "Aulas, provas e professores que leem além do que você escreve.",
  },
  {
    icone: Users,
    titulo: "Área de Convivência",
    texto: "Grupos, bicos, bar do campus e as relações que decidem seu semestre.",
  },
  {
    icone: GraduationCap,
    titulo: "Sua primeira decisão",
    texto:
      "Nenhum conselho pré-pronto vale: o que você escolher aqui define quem você vira. Começamos agora.",
  },
];

type Props = { onConcluir: () => void };

/** Tour inicial do Estudante — contexto forte, personalidade em branco. */
export function EstudanteTour({ onConcluir }: Props) {
  const [idx, setIdx] = useState(0);
  const passo = PASSOS[idx];
  const Icone = passo?.icone ?? GraduationCap;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <main className="painel w-full max-w-xl rounded-3xl p-6 shadow-2xl md:p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-primary/20 p-3 text-primary">
            <Icone className="h-6 w-6" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Tour do Campus · {idx + 1}/6
          </p>
        </div>
        <h2 className="mb-2 text-xl font-black text-foreground">{passo?.titulo}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{passo?.texto}</p>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5">
            {PASSOS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-6 rounded-full ${i <= idx ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          {idx < PASSOS.length - 1 ? (
            <button
              onClick={() => setIdx(idx + 1)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90"
            >
              Próximo <ArrowLeft className="h-4 w-4 rotate-180" />
            </button>
          ) : (
            <button
              onClick={onConcluir}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-bold text-white transition hover:opacity-90"
            >
              Entrar no Campus
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
