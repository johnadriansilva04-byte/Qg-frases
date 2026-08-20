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

  if (!aberto) {
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-stretch overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto w-full max-w-md flex-1 p-3 md:py-6">
        {/* Cabeçalho do celular (fechar volta à Cidadela/carreira) */}
        <div className="mb-2 flex items-center justify-between rounded-2xl border border-slate-700/60 bg-slate-900/70 px-4 py-2">
          <div className="flex items-center gap-2 text-slate-300">
            <Smartphone className="size-4 text-emerald-300" />
            <span className="text-xs font-bold uppercase tracking-widest">Celular da Cidadela</span>
          </div>
          <button
            onClick={() => setAberto(false)}
            className="flex items-center gap-1 rounded-lg bg-slate-800/80 px-2 py-1 text-[10px] font-bold text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            <X className="size-3" />
            Fechar
          </button>
        </div>

        {prioridade ? (
          // Decisão prioritária (ex.: suborno/narrativa/choice) — auto-gerencia
          // seu próprio "fechar"; quando resolvida o BotaoGame recalcula a
          // prop e a lista de conversas volta a ser o destino.
          <div className="h-full">{prioridade}</div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
