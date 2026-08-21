import { useState } from "react";
import { Smartphone, X, MessageSquare, Users, ClipboardList, Store, Bot } from "lucide-react";
import { CelularConversas } from "./botao/career/CelularConversas";
import type { Perfil } from "./botao/online/auth";
import type { CidadelaPerfil } from "@/lib/cidadela/profissoes";
import { useTempoCidadao } from "@/lib/cidadela/tempoCidadao";
import { tocarSom } from "@/lib/notificacao";
import { useNotificacaoGrupo, type UltimaMensagemGrupo } from "@/lib/cidadela/grupoCidadao";

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
  /** História principal (John Adrian) — alimenta o app Arquivo do celular. */
  historia?: import("./botao/career/historia/types").HistoriaState | undefined;
  /** Registra a posição final do primeiro arco da história (desfecho). */
  onRegistrarPosicao?:
    | ((posicao: import("./botao/career/historia/types").PosicaoFinal) => void)
    | undefined;
  /** Conteúdo prioritário (ex.: decisão de suborno/narrativa/choice) renderizado
   *  no celular oficial quando aberto — substitui a lista de conversas. */
  prioridade?: React.ReactNode | undefined;
  /** Quantidade de mensagens não lidas (badge da notificação). */
  naoLidas?: number | undefined;
  /** Stats da carreira exibidos no Perfil (decisões/entrevistas reais). */
  statsCarreira?: { decisoes: number; entrevistas: number } | undefined;
  /** Saldo REAL de SOV (user_wallets via bank_ledger) — barra de status. */
  saldoSov?: number | null | undefined;
  /** Bolsa (carreira) — resumo apenas-leitura na aba Banco do celular. */
  bolsa?: import("./botao/career/types").BolsaState | undefined;
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
  historia,
  onRegistrarPosicao,
  prioridade,
  naoLidas = 0,
  statsCarreira,
  saldoSov = null,
  bolsa,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [recompensaTempo, setRecompensaTempo] = useState<number | null>(null);

  // Presença real + Tempo de Cidadão: heartbeat 1x/min com a aba visível,
  // líder entre abas, recompensa por hora via SOV Bank (idempotente).
  useTempoCidadao(userId, (horasPagas) => {
    if (horasPagas <= 0) return;
    tocarSom("recompensa");
    setRecompensaTempo(horasPagas);
    window.setTimeout(() => setRecompensaTempo(null), 5000);
  });

  // Grupo Cidadela (§7): nova mensagem → som de mensagem + notificação
  // clicável que abre o celular já no Grupo. Só quando o celular está
  // fechado (aberto, o usuário já está olhando o app).
  const [novaMsgGrupo, setNovaMsgGrupo] = useState<UltimaMensagemGrupo | null>(null);
  const [irAoGrupo, setIrAoGrupo] = useState<"grupo" | null>(null);
  useNotificacaoGrupo(userId ?? null, Boolean(userId) && !aberto, (msg) => {
    tocarSom("mensagem");
    setNovaMsgGrupo(msg);
    window.setTimeout(() => setNovaMsgGrupo((atual) => (atual?.id === msg.id ? null : atual)), 8000);
  });

  if (!aberto) {
    return (
      <>
        {/* Notificação clicável: nova mensagem no Grupo Cidadela (§7). */}
        {novaMsgGrupo && (
          <button
            onClick={() => {
              setIrAoGrupo("grupo");
              setNovaMsgGrupo(null);
              setAberto(true);
            }}
            className="fixed bottom-20 right-4 z-50 max-w-[240px] rounded-xl border border-emerald-500/40 bg-slate-900/95 px-3 py-2 text-left shadow-xl"
          >
            <p className="text-xs font-black text-emerald-300">💬 Nova mensagem no Grupo Cidadela</p>
            <p className="mt-0.5 truncate text-[10px] text-slate-400">
              {novaMsgGrupo.sender_nome}: {novaMsgGrupo.texto}
            </p>
          </button>
        )}
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
        {/* Recompensa por Tempo de Cidadão (1h = +10 SOV via SOV Bank). */}
        {recompensaTempo != null && recompensaTempo > 0 && (
          <div className="fixed bottom-20 right-4 z-50 rounded-xl border border-amber-500/40 bg-slate-900/95 px-3 py-2 shadow-xl">
            <p className="text-xs font-black text-amber-300">💰 +{recompensaTempo * 10} SOV</p>
            <p className="text-[10px] text-slate-400">
              Tempo de Cidadão · {recompensaTempo}h concluída{recompensaTempo > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </button>
      </>
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
            onClick={() => {
              setIrAoGrupo(null);
              setAberto(false);
            }}
            className="flex items-center gap-1 rounded-lg bg-slate-800/80 px-2 py-1 text-[10px] font-bold text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            <X className="size-3" />
            Fechar
          </button>
        </div>

        {/* Recompensa por Tempo de Cidadão com o celular aberto. */}
        {recompensaTempo != null && recompensaTempo > 0 && (
          <div className="mb-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center">
            <p className="text-xs font-black text-amber-300">
              💰 +{recompensaTempo * 10} SOV — Tempo de Cidadão
            </p>
          </div>
        )}

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
            historia={historia}
            onRegistrarPosicao={onRegistrarPosicao}
            statsCarreira={statsCarreira}
            abaInicial={irAoGrupo}
            saldoSov={saldoSov}
            bolsa={bolsa}
          />
        )}
      </div>
    </div>
  );
}
