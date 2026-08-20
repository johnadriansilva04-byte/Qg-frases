import { useState } from "react";
import { Smartphone, X, MessageSquare, Users, ClipboardList, Store, Bot } from "lucide-react";
import { CelularConversas } from "./botao/career/CelularConversas";
import type { Perfil } from "./botao/online/auth";
import type { CidadelaPerfil } from "@/lib/cidadela/profissoes";

type Props = {
  userId?: string | null;
  nomeJogador?: string | null;
  onLogin?: ((perfil: Perfil) => void) | undefined;
  conversas?: any[];
  desafioPatrocinador?: any;
  feed?: any[];
  trilhaMissoes?: any[];
  npcDigitandoId?: string | null;
  onEnviarMensagem?: (conversaId: string, texto: string) => void;
  onExcluirConversa?: (conversaId: string) => void;
  onEscolhaRpg?: (conversaId: string, indice: number) => void;
  perfilCidadela?: CidadelaPerfil | null;
  /** Conteúdo prioritário (ex.: decisão de suborno/narrativa/choice) renderizado
   *  no celular oficial quando aberto — substitui a lista de conversas. */
  prioridade?: React.ReactNode | undefined;
  /** Quantidade de mensagens não lidas (badge da notificação). */
  naoLidas?: number | undefined;
};

export function CelularFixo({
  userId = null,
  nomeJogador = null,
  onLogin,
  conversas = [],
  desafioPatrocinador = null,
  feed = [],
  trilhaMissoes = [],
  npcDigitandoId = null,
  onEnviarMensagem = () => {},
  onExcluirConversa = () => {},
  onEscolhaRpg,
  perfilCidadela = null,
  prioridade,
  naoLidas = 0,
}: Props) {
  const [aberto, setAberto] = useState(false);

  if (aberto) {
    if (prioridade) {
      // Decisão prioritária (ex.: mensagem de suborno/narrativa/choice) — o
      // próprio componente gerencia o "fechar"; quando resolvida, a lista
      // volta a ser o destino (o BotaoGame recalcula `prioridade`).
      return <>{prioridade}</>;
    }
    return (
      <CelularConversas
        conversas={conversas}
        desafioPatrocinador={desafioPatrocinador}
        feed={feed}
        trilhaMissoes={trilhaMissoes}
        npcDigitandoId={npcDigitandoId}
        onEnviarMensagem={onEnviarMensagem}
        onExcluirConversa={onExcluirConversa}
        onEscolhaRpg={onEscolhaRpg}
        onVoltar={() => setAberto(false)}
        userId={userId}
        nomeJogador={nomeJogador}
        onLogin={onLogin}
        perfilCidadela={perfilCidadela}
      />
    );
  }

  return (
    <button
      onClick={() => setAberto(true)}
      className="fixed bottom-4 right-4 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-2xl shadow-emerald-900/50 hover:scale-110 transition-transform active:scale-95 border-2 border-emerald-400/30"
      title="Celular da Cidadela"
    >
      <Smartphone className="w-6 h-6" />
      {userId && (
        <div className="absolute -top-1 -right-1 flex min-w-[20px] items-center justify-center rounded-full border-2 border-slate-900 bg-red-500 px-1">
          {naoLidas > 0 ? (
            <span className="text-[10px] font-black text-white">{naoLidas > 99 ? "99+" : naoLidas}</span>
          ) : (
            <span className="h-2 w-2" />
          )}
        </div>
      )}
    </button>
  );
}
