/**
 * useCelularCarreira — fiação ÚNICA do celular central (CelularFixo) fora do
 * BotaoGame: carrega a carreira do Supabase (fonte de verdade), saneia o
 * histórico (normalizarCareer já funde conversas duplicadas legadas) e expõe
 * os MESMOS handlers do Modo Carreira (responder NPC, dilema RPG, excluir).
 *
 * Usado por /cidadela e /campus — nenhuma rota reinventa o celular.
 */
import { useEffect, useState } from "react";
import {
  loadCareerFromSupabase,
  saveCareerToSupabase,
} from "@/components/botao/career/careerRemote";
import {
  aplicarEscolhaRpg,
  garantirContatosRpg,
  responderContatoNpc,
} from "@/components/botao/career/rpg/rpgEngine";
import { eventoPorId } from "@/components/botao/career/rpg/eventos";
import {
  criarPedidoCartorio,
  type CartorioTipo,
} from "@/components/botao/career/rpg/cartorioApi";
import { registrarPosicaoFinal } from "@/components/botao/career/historia/historiaEngine";
import type { PosicaoFinal } from "@/components/botao/career/historia/types";
import { anexarConversa } from "@/components/botao/career/conversasEngine";
import type { CareerState } from "@/components/botao/career/types";
import type { Perfil } from "@/components/botao/online/auth";
import { obterSaldoSov, registrarTransacaoSov } from "@/lib/financial/sovApi";

export function useCelularCarreira(userId: string | null, perfil?: Perfil | null) {
  const [career, setCareer] = useState<CareerState | null>(null);
  // Saldo REAL de SOV (user_wallets via bank_ledger) — barra de status do
  // celular também fora do Modo Carreira (/cidadela, /campus).
  const [saldoSovRemoto, setSaldoSovRemoto] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) {
      setCareer(null);
      return;
    }
    let vivo = true;
    loadCareerFromSupabase(userId)
      .then((c) => {
        // Sem carreira = celular vazio (normal para novos usuários).
        if (vivo && c) setCareer(garantirContatosRpg(c));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setSaldoSovRemoto(null);
      return;
    }
    let vivo = true;
    void obterSaldoSov(userId).then((s) => {
      if (vivo && s != null) setSaldoSovRemoto(s);
    });
    return () => {
      vivo = false;
    };
  }, [userId, career?.coach.sov]);

  // "Seu SOV" = dinheiro PESSOAL: com carreira, o snapshot é a fonte da
  // divisão pessoal×caixa (o remoto é o TOTAL da carteira — pessoal +
  // caixa do clube — e inflaria o valor pessoal). Sem carreira, o remoto
  // é o único saldo existente.
  const saldoSov = career?.coach.sov ?? saldoSovRemoto ?? null;

  const persist = (c: CareerState) => {
    setCareer(c);
    if (userId) void saveCareerToSupabase(userId, c).catch(() => {});
  };

  const onEnviarMensagem = (conversaId: string, texto: string) => {
    if (!career) return;
    const timestamp = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const novo: CareerState = {
      ...career,
      conversas: career.conversas.map((conv) =>
        conv.id === conversaId
          ? {
              ...conv,
              mensagens: [
                ...conv.mensagens,
                { id: `msg-${Date.now()}`, texto, remetente: "eu" as const, timestamp },
              ],
              naoLida: false,
            }
          : conv,
      ),
    };
    persist(novo);
    // NPC responde em tempo real (LLM local → fallback procedural).
    if (career.conversas.find((c) => c.id === conversaId)?.npcId) {
      void responderContatoNpc(novo, conversaId, texto).then(persist).catch(() => {});
    }
  };

  const onEscolhaRpg = (conversaId: string, indice: number) => {
    if (!career) return;
    const comEscolha = aplicarEscolhaRpg(career, conversaId, indice);
    persist(comEscolha.career);

    // Mesmas integrações externas do BotaoGame: SOV no Banco Central e
    // pedido no Cartório — a escolha RPG NÃO muda de comportamento conforme
    // o lugar onde o celular abre (/cidadela, /campus, partida).
    const conversa = career.conversas.find((c) => c.id === conversaId);
    const evento = conversa?.eventoRpg ? eventoPorId(conversa.eventoRpg.eventoId) : undefined;
    const efeitos = evento?.escolhas[indice]?.efeitos;
    if (evento && efeitos?.sov && userId) {
      void registrarTransacaoSov(
        userId,
        efeitos.sov,
        efeitos.sov >= 0 ? "reward" : "penalty",
        `RPG: ${evento.titulo} — "${efeitos.sov >= 0 ? "ganho" : "custo"} de SOV"`,
        "rpg",
        { eventoId: evento.id, escolha: indice, titulo: evento.titulo },
      );
    }
    if (evento && efeitos?.cartorio && userId) {
      const { tipo, titulo } = efeitos.cartorio;
      void (async () => {
        const dados = {
          eventoId: evento.id,
          temporada: comEscolha.career.temporada ?? 1,
          rodada: comEscolha.career.rodadaAtual,
          timeId: perfil?.time_personalizado ?? "Cidadela",
          timeNome: perfil?.time_personalizado ?? "Cidadela",
          coach: comEscolha.career.coach.nome,
          sov: comEscolha.career.coach.sov,
        };
        const pedidoId = await criarPedidoCartorio(userId, tipo as CartorioTipo, titulo, dados);
        const link = `/biblioteca?acao=${tipo}&pedidoId=${pedidoId ?? ""}`;
        setCareer((atual) => {
          if (!atual) return atual;
          const novo: CareerState = {
            ...atual,
            conversas: atual.conversas.map((cv) =>
              cv.id === conversaId ? { ...cv, linkCartorio: link } : cv,
            ),
          };
          if (userId) void saveCareerToSupabase(userId, novo).catch(() => {});
          return novo;
        });
      })();
    }
  };

  const onExcluirConversa = (conversaId: string) => {
    if (!career) return;
    persist({ ...career, conversas: career.conversas.filter((c) => c.id !== conversaId) });
  };

  // Desfecho da História (§29/§30): idempotente por usuário (posicaoFinal
  // única) — entrega conversas na hora (com anexarConversa, como a fila).
  const onRegistrarPosicao = (posicao: PosicaoFinal) => {
    if (!career) return;
    const res = registrarPosicaoFinal(career, posicao);
    if (res.recompensaSov === 0) return;
    const c = res.conversas.reduce((acc, conv) => anexarConversa(acc, conv), res.career);
    persist(c);
    if (userId) {
      void registrarTransacaoSov(
        userId,
        res.recompensaSov,
        "reward",
        "Recompensa de investigação",
        "career",
        { posicao },
        // Mesma chave do BotaoGame: clicar nas duas telas não paga duas vezes.
        { sourceEvent: "investigacao", idempotencyKey: `historia:desfecho:${userId}` },
      );
    }
  };

  return {
    career,
    saldoSov,
    onEnviarMensagem,
    onEscolhaRpg,
    onExcluirConversa,
    onRegistrarPosicao,
  };
}
