/**
 * BibliotecaBRIO - Componente da Biblioteca dos Clássicos
 *
 * #BRIO: Interface da Biblioteca dentro da Cidadela dos Clássicos.
 * Lista livros, permite resumos inteligentes e chat com Bibliotecária IA.
 */

import { useState } from "react";
import { Book, MessageCircle, ArrowLeft, Sparkles } from "lucide-react";
// #BRIO: Importar AIService para gerar resumos e conversar com Bibliotecária
import { AIService } from "@/components/botao/ai/AIService";
import { personagem } from "@/components/botao/career/rpg/personagens";
import type { AIContext } from "@/components/botao/ai/types";

// #BRIO: Interface para Livro (compatível com livros.functions.ts)
interface Livro {
  id: string;
  titulo: string;
  autor?: string;
  descricao?: string;
  categoria?: string;
  imagem_url?: string;
  destaque?: boolean;
  preco?: string;
  link_afiliado?: string;
}

// #BRIO: Props do componente BibliotecaBRIO
interface BibliotecaBRIOProps {
  onBack: () => void;
}

/**
 * Componente BibliotecaBRIO - Interface da Biblioteca dos Clássicos
 */
export function BibliotecaBRIO({ onBack }: BibliotecaBRIOProps) {
  const [livroSelecionado, setLivroSelecionado] = useState<Livro | null>(null);
  const [chatAberto, setChatAberto] = useState(false);
  const [resumoGerado, setResumoGerado] = useState("");
  const [processandoResumo, setProcessandoResumo] = useState(false);
  const [mensagemChat, setMensagemChat] = useState("");
  const [mensagensChat, setMensagensChat] = useState<Array<{ texto: string; remetente: "eu" | "outro" }>>([
    { texto: "Bem-vindo à Biblioteca dos Clássicos. O que deseja saber hoje?", remetente: "outro" },
  ]);
  const [processandoChat, setProcessandoChat] = useState(false);

  // #BRIO: Gerar resumo inteligente com AIService
  const gerarResumo = async (livro: Livro) => {
    setProcessandoResumo(true);
    setResumoGerado("");

    try {
      const contexto: AIContext = {
        livroTitulo: livro.titulo,
        livroAutor: livro.autor,
        categoria: livro.categoria,
        localizacao: "Biblioteca",
      };

      const resumo = await AIService.generateText(contexto, "resumo");
      setResumoGerado(resumo);
    } catch (error) {
      console.error("Erro ao gerar resumo:", error);
      setResumoGerado("Não foi possível gerar o resumo. Tente novamente mais tarde.");
    } finally {
      setProcessandoResumo(false);
    }
  };

  // #BRIO: Enviar mensagem para Bibliotecária com generatePersona
  const enviarMensagem = async () => {
    if (!mensagemChat.trim() || processandoChat) return;

    const novaMensagem = mensagemChat;
    setMensagemChat("");
    setMensagensChat((prev) => [...prev, { texto: novaMensagem, remetente: "eu" }]);
    setProcessandoChat(true);

    try {
      const bibliotecaria = personagem("npc-bibliotecaria");
      const resposta = await AIService.generatePersona(bibliotecaria.systemPrompt, novaMensagem);

      if (resposta) {
        setMensagensChat((prev) => [...prev, { texto: resposta, remetente: "outro" }]);
      } else {
        // Fallback procedural
        setMensagensChat((prev) => [
          ...prev,
          { texto: "A Biblioteca está em manutenção. Volte em breve.", remetente: "outro" },
        ]);
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setMensagensChat((prev) => [
        ...prev,
        { texto: "Erro ao processar mensagem. Tente novamente.", remetente: "outro" },
      ]);
    } finally {
      setProcessandoChat(false);
    }
  };

  // #BRIO: Dados mock de livros (será substituído por livros.functions.ts)
  const livros: Livro[] = [
    {
      id: "1",
      titulo: "A Arte da Guerra",
      autor: "Sun Tzu",
      descricao: "Tratado clássico sobre estratégia militar e tática.",
      categoria: "Estratégia",
      destaque: true,
    },
    {
      id: "2",
      titulo: "Como Fazer Amigos e Influenciar Pessoas",
      autor: "Dale Carnegie",
      descricao: "Guia prático para relacionamentos interpessoais.",
      categoria: "Relacionamentos",
    },
    {
      id: "3",
      titulo: "Pai Rico, Pai Pobre",
      autor: "Robert Kiyosaki",
      descricao: "Educação financeira e mentalidade de investimento.",
      categoria: "Finanças",
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1a1a2e_0%,#0f0f1a_55%)]">
      {/* Header */}
      <header className="p-4 border-b border-border/20">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-4" />
          Voltar para Cidadela
        </button>
        <div className="mt-4">
          <h1 className="texto-marca text-3xl font-black">Biblioteca dos Clássicos</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Livros, resumos inteligentes e a sabedoria da Bibliotecária IA
          </p>
        </div>
      </header>

      {/* Botão de chat com Bibliotecária */}
      <div className="p-4">
        <button
          onClick={() => setChatAberto(true)}
          className="flex items-center gap-2 w-full p-4 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-colors"
        >
          <MessageCircle className="size-5 text-primary" />
          <div className="text-left">
            <p className="font-semibold text-foreground">Conversar com Bibliotecária</p>
            <p className="text-xs text-muted-foreground">Peça recomendações e tire dúvidas</p>
          </div>
        </button>
      </div>

      {/* Lista de livros */}
      <div className="px-4 pb-8">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Livros Disponíveis</h2>
        <div className="grid gap-4">
          {livros.map((livro) => (
            <div
              key={livro.id}
              onClick={() => setLivroSelecionado(livro)}
              className="flex items-start gap-4 p-4 rounded-xl border border-border bg-surface/50 hover:bg-primary/10 hover:border-primary/30 cursor-pointer transition-all"
            >
              <div className="p-3 rounded-lg bg-primary/20 text-primary">
                <Book className="h-6 w-6" />
              </div>
              <div className="flex-1 text-left">
                {livro.destaque && (
                  <span className="inline-block mb-1 text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                    Destaque
                  </span>
                )}
                <h3 className="font-semibold text-foreground">{livro.titulo}</h3>
                {livro.autor && (
                  <p className="text-sm text-muted-foreground">por {livro.autor}</p>
                )}
                {livro.categoria && (
                  <span className="inline-block mt-2 text-xs text-muted-foreground">
                    {livro.categoria}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detalhes do livro */}
      {livroSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">{livroSelecionado.titulo}</h3>
              <button
                onClick={() => setLivroSelecionado(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>
            {livroSelecionado.autor && (
              <p className="text-sm text-muted-foreground mb-2">por {livroSelecionado.autor}</p>
            )}
            {livroSelecionado.descricao && (
              <p className="text-sm text-foreground mb-4">{livroSelecionado.descricao}</p>
            )}
            {livroSelecionado.categoria && (
              <span className="inline-block text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                {livroSelecionado.categoria}
              </span>
            )}
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => gerarResumo(livroSelecionado)}
                disabled={processandoResumo}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processandoResumo ? (
                  <>
                    <Sparkles className="inline-block size-4 animate-spin mr-2" />
                    Gerando...
                  </>
                ) : (
                  "Resumo Inteligente"
                )}
              </button>
              <button
                onClick={() => setLivroSelecionado(null)}
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                Fechar
              </button>
            </div>
            {resumoGerado && (
              <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/30">
                <h4 className="text-sm font-semibold text-foreground mb-2">Resumo</h4>
                <p className="text-sm text-foreground">{resumoGerado}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat com Bibliotecária */}
      {chatAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📚</span>
                <h3 className="text-lg font-semibold text-foreground">Bibliotecária</h3>
              </div>
              <button
                onClick={() => setChatAberto(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="min-h-[200px] max-h-[300px] overflow-y-auto p-4 rounded-lg bg-background/50 mb-4">
              {mensagensChat.map((msg, idx) => (
                <div
                  key={idx}
                  className={`mb-2 p-2 rounded-lg ${
                    msg.remetente === "eu"
                      ? "bg-primary/20 text-foreground ml-8"
                      : "bg-muted text-foreground mr-8"
                  }`}
                >
                  <p className="text-sm">{msg.texto}</p>
                </div>
              ))}
              {processandoChat && (
                <div className="text-sm text-muted-foreground italic">Bibliotecária pensando...</div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={mensagemChat}
                onChange={(e) => setMensagemChat(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && enviarMensagem()}
                placeholder="Digite sua pergunta..."
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                disabled={processandoChat}
              />
              <button
                onClick={enviarMensagem}
                disabled={!mensagemChat.trim() || processandoChat}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
