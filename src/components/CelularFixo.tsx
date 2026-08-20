import { useState } from "react";
import { Smartphone, X, MessageSquare, Users, ClipboardList, Store, Bot } from "lucide-react";
import { CelularConversas } from "./botao/career/CelularConversas";
import type { Perfil } from "./botao/online/auth";
import type { CidadelaPerfil } from "./lib/cidadela/profissoes";

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
}: Props) {
  const [aberto, setAberto] = useState(false);

  if (aberto) {
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
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-900" />
      )}
    </button>
  );
}
