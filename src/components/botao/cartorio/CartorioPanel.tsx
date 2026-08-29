/**
 * Cartório da Cidadela — painel da Biblioteca.
 *
 * O RPG dispara um pedido (cartorio_pedidos) com dados do jogo. Quando o
 * usuário abre a Biblioteca com ?acao=...&pedidoId=..., a Bibliotecária já
 * recebe o contexto preenchido e lavra o documento em cartorio_documentos.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, FileSignature, Loader2, PenLine, ScrollText } from "lucide-react";
import { useBotaoAuth } from "@/components/botao/online/useBotaoAuth";
import { AIService } from "@/components/botao/ai/AIService";
import {
  buscarPedidoCartorio,
  salvarDocumentoCartorio,
  type CartorioTipo,
  type PedidoCartorio,
} from "@/components/botao/career/rpg/cartorioApi";
import { ContratoForm } from "./ContratoForm";
import { PeticaoForm } from "./PeticaoForm";
import {
  CARTORIO_CAMPOS,
  SYSTEM_PROMPT_BIBLIOTECARIA,
  montarDocumentoFallback,
  type CartorioFormContrato,
  type CartorioFormPeticao,
  type CartorioFormMulta,
  type DadosJogo,
} from "./cartorioTypes";

type Etapa = "carregando" | "pronto" | "gerando" | "salvando" | "concluido";

type Props = {
  acao: CartorioTipo;
  pedidoId?: string | undefined;
};

const TITULOS: Record<CartorioTipo, string> = {
  contrato: "Contrato do vínculo do clube",
  peticao: "Petição de defesa do clube",
  multa: "Comprovante de quitação de multa",
};

export function CartorioPanel({ acao, pedidoId }: Props) {
  const { perfil, carregando: carregandoAuth } = useBotaoAuth();
  const [pedido, setPedido] = useState<PedidoCartorio | null>(null);
  const [etapa, setEtapa] = useState<Etapa>("carregando");
  const [texto, setTexto] = useState("");
  const [docId, setDocId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Estado do formulário (por tipo de documento).
  const [contrato, setContrato] = useState<CartorioFormContrato>({
    ...CARTORIO_CAMPOS.contrato,
  });
  const [peticao, setPeticao] = useState<CartorioFormPeticao>({ ...CARTORIO_CAMPOS.peticao });
  const [multa, setMulta] = useState<CartorioFormMulta>({ ...CARTORIO_CAMPOS.multa });

  // Dados reais do jogo lidos do pedido (temporada/time/coach).
  const dadosJogo = useMemo<DadosJogo>(() => {
    if (!pedido) return {};
    return (pedido.dados ?? {}) as DadosJogo;
  }, [pedido]);

  // Pré-preenche o formulário quando o pedido carrega.
  useEffect(() => {
    if (!pedido) return;
    const d = dadosJogo;
    if (acao === "contrato") {
      setContrato((v) => ({
        ...v,
        nomeClube: v.nomeClube || d.timeNome || "Clube do Treinador",
        treinador: v.treinador || d.coach || "Treinador",
        tempo: `Temporada ${d.temporada ?? 1}`,
        valor: v.valor || `${d.valor ?? 50000} SOV`,
      }));
    } else if (acao === "peticao") {
      setPeticao((v) => ({ ...v }));
    } else if (acao === "multa") {
      setMulta((v) => ({
        ...v,
        valor: `${d.valor ?? 30} SOV`,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido?.id]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!pedidoId) {
        setEtapa("pronto");
        return;
      }
      const p = await buscarPedidoCartorio(pedidoId);
      if (!vivo) return;
      if (p && p.status !== "concluido") {
        setPedido(p);
      }
      setEtapa("pronto");
    })();
    return () => {
      vivo = false;
    };
  }, [pedidoId]);

  // Documento gerado é salvo em cartorio_documentos.
  const lavrarDocumento = async () => {
    if (!perfil?.user_id) {
      setErro("Faça login para lavrar o documento no Cartório.");
      return;
    }
    setErro(null);
    setEtapa("salvando");
    const form = acao === "contrato" ? contrato : acao === "peticao" ? peticao : multa;
    const conteudoFinal = texto || montarDocumentoFallback(acao, form, dadosJogo);
    const id = await salvarDocumentoCartorio(
      perfil.user_id,
      pedido?.id ?? null,
      acao,
      TITULOS[acao],
      conteudoFinal,
      {
        formulario: form,
        dadosJogo,
        pedidoId: pedido?.id ?? null,
      },
    );
    if (id) {
      setDocId(id);
      setEtapa("concluido");
    } else {
      setErro("Não foi possível lavrar o documento agora. Tente de novo.");
      setEtapa("pronto");
    }
  };

  // Geração da redação pela Bibliotecária (IA), com fallback procedural.
  const gerarRedacao = async () => {
    setEtapa("gerando");
    setErro(null);
    const form = acao === "contrato" ? contrato : acao === "peticao" ? peticao : multa;
    const userPrompt = [
      `Tipo de documento: ${acao}`,
      `Dados do formulário: ${JSON.stringify(form)}`,
      `Dados do jogo: ${JSON.stringify(dadosJogo)}`,
      "Redija o documento final com tom de cartório da Cidadela.",
    ].join("\n");
    let gerado: string | null = null;
    try {
      gerado = await AIService.generatePersona(SYSTEM_PROMPT_BIBLIOTECARIA, userPrompt);
    } catch {
      gerado = null;
    }
    setTexto(gerado && gerado.trim().length > 10 ? gerado.trim() : montarDocumentoFallback(acao, form, dadosJogo));
    setEtapa("pronto");
  };

  if (carregandoAuth || etapa === "carregando") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface/70 p-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Preparando o Cartório…
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="rounded-2xl border border-border bg-surface/70 p-8 text-center text-sm text-muted-foreground">
        <p>Faça login para lavrar documentos no Cartório da Cidadela.</p>
        <Link to="/cidadela" className="botao-marca mt-4 inline-block rounded-xl px-4 py-2 text-xs font-bold">
          Ir ao jogo e entrar
        </Link>
      </div>
    );
  }

  if (etapa === "concluido") {
    return (
      <div className="rounded-2xl border border-emerald-700/60 bg-emerald-950/30 p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-400" />
        <h2 className="mt-3 text-xl font-black text-emerald-100">Documento lavrado!</h2>
        <p className="mt-2 text-sm text-emerald-200/80">
          O documento foi registrado no Cartório com o selo da Bibliotecária. Você pode
          consultar novamente pelo histórico.
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-widest text-emerald-400/60">
          Registro: {docId?.slice(0, 8)}…
        </p>
        <Link
          to="/cidadela"
          className="mt-4 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
        >
          Voltar ao jogo
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Formulário preenchido com o contexto do jogo */}
      <div className="rounded-2xl border border-border bg-surface/70 p-6">
        <div className="mb-4 flex items-center gap-2">
          <ScrollText className="size-5 text-amber-400" />
          <div>
            <h2 className="text-lg font-black">{TITULOS[acao]}</h2>
            <p className="text-xs text-muted-foreground">
              {pedido
                ? `Pedido: ${pedido.titulo} — dados do jogo pré-preenchidos`
                : "Lavratura livre — preencha os dados"}
            </p>
          </div>
        </div>

        {acao === "contrato" ? (
          <ContratoForm value={contrato} onChange={setContrato} />
        ) : acao === "peticao" ? (
          <PeticaoForm value={peticao} onChange={setPeticao} />
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Motivo</span>
              <input
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={multa.motivo}
                onChange={(e) => setMulta((v) => ({ ...v, motivo: e.target.value }))}
                placeholder="Motivo da multa judicial"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Valor</span>
              <input
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={multa.valor}
                onChange={(e) => setMulta((v) => ({ ...v, valor: e.target.value }))}
                placeholder="Ex.: 30 SOV"
              />
            </label>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={gerarRedacao}
            disabled={etapa === "gerando"}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-500 disabled:opacity-60"
          >
            {etapa === "gerando" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <PenLine className="size-4" />
            )}
            Bibliotecária redige
          </button>
          <button
            onClick={lavrarDocumento}
            disabled={etapa === "salvando"}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {etapa === "salvando" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileSignature className="size-4" />
            )}
            Lavrar documento
          </button>
        </div>
        {erro ? <p className="mt-3 text-xs text-red-400">{erro}</p> : null}
      </div>

      {/* Prévia do documento gerado */}
      <div className="rounded-2xl border border-border bg-surface/70 p-6">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Prévia do documento
        </h3>
        <textarea
          className="h-[320px] w-full resize-none rounded-xl border border-border bg-background p-4 font-mono text-xs leading-relaxed"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Clique em “Bibliotecária redige” para gerar o texto — ou escreva você mesmo."
        />
        <p className="mt-2 text-[10px] text-muted-foreground">
          O texto pode ser editado antes de lavrar. O documento salvo recebe o selo do Cartório.
        </p>
      </div>
    </div>
  );
}
