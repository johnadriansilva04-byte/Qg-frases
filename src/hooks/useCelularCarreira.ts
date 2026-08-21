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
import type { CareerState } from "@/components/botao/career/types";

export function useCelularCarreira(userId: string | null) {
  const [career, setCareer] = useState<CareerState | null>(null);

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
    persist(aplicarEscolhaRpg(career, conversaId, indice).career);
  };

  const onExcluirConversa = (conversaId: string) => {
    if (!career) return;
    persist({ ...career, conversas: career.conversas.filter((c) => c.id !== conversaId) });
  };

  return { career, onEnviarMensagem, onEscolhaRpg, onExcluirConversa };
}
