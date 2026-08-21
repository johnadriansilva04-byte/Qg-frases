/**
 * TELA DE PROPRIEDADE DE CLUBES
 * 
 * Interface para compra/venda de participações em clubes da Cidadela.
 * Permite a progressão: Técnico → Reputação → Patrimônio → Cotas → Proprietário → Múltiplos Clubes
 */

import { useState } from "react";
import { Building2, TrendingUp, ChevronRight, Crown, PieChart } from "lucide-react";
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

type Props = {
  career: CareerState;
  onBack: () => void;
  onComprarCota: (clube: Team, porcentagem: number) => void;
  onVenderCota: (clube: Team, porcentagem: number) => void;
};

export function PropriedadeScreen({ career, onBack, onComprarCota, onVenderCota }: Props) {
  const [clubeSelecionado, setClubeSelecionado] = useState<Team | null>(null);
  const [modo, setModo] = useState<"comprar" | "vender" | null>(null);
  const [porcentagem, setPorcentagem] = useState<number>(10);

  const clubesProprietario = listarClubesProprietario(career);
  const patrimonioTotal = patrimonioParticipacoes(career);

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
