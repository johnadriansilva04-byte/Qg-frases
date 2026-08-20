import { useCallback, useEffect, useState } from "react";
import { Check, Clock3, Loader2, Pencil, Swords, Target, Trophy, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatarTempoCidadao } from "@/lib/cidadela/tempoCidadao";
import { obterSaldoSov } from "@/lib/cidadela/pracinhaCore";

export type PerfilPublico = {
  user_id: string;
  nome: string;
  bio: string | null;
  profissao_atual: string | null;
  nivel_cidadela: number;
  reputacao_global: number;
  entrou_em: string;
  tempo_total_segundos: number;
  online: boolean;
  partidas: number;
  vitorias: number;
  missoes_resgatadas: number;
};

type Props = {
  /** Cidadão exibido. */
  userId: string;
  /** Usuário autenticado (define se o perfil é editável). */
  meuUserId: string | null;
  /** Stats derivados do sistema (somente no próprio perfil): nunca editáveis. */
  extras?:
    | { decisoes?: number | undefined; entrevistas?: number | undefined; sov?: number | null }
    | undefined;
  /** Volta para a lista (quando aberto a partir do Grupo). */
  onVoltar?: (() => void) | undefined;
};

/**
 * Perfil do Cidadão — identidade central da Cidadela (§7, §11).
 * Tempo de Cidadão (tempo real online), entrada, stats reais e bio.
 * Edição limitada a nome/bio (§8): métricas derivadas do sistema são
 * somente-leitura.
 */
export function PerfilApp({ userId, meuUserId, extras, onVoltar }: Props) {
  const [perfil, setPerfil] = useState<PerfilPublico | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<"nome" | "bio" | null>(null);
  const [rascunho, setRascunho] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [saldoSov, setSaldoSov] = useState<number | null>(null);
  const proprio = meuUserId === userId;

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase.rpc("cidadela_perfil_publico", {
      p_user_id: userId,
    });
    if (!error && data) setPerfil(data as unknown as PerfilPublico);
    setCarregando(false);
  }, [userId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Saldo SOV só no próprio perfil (não é dado público).
  useEffect(() => {
    if (!proprio || !meuUserId) return;
    void obterSaldoSov(meuUserId).then(setSaldoSov);
  }, [proprio, meuUserId]);

  const salvar = async () => {
    if (!editando) return;
    setSalvando(true);
    const { error } = await supabase.rpc("cidadela_atualizar_perfil", {
      p_nome: editando === "nome" ? rascunho.trim() : null,
      p_bio: editando === "bio" ? rascunho.trim() : null,
    });
    setSalvando(false);
    if (!error) {
      setEditando(null);
      await carregar();
    }
  };

  if (carregando && !perfil) {
    return (
      <div className="flex items-center justify-center p-10 text-slate-500">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }
  if (!perfil) {
    return (
      <div className="p-6 text-center text-xs text-slate-500">
        Perfil indisponível no momento.
      </div>
    );
  }

  const entrada = new Date(perfil.entrou_em).toLocaleDateString("pt-BR");

  return (
    <div className="space-y-3 p-3">
      {onVoltar && (
        <button
          onClick={onVoltar}
          className="text-[10px] font-bold uppercase tracking-widest text-slate-500 transition hover:text-white"
        >
          ← Voltar ao grupo
        </button>
      )}

      {/* Identidade: nome + presença real (heartbeat ≤3min) */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-black text-white">{perfil.nome}</h2>
              <span
                className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest ${
                  perfil.online ? "text-emerald-400" : "text-slate-500"
                }`}
              >
                <span
                  className={`inline-block size-1.5 rounded-full ${
                    perfil.online ? "bg-emerald-400" : "bg-slate-600"
                  }`}
                />
                {perfil.online ? "Online" : "Offline"}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-slate-500">
              {perfil.profissao_atual ?? "Cidadão"} · Nível {perfil.nivel_cidadela}
            </p>
          </div>
          {proprio && (
            <button
              onClick={() => {
                setRascunho(perfil.nome);
                setEditando("nome");
              }}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-white"
              aria-label="Editar nome"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
        </div>

        {/* Métricas derivadas do sistema — somente leitura */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2.5">
            <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-300">
              <Clock3 className="size-3" /> Tempo de Cidadão
            </p>
            <p className="mt-0.5 text-sm font-black text-white">
              {formatarTempoCidadao(perfil.tempo_total_segundos)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
              Entrou na Cidadela
            </p>
            <p className="mt-0.5 text-sm font-black text-white">{entrada}</p>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-2.5">
            <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">
              <Swords className="size-3" /> Partidas
            </p>
            <p className="mt-0.5 text-sm font-black text-white">
              {perfil.partidas}
              <span className="ml-1 text-[10px] font-normal text-emerald-400">
                {perfil.vitorias}V
              </span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-2.5">
            <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">
              <Target className="size-3" /> Missões
            </p>
            <p className="mt-0.5 text-sm font-black text-white">{perfil.missoes_resgatadas}</p>
          </div>
          {extras?.decisoes !== undefined && (
            <div className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                Decisões
              </p>
              <p className="mt-0.5 text-sm font-black text-white">{extras.decisoes}</p>
            </div>
          )}
          {extras?.entrevistas !== undefined && (
            <div className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                Entrevistas
              </p>
              <p className="mt-0.5 text-sm font-black text-white">{extras.entrevistas}</p>
            </div>
          )}
          {(extras?.sov ?? saldoSov) != null && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5">
              <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-amber-300">
                <Trophy className="size-3" /> Sovereign
              </p>
              <p className="mt-0.5 text-sm font-black text-white">{extras?.sov ?? saldoSov} SOV</p>
            </div>
          )}
        </div>
      </div>

      {/* Biografia */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Biografia
          </p>
          {proprio && (
            <button
              onClick={() => {
                setRascunho(perfil.bio ?? "");
                setEditando("bio");
              }}
              className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-800 hover:text-white"
              aria-label="Editar bio"
            >
              <Pencil className="size-3" />
            </button>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-300">
          {perfil.bio ?? (proprio ? "Conte quem você é na Cidadela." : "Cidadão da Cidadela.")}
        </p>
      </div>

      {/* Editor inline (nome/bio) */}
      {editando && (
        <div className="space-y-2 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">
            {editando === "nome" ? "Nome exibido" : "Biografia"}
          </p>
          {editando === "nome" ? (
            <input
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              maxLength={40}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/60"
            />
          ) : (
            <textarea
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              maxLength={280}
              rows={3}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/60"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setEditando(null)}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-700"
            >
              <X className="size-3" /> Cancelar
            </button>
            <button
              onClick={() => void salvar()}
              disabled={salvando || (editando === "nome" && !rascunho.trim())}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-sky-500 disabled:opacity-40"
            >
              {salvando ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
