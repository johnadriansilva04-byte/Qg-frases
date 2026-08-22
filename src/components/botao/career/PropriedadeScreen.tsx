/**
 * TELA DE PROPRIEDADE DE CLUBES
 * 
 * Interface para compra/venda de participações em clubes da Cidadela.
 * Permite a progressão: Técnico → Reputação → Patrimônio → Cotas → Proprietário → Múltiplos Clubes
 */

import { useEffect, useState } from "react";
import { Building2, TrendingUp, Crown, PieChart, Handshake, UserPlus } from "lucide-react";
import { TEAMS, type Team } from "../data/teams";
import type { CareerState } from "./types";
import {
  precoCotaClube,
  precoClubeInteiro,
  participacaoAtual,
  eProprietario,
  patrimonioParticipacoes,
  listarClubesProprietario,
} from "./propriedadeEngine";
import {
  mapaDonosClubes,
  listarPropostasClubes,
  enviarPropostaClube,
  responderPropostaClube,
  type DonoClube,
  type PropostaClube,
} from "@/lib/cidadela/clubesPropriedade";
import { listarMembrosGrupo, type MembroGrupo } from "@/lib/cidadela/grupoCidadao";

type Props = {
  career: CareerState;
  /** Usuário autenticado (necessário para donos/propostas na Cidadela). */
  userId: string | null;
  onBack: () => void;
  onComprarCota: (clube: Team, porcentagem: number) => void;
  onVenderCota: (clube: Team, porcentagem: number) => void;
  /** O servidor reconhece o usuário como dono do clube (ex.: proposta aceita)
   *  mas a carreira ainda não marca 100% — o chamador sincroniza as cotas. */
  onDonoServidor?: ((clubeId: string) => void) | undefined;
  /** O usuário vendeu o clube via proposta aceita (SOV já movido no ledger
   *  pela RPC) — o chamador zera a participação local SEM nova transação. */
  onPerdeuClube?: ((clubeId: string) => void) | undefined;
};

export function PropriedadeScreen({
  career,
  userId,
  onBack,
  onComprarCota,
  onVenderCota,
  onDonoServidor,
  onPerdeuClube,
}: Props) {
  const [clubeSelecionado, setClubeSelecionado] = useState<Team | null>(null);
  const [modo, setModo] = useState<"comprar" | "vender" | null>(null);
  const [porcentagem, setPorcentagem] = useState<number>(10);
  // Donos reconhecidos pela Cidadela inteira (null = erro de leitura — a UI
  // não assume "sem dono" nesse caso).
  const [donos, setDonos] = useState<Map<string, DonoClube> | null>(null);
  const [propostas, setPropostas] = useState<PropostaClube[] | null>(null);
  const [membros, setMembros] = useState<MembroGrupo[]>([]);
  const [propTipo, setPropTipo] = useState<"compra" | "treinador">("compra");
  const [propClubeId, setPropClubeId] = useState("");
  const [propPara, setPropPara] = useState("");
  const [propValor, setPropValor] = useState(100);
  const [propMsg, setPropMsg] = useState<string | null>(null);
  const [propEnviando, setPropEnviando] = useState(false);

  const clubesProprietario = listarClubesProprietario(career);
  const patrimonioTotal = patrimonioParticipacoes(career);
  const souProprietario = clubesProprietario.some((p) => p.participacao >= 100);

  useEffect(() => {
    if (!userId) return;
    let vivo = true;
    void (async () => {
      const [mapa, lista] = await Promise.all([mapaDonosClubes(), listarPropostasClubes()]);
      if (!vivo) return;
      setDonos(mapa);
      setPropostas(lista);
      // Aquisição via proposta aceita: o servidor já me reconhece como dono,
      // sincroniza a carreira (uma vez por clube — o chamador é idempotente).
      if (mapa && onDonoServidor) {
        for (const [clubeId, dono] of mapa) {
          if (dono.donoUserId === userId && participacaoAtual(career, clubeId) < 100) {
            onDonoServidor(clubeId);
          }
        }
      }
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Lista de cidadãos só é necessária para contratar treinador.
  useEffect(() => {
    if (!userId || !souProprietario || propTipo !== "treinador" || membros.length > 0) return;
    let vivo = true;
    void listarMembrosGrupo().then((m) => {
      if (vivo) setMembros(m.filter((x) => x.user_id !== userId));
    });
    return () => {
      vivo = false;
    };
  }, [userId, souProprietario, propTipo, membros.length]);

  const clubesDeOutros = TEAMS.filter((t) => {
    const dono = donos?.get(t.id);
    return dono && dono.donoUserId !== userId;
  });
  const meusClubesDono = TEAMS.filter((t) => donos?.get(t.id)?.donoUserId === userId);
  const clubesProposta = propTipo === "compra" ? clubesDeOutros : meusClubesDono;
  const donoDoClubeProposta = propClubeId ? donos?.get(propClubeId) : undefined;

  const enviarProposta = async () => {
    if (!userId || !propClubeId) return;
    const para = propTipo === "compra" ? (donoDoClubeProposta?.donoUserId ?? "") : propPara;
    if (!para) {
      setPropMsg("Escolha o destinatário da proposta.");
      return;
    }
    setPropEnviando(true);
    setPropMsg(null);
    const erro = await enviarPropostaClube(para, propClubeId, propTipo, propValor);
    setPropEnviando(false);
    if (erro) {
      setPropMsg(erro);
      return;
    }
    setPropMsg("Proposta enviada! O outro jogador verá no painel dele.");
    setPropClubeId("");
    setPropPara("");
    const lista = await listarPropostasClubes();
    setPropostas(lista);
  };

  const responderProposta = async (p: PropostaClube, aceitar: boolean) => {
    setPropEnviando(true);
    const erro = await responderPropostaClube(p.id, aceitar);
    setPropEnviando(false);
    if (erro) {
      setPropMsg(erro);
      return;
    }
    setPropMsg(aceitar ? "Proposta aceita — registrada no Banco Central SOV." : "Proposta recusada.");
    const [mapa, lista] = await Promise.all([mapaDonosClubes(), listarPropostasClubes()]);
    setDonos(mapa);
    setPropostas(lista);
    // Vendi meu clube via proposta: o SOV já foi movido pela RPC no ledger —
    // a carreira só zera a participação local (NUNCA uma segunda cobrança).
    if (aceitar && p.tipo === "compra" && p.paraUserId === userId) {
      onPerdeuClube?.(p.clubeId);
    }
  };

  const rotuloDono = (clube: Team): string | null => {
    if (!donos) return null; // erro de leitura: não afirma nada
    const dono = donos.get(clube.id);
    if (!dono) return "Sem dono na Cidadela";
    return dono.donoUserId === userId
      ? "Administrado por você"
      : `Dono: ${dono.donoNome ?? "cidadão"}`;
  };

  const handleComprar = (clube: Team) => {
    setClubeSelecionado(clube);
    setModo("comprar");
    setPorcentagem(10);
  };

  const handleVender = (clube: Team) => {
    setClubeSelecionado(clube);
    setModo("vender");
    setPorcentagem(10);
  };

  const confirmarTransacao = () => {
    if (!clubeSelecionado || !modo) return;

    if (modo === "comprar") {
      onComprarCota(clubeSelecionado, porcentagem);
    } else {
      onVenderCota(clubeSelecionado, porcentagem);
    }

    setClubeSelecionado(null);
    setModo(null);
  };

  const participacaoAtualClube = clubeSelecionado
    ? participacaoAtual(career, clubeSelecionado.id)
    : 0;

  const custoTotal = clubeSelecionado
    ? precoCotaClube(clubeSelecionado) * porcentagem
    : 0;

  const valorVenda = clubeSelecionado
    ? precoCotaClube(clubeSelecionado) * porcentagem
    : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="btn-ghost">
            ← Voltar
          </button>
          <div className="flex items-center gap-2">
            <Building2 className="size-6 text-amber-300" />
            <h2 className="font-display text-2xl">Propriedade de Clubes</h2>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2">
            <PieChart className="size-4 text-emerald-300" />
            <span className="font-bold">Patrimônio: {patrimonioTotal.toFixed(0)} SOV</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2">
            <TrendingUp className="size-4 text-amber-300" />
            <span className="font-bold">Saldo: {career.coach.sov.toFixed(0)} SOV</span>
          </div>
        </div>
      </div>

      {/* Clubes que já possui */}
      {clubesProprietario.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 font-display text-lg text-amber-300">Seus Clubes</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {clubesProprietario.map((prop) => {
              const clube = TEAMS.find((t) => t.id === prop.clubeId);
              if (!clube) return null;
              const eDono = eProprietario(career, prop.clubeId);
              return (
                <div
                  key={prop.clubeId}
                  className={`rounded-xl border p-4 ${
                    eDono
                      ? "border-amber-500/50 bg-amber-500/10"
                      : "border-slate-700 bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {eDono && <Crown className="size-4 text-amber-300" />}
                        <h4 className="font-bold">{clube.name}</h4>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">
                        Participação: {prop.participacao.toFixed(0)}%
                      </p>
                      <p className="text-xs text-slate-500">
                        Custo médio: {prop.custoMedio.toFixed(0)} SOV/cota
                      </p>
                      {rotuloDono(clube) && (
                        <p className={`mt-1 text-xs ${eDono ? "text-amber-300" : "text-slate-400"}`}>
                          {rotuloDono(clube)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleVender(clube)}
                      className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-600"
                    >
                      Vender
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Negociações entre jogadores — vale para TODA a Cidadela. Enviar
          propostas exige ser proprietário de ao menos um clube; propostas
          recebidas aparecem para qualquer jogador. */}
      {userId && (souProprietario || (propostas && propostas.length > 0)) && (
        <div className="mb-8 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg text-sky-300">
            <Handshake className="size-5" /> Negociações entre jogadores
          </h3>

          {/* Propostas recebidas pendentes */}
          {propostas?.some((p) => p.paraUserId === userId && p.status === "pendente") && (
            <div className="mb-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Recebidas
              </p>
              {propostas
                .filter((p) => p.paraUserId === userId && p.status === "pendente")
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3"
                  >
                    <p className="text-sm">
                      {p.tipo === "compra" ? (
                        <>
                          <b>{p.deNome ?? "Um jogador"}</b> quer comprar o <b>{p.clubeNome}</b> por{" "}
                          <b>{p.valorSov} SOV</b>
                        </>
                      ) : (
                        <>
                          <b>{p.deNome ?? "Um proprietário"}</b> quer te contratar como treinador do{" "}
                          <b>{p.clubeNome}</b> por <b>{p.valorSov} SOV</b>
                        </>
                      )}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void responderProposta(p, true)}
                        disabled={propEnviando}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-40"
                      >
                        Aceitar
                      </button>
                      <button
                        onClick={() => void responderProposta(p, false)}
                        disabled={propEnviando}
                        className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-600 disabled:opacity-40"
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Formulário de nova proposta — só para proprietários */}
          {souProprietario && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                Enviar proposta
              </p>
              <div className="mb-3 flex gap-2">
                <button
                  onClick={() => {
                    setPropTipo("compra");
                    setPropClubeId("");
                  }}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    propTipo === "compra"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  <Handshake className="size-3" /> Comprar clube
                </button>
                <button
                  onClick={() => {
                    setPropTipo("treinador");
                    setPropClubeId("");
                  }}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    propTipo === "treinador"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  <UserPlus className="size-3" /> Contratar treinador
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={propClubeId}
                  onChange={(e) => setPropClubeId(e.target.value)}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                >
                  <option value="">
                    {propTipo === "compra" ? "Clube de outro jogador…" : "Meu clube…"}
                  </option>
                  {clubesProposta.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {propTipo === "compra"
                        ? ` (dono: ${donos?.get(t.id)?.donoNome ?? "?"})`
                        : ""}
                    </option>
                  ))}
                </select>

                {propTipo === "treinador" && (
                  <select
                    value={propPara}
                    onChange={(e) => setPropPara(e.target.value)}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Treinador (cidadão)…</option>
                    {membros.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.nome ?? "Cidadão"}
                      </option>
                    ))}
                  </select>
                )}

                <input
                  type="number"
                  min={0}
                  value={propValor}
                  onChange={(e) => setPropValor(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="Valor (SOV)"
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                />

                <button
                  onClick={() => void enviarProposta()}
                  disabled={propEnviando || !propClubeId}
                  className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {propEnviando ? "Enviando…" : "Enviar proposta"}
                </button>
              </div>
              {propTipo === "compra" && clubesDeOutros.length === 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  Nenhum clube com outro dono na Cidadela ainda.
                </p>
              )}
            </div>
          )}

          {propMsg && <p className="mt-3 text-sm text-slate-300">{propMsg}</p>}

          {/* Histórico de propostas enviadas */}
          {propostas?.some((p) => p.deUserId === userId) && (
            <div className="mt-4 space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Enviadas
              </p>
              {propostas
                .filter((p) => p.deUserId === userId)
                .slice(0, 5)
                .map((p) => (
                  <p key={p.id} className="text-xs text-slate-400">
                    {p.tipo === "compra" ? "Compra" : "Treinador"} · {p.clubeNome} · {p.valorSov}{" "}
                    SOV → {p.paraNome ?? "cidadão"} ·{" "}
                    <b
                      className={
                        p.status === "aceita"
                          ? "text-emerald-300"
                          : p.status === "pendente"
                            ? "text-amber-300"
                            : "text-slate-500"
                      }
                    >
                      {p.status}
                    </b>
                  </p>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Mercado de clubes */}
      <div>
        <h3 className="mb-4 font-display text-lg text-emerald-300">Mercado de Clubes</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {TEAMS.map((clube) => {
            const participacao = participacaoAtual(career, clube.id);
            const eDono = eProprietario(career, clube.id);
            const precoCota = precoCotaClube(clube);
            const precoInteiro = precoClubeInteiro(clube);

            return (
              <div
                key={clube.id}
                className={`rounded-xl border p-4 transition ${
                  eDono
                    ? "border-amber-500/50 bg-amber-500/10"
                    : participacao > 0
                      ? "border-cyan-500/30 bg-cyan-500/5"
                      : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                }`}
              >
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    {eDono && <Crown className="size-4 text-amber-300" />}
                    <h4 className="font-bold">{clube.name}</h4>
                  </div>
                  <p className="text-xs text-slate-400">Power: {clube.power}</p>
                  {rotuloDono(clube) && (
                    <p className={`mt-1 text-xs ${eDono ? "text-amber-300" : "text-slate-400"}`}>
                      {rotuloDono(clube)}
                    </p>
                  )}
                </div>

                <div className="mb-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cota (1%):</span>
                    <span className="font-bold">{precoCota.toFixed(0)} SOV</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Clube (100%):</span>
                    <span className="font-bold">{precoInteiro.toFixed(0)} SOV</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sua participação:</span>
                    <span className={`font-bold ${participacao > 0 ? "text-emerald-300" : "text-slate-500"}`}>
                      {participacao.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleComprar(clube)}
                  disabled={eDono}
                  className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {eDono ? "Proprietário" : participacao > 0 ? "Aumentar" : "Comprar"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de transação */}
      {clubeSelecionado && modo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="mb-4 font-display text-xl">
              {modo === "comprar" ? "Comprar Cota" : "Vender Cota"}
            </h3>
            <p className="mb-4 text-sm text-slate-300">
              {clubeSelecionado.name} - {modo === "comprar" ? "Compra" : "Venda"} de {porcentagem}%
            </p>

            <div className="mb-4">
              <label className="mb-2 block text-xs uppercase tracking-widest text-slate-400">
                Porcentagem
              </label>
              <input
                type="range"
                min={1}
                max={modo === "comprar" ? 100 - participacaoAtualClube : participacaoAtualClube}
                value={porcentagem}
                onChange={(e) => setPorcentagem(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-2 text-center font-bold text-lg">{porcentagem}%</div>
            </div>

            <div className="mb-6 rounded-lg bg-slate-800 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">
                  {modo === "comprar" ? "Custo total:" : "Valor recebido:"}
                </span>
                <span className="font-bold">
                  {(modo === "comprar" ? custoTotal : valorVenda).toFixed(0)} SOV
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Preço por cota: {precoCotaClube(clubeSelecionado).toFixed(0)} SOV
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setClubeSelecionado(null);
                  setModo(null);
                }}
                className="flex-1 rounded-lg border border-slate-600 px-4 py-2 font-bold text-white transition hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarTransacao}
                disabled={
                  modo === "comprar"
                    ? career.coach.sov < custoTotal
                    : participacaoAtualClube < porcentagem
                }
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white transition hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
