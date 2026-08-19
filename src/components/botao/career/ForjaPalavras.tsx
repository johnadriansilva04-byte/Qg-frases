/**
 * ForjaPalavras - Componente da Forja de Palavras
 *
 * #BRIO: Interface da Forja dentro da Cidadela dos Clássicos.
 * Permite gerar textos, corrigir frases e criar conteúdo filosófico com IA.
 */

import { useState } from "react";
import { PenTool, ArrowLeft, Sparkles } from "lucide-react";
// #BRIO: Importar AIService para gerar textos com IA
import { AIService } from "@/components/botao/ai/AIService";
import type { AIContext } from "@/components/botao/ai/types";

// #BRIO: Props do componente ForjaPalavras
interface ForjaPalavrasProps {
  onBack: () => void;
}

/**
 * Componente ForjaPalavras - Interface da Forja de Palavras
 */
export function ForjaPalavras({ onBack }: ForjaPalavrasProps) {
  const [modo, setModo] = useState<"gerar" | "corrigir" | "filosofia">("gerar");
  const [textoOriginal, setTextoOriginal] = useState("");
  const [resultado, setResultado] = useState("");
  const [processando, setProcessando] = useState(false);

  const processarTexto = async () => {
    if (!textoOriginal.trim()) return;

    setProcessando(true);
    setResultado("");

    try {
      // #BRIO: Usar AIService para gerar/corrigir texto
      const contexto: AIContext = {
        textoOriginal,
        tipoGeracao: modo,
        localizacao: "Forja de Palavras",
      };

      let promptType: "forja" | "resumo" | "filosofia" = "forja";
      if (modo === "corrigir") promptType = "resumo";
      if (modo === "filosofia") promptType = "filosofia";

      const resposta = await AIService.generateText(contexto, promptType);
      setResultado(resposta);
    } catch (error) {
      console.error("Erro ao processar texto:", error);
      setResultado("Não foi possível processar o texto. Tente novamente mais tarde.");
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#2a1a1e_0%,#1a0f1a_55%)]">
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
          <h1 className="texto-marca text-3xl font-black">Forja de Palavras</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie textos, corrija frases e inspire-se com a IA
          </p>
        </div>
      </header>

      {/* Seletor de modo */}
      <div className="p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setModo("gerar")}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              modo === "gerar"
                ? "bg-primary text-primary-foreground"
                : "bg-surface/50 text-muted-foreground hover:bg-accent"
            }`}
          >
            Gerar
          </button>
          <button
            onClick={() => setModo("corrigir")}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              modo === "corrigir"
                ? "bg-primary text-primary-foreground"
                : "bg-surface/50 text-muted-foreground hover:bg-accent"
            }`}
          >
            Corrigir
          </button>
          <button
            onClick={() => setModo("filosofia")}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              modo === "filosofia"
                ? "bg-primary text-primary-foreground"
                : "bg-surface/50 text-muted-foreground hover:bg-accent"
            }`}
          >
            Filosofia
          </button>
        </div>
      </div>

      {/* Área de input */}
      <div className="px-4 pb-4">
        <label className="block text-sm font-medium text-foreground mb-2">
          {modo === "corrigir" ? "Cole seu texto aqui..." : "Descreva o que deseja criar..."}
        </label>
        <textarea
          value={textoOriginal}
          onChange={(e) => setTextoOriginal(e.target.value)}
          placeholder={
            modo === "corrigir"
              ? "Cole o texto que deseja corrigir..."
              : modo === "filosofia"
              ? "Digite um tema para reflexão..."
              : "Descreva o tipo de texto que deseja gerar..."
          }
          className="w-full min-h-[150px] p-4 rounded-xl border border-border bg-surface/50 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/50"
        />
      </div>

      {/* Botão de ação */}
      <div className="px-4 pb-4">
        <button
          onClick={processarTexto}
          disabled={!textoOriginal.trim() || processando}
          className="flex items-center justify-center gap-2 w-full p-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {processando ? (
            <>
              <Sparkles className="size-5 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <PenTool className="size-5" />
              {modo === "corrigir" ? "Corrigir Texto" : modo === "filosofia" ? "Gerar Reflexão" : "Gerar Texto"}
            </>
          )}
        </button>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className="px-4 pb-8">
          <div className="p-4 rounded-xl border border-primary/30 bg-primary/10">
            <h3 className="text-sm font-semibold text-foreground mb-2">Resultado</h3>
            <p className="text-sm text-foreground">{resultado}</p>
          </div>
        </div>
      )}
    </div>
  );
}
