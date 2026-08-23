import { useEffect, useMemo, useState } from "react";
import { Swords, Users, Check, ChevronRight } from "lucide-react";
import { buscarMesa, linkConviteMesa, type MesaFutebol } from "@/lib/multiplayer/mesa.api";
import {
  buscarCampeonato,
  linkConviteCampeonato,
  type CampeonatoOnline,
} from "@/lib/multiplayer/campeonato.api";
import { TEAMS, type Team } from "@/components/botao/data/teams";
import { gerarOfertasIniciais, type OfertaClube } from "@/components/botao/career/ofertasIniciais";
import { distribuirTorcidaInicial } from "@/components/botao/career/torcidaEngine";
import { PORTE_LABEL } from "@/components/botao/career/forcaClube";
import { PROFISSOES, escolherProfissao, type ProfissaoId } from "@/lib/cidadela/profissoes";
import { cadastrar, type Perfil } from "./auth";

type Props = {
  /** mesa_x (modo "mesa") ou CAMP-x (modo "campeonato"). */
  mesaId: string;
  modo?: "mesa" | "campeonato";
  onPronto: (perfil: Perfil) => void;
  onCancelar: () => void;
};

/**
 * Fluxo do convidado por link (§12-§13 + §link): NÃO cai num cadastro
 * genérico — vê a tela do campeonato/mesa com 3 propostas de clube, escolhe
 * uma, informa nome + e-mail, escolhe a profissão (1 pergunta, sem tour) e
 * entra direto na mesa/sala. A conta criada é um usuário normal.
 */
export function ConviteMesaScreen({ mesaId, modo = "mesa", onPronto, onCancelar }: Props) {
  const [mesa, setMesa] = useState<MesaFutebol | null>(null);
  const [camp, setCamp] = useState<CampeonatoOnline | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [clube, setClube] = useState<OfertaClube | null>(null);
  const [profissao, setProfissao] = useState<ProfissaoId | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);

  // 3 propostas de clubes (pequenos) determinísticas por convite (§12).
  const ofertas = useMemo(() => {
    const clubesC = TEAMS.filter((t) => t.divisaoInicial === "serie-c").map((t) => ({
      id: t.id,
      nome: t.name,
      sigla: t.short,
      cidade: t.city,
      power: t.power,
      escudo: t.escudo,
    }));
    const torcidaBase = distribuirTorcidaInicial(TEAMS.map((t) => ({ id: t.id, power: t.power })));
    const fans: Record<string, number> = Object.fromEntries(
      Object.entries(torcidaBase).map(([id, t]) => [id, t.fans]),
    );
    return gerarOfertasIniciais(clubesC, `convite:${mesaId}`, fans, 50);
  }, [mesaId]);

  useEffect(() => {
    let vivo = true;
    if (modo === "campeonato") {
      void buscarCampeonato(mesaId)
        .then((c) => {
          if (vivo) setCamp(c);
        })
        .catch(() => {
          if (vivo) setErro("Não foi possível abrir o convite deste campeonato.");
        })
        .finally(() => {
          if (vivo) setCarregando(false);
        });
    } else {
      void buscarMesa(mesaId)
        .then((m) => {
          if (vivo) setMesa(m);
        })
        .catch(() => {
          if (vivo) setErro("Não foi possível abrir o convite desta mesa.");
        })
        .finally(() => {
          if (vivo) setCarregando(false);
        });
    }
    return () => {
      vivo = false;
    };
  }, [mesaId, modo]);

  const conviteValido = modo === "campeonato" ? camp !== null : mesa !== null;
  const bloqueada =
    modo === "mesa" &&
    mesa?.data_liberacao != null &&
    new Date(mesa.data_liberacao).getTime() > Date.now();
  const cheia =
    modo === "mesa"
      ? mesa?.jogador_2_id != null
      : camp != null && camp.participantes.length >= camp.max_jogadores;
  const fechado = modo === "campeonato" && camp != null && camp.status !== "aguardando";

  const confirmar = async () => {
    if (!clube || !nome.trim() || !email.trim() || !profissao) return;
    setEnviando(true);
    setErro(null);
    try {
      // Cadastro rápido (§13): nome + e-mail + clube escolhido. A senha é
      // gerada e o usuário define/ redefine depois — a conta é um usuário
      // normal com origem registrada como convite.
      const senhaProvisoria = `convite-${mesaId.slice(-6)}-${Math.random().toString(36).slice(2, 8)}`;
      const timeClube: Team | undefined = TEAMS.find((t) => t.id === clube.clubeId);
      const coresClube: [string, string, string] = timeClube
        ? [timeClube.primary, timeClube.secondary, "#f59e0b"]
        : ["#1e3a8a", "#0b7a3b", "#f59e0b"];
      const perfil = await cadastrar({
        email: email.trim(),
        senha: senhaProvisoria,
        nome: nome.trim(),
        time: clube.nome,
        abreviacao: clube.sigla,
        numero: 7,
        cores: coresClube,
      });
      // Origem registrada: convite (não quebra se a coluna não existir).
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        await (supabase.rpc as CallableFunction)("atualizar_perfil_clube", {
          p_uid: perfil.user_id,
          p_nome: nome.trim(),
          p_time: clube.nome,
          p_abreviacao: clube.sigla,
          p_cores: timeClube ? [timeClube.primary, timeClube.secondary, "#f59e0b"] : null,
          p_tatica: null,
          p_botoes: null,
        });
      } catch {
        /* perfil já criado pelo cadastro */
      }
      // Profissão escolhida em UMA pergunta — cadastro concluído, sem tour.
      await escolherProfissao(perfil.user_id, profissao).catch(() => null);
      onPronto(perfil);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível criar sua conta.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8" data-testid="convite-mesa-screen">
      <div className="panel">
        <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          <Swords className="size-4" />
          <span>Convite de campeonato</span>
        </div>

        {carregando ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Abrindo seu convite...</p>
        ) : erro ? (
          <div className="py-6 text-center">
            <p className="text-sm text-rose-300">{erro}</p>
            <button onClick={onCancelar} className="btn-ghost mt-4">
              Voltar
            </button>
          </div>
        ) : !conviteValido ? (
          <div className="py-6 text-center">
            <p className="text-sm text-slate-400">Este convite não existe mais.</p>
            <button onClick={onCancelar} className="btn-ghost mt-4">
              Voltar
            </button>
          </div>
        ) : fechado ? (
          <div className="py-6 text-center">
            <p className="text-sm text-amber-300">Este campeonato já começou.</p>
            <p className="mt-1 text-xs text-slate-500">Peça um novo convite ao organizador.</p>
            <button onClick={onCancelar} className="btn-ghost mt-4">
              Voltar
            </button>
          </div>
        ) : bloqueada ? (
          <div className="py-6 text-center">
            <p className="text-sm text-sky-300">
              Esta mesa abre em {new Date(mesa.data_liberacao!).toLocaleString("pt-BR")}.
            </p>
            <p className="mt-1 text-xs text-slate-500">Volte quando chegar a data de liberação.</p>
            <button onClick={onCancelar} className="btn-ghost mt-4">
              Voltar
            </button>
          </div>
        ) : cheia ? (
          <div className="py-6 text-center">
            <p className="text-sm text-amber-300">
              {modo === "campeonato" ? "Este campeonato já está cheio." : "Esta mesa já está cheia."}
            </p>
            <p className="mt-1 text-xs text-slate-500">Peça um novo convite ao organizador.</p>
            <button onClick={onCancelar} className="btn-ghost mt-4">
              Voltar
            </button>
          </div>
        ) : (
          <>
            <h2 className="font-display text-2xl leading-snug">
              Bem-vindo! Você vai participar{" "}
              {modo === "campeonato" ? "deste campeonato." : "desta mesa."}
            </h2>
            {modo === "campeonato" && camp && (
              <p className="mt-1 text-xs text-amber-300">
                {camp.nome} · {camp.participantes.length}/{camp.max_jogadores} jogadores
                {(camp.premio_sov ?? 0) > 0 && ` · prêmio ${camp.premio_sov} SOV`}
              </p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              Três clubes querem que você administre, treine e comande um deles durante este
              campeonato. Qual clube você escolhe?
            </p>

            <div className="mt-5 space-y-2">
              {ofertas.map((o) => {
                const ativa = clube?.clubeId === o.clubeId;
                return (
                  <button
                    key={o.clubeId}
                    data-testid={`convite-oferta-${o.clubeId}`}
                    onClick={() => setClube(o)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      ativa
                        ? "border-emerald-500/60 bg-emerald-500/10"
                        : "border-white/10 bg-slate-900/40 hover:border-emerald-500/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-slate-800 text-xl">
                        {o.escudo}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-lg font-bold text-white">{o.nome}</h3>
                          <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-slate-300">
                            {PORTE_LABEL[o.porte]}
                          </span>
                          {ativa && <Check className="ml-auto size-5 shrink-0 text-emerald-400" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {o.cidade} · {o.sigla}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Força {o.power} · Estrutura {"★".repeat(o.estrutura)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {clube && (
              <div className="mt-5 space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300">
                  <Users className="size-3.5" />
                  Seu cadastro rápido
                </p>
                <p className="text-xs text-slate-400">
                  Só o necessário para entrar. Você completa o perfil depois.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-muted-foreground">Seu nome</label>
                    <input
                      data-testid="convite-nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Carlos"
                      maxLength={40}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest text-muted-foreground">Seu e-mail</label>
                    <input
                      data-testid="convite-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@email.com"
                      maxLength={80}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 outline-none focus:border-primary"
                    />
                  </div>
                </div>
                {erro && <p className="text-xs text-rose-300">{erro}</p>}
              </div>
            )}

            {clube && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-300">
                  Sua profissão na Cidadela
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Escolha qual profissão você quer ter na Cidadela antes de começar o campeonato.
                </p>
                <div className="mt-3 flex flex-wrap gap-2" data-testid="convite-profissoes">
                  {PROFISSOES.filter((p) => p.disponivel).map((p) => (
                    <button
                      key={p.id}
                      data-testid={`convite-profissao-${p.id}`}
                      onClick={() => setProfissao(p.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        profissao === p.id
                          ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
                          : "border-white/10 bg-slate-900/60 text-slate-300 hover:border-emerald-500/40"
                      }`}
                    >
                      {p.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-3">
              <button onClick={onCancelar} className="btn-ghost">
                Voltar
              </button>
              <button
                data-testid="convite-confirmar"
                onClick={() => void confirmar()}
                disabled={
                  !clube ||
                  !profissao ||
                  nome.trim().length < 2 ||
                  !/.+@.+\..+/.test(email) ||
                  enviando
                }
                className="btn-primary gap-2 disabled:opacity-50"
              >
                {enviando
                  ? "Entrando..."
                  : modo === "campeonato"
                    ? "Entrar no campeonato"
                    : `Comandar o ${clube?.sigla ?? ""}`}
                <ChevronRight className="size-4" />
              </button>
            </div>
            <p className="mt-3 text-[10px] text-slate-600">
              Link deste convite:{" "}
              {modo === "campeonato" ? linkConviteCampeonato(mesaId) : linkConviteMesa(mesaId)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
