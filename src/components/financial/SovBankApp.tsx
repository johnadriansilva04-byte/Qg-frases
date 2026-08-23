import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  ChevronDown,
  ChevronUp,
  Landmark,
  Newspaper,
  PieChart,
  ReceiptText,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { obterSaldoSov } from "@/lib/financial/sovApi";
import type { TransacaoClube } from "@/components/botao/career/clubeFinancas";
import {
  obterEstatisticas,
  obterExtrato,
  obterNoticias,
  reconciliarConta,
  type EstatisticasEconomia,
  type ExtratoItem,
  type NoticiaEconomica,
  type Reconciliacao,
} from "@/lib/financial/sovBankApi";
import { SOV_BANK } from "@/lib/financial/sovBankConfig";
import { obterSaldosInvest } from "@/lib/financial/sovInvestApi";

type Aba = "extrato" | "noticias" | "economia";
/** Toda seção de conteúdo do banco abre sob demanda (clique) e só UMA fica
 *  aberta por vez — a tela do celular nunca amontoa listas. */
type Secao = Aba | "ultimas" | "extrato-clube";

const MODULO_LABEL: Record<string, string> = {
  career: "Modo Carreira",
  rpg: "RPG da Cidadela",
  online: "Partidas Online",
  market: "Mercado / Bolsa",
  campus: "Campus",
  mission: "Missões Diárias",
  system: "Sistema",
  trilha: "Trilha",
  futebol: "Futebol de Botão",
};

const TIPO_LABEL: Record<string, string> = {
  reward: "Recompensa",
  penalty: "Penalidade",
  bet_win: "Aposta vencida",
  bet_loss: "Aposta perdida",
  fee: "Taxa / Custo",
  transfer: "Transferência",
  invest_transfer: "Bank → Invest",
  invest_withdraw: "Retirada Invest → Bank",
  dividend: "Dividendo",
  market_purchase: "Compra na Bolsa",
};

function formatarSov(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function txCurto(id: string): string {
  return `TX-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export function SovBankApp({
  userId,
  clube,
}: {
  userId: string | null;
  /** Perfil do Clube (§3): caixa/extrato próprios da carreira, separados do
   *  dinheiro pessoal. Quando ausente, o bloco do clube não aparece. */
  clube?: { nome: string; caixa: number; extrato: TransacaoClube[] } | undefined;
}) {
  const [secaoAberta, setSecaoAberta] = useState<Secao | null>(null);
  const [saldo, setSaldo] = useState<number | null>(null);
  const [saldoInvest, setSaldoInvest] = useState<number | null>(null);
  const [extrato, setExtrato] = useState<ExtratoItem[]>([]);
  const [noticias, setNoticias] = useState<NoticiaEconomica[]>([]);
  const [stats, setStats] = useState<EstatisticasEconomia | null>(null);
  const [reconciliacao, setReconciliacao] = useState<Reconciliacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const extratoAberto = secaoAberta === "ultimas";
  const extratoClubeAberto = secaoAberta === "extrato-clube";
  const alternarSecao = (secao: Secao) =>
    setSecaoAberta((atual) => (atual === secao ? null : secao));

  const carregar = useCallback(async () => {
    if (!userId) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const [saldoAtual, itens, feed, economia, check] = await Promise.all([
      obterSaldoSov(userId),
      obterExtrato(userId, 50),
      obterNoticias(),
      obterEstatisticas(),
      reconciliarConta(userId),
    ]);
    setSaldo(saldoAtual);
    setExtrato(itens);
    setNoticias(feed);
    setStats(economia);
    setReconciliacao(check);
    // SOV Invest (segunda carteira do mesmo jogador). null = indisponível.
    void obterSaldosInvest(userId).then((s) => setSaldoInvest(s ? s.invest : null));
    setCarregando(false);
  }, [userId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (!userId) {
    return (
      <div className="p-4 text-center">
        <Landmark className="mx-auto mb-3 size-10 text-slate-500" />
        <p className="text-sm font-bold text-white">{SOV_BANK.NOME_BANCO} bloqueado</p>
        <p className="mt-1 text-xs text-slate-400">
          Entre com sua conta para acessar saldo, extrato e a economia da Cidadela.
        </p>
      </div>
    );
  }

  const ultimas = extrato.slice(0, 3);

  return (
    <div className="p-3">
      {/* Hero: saldo */}
      <div className="mb-3 rounded-2xl border border-amber-300/25 bg-gradient-to-br from-amber-400/15 via-slate-900 to-slate-950 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-300/20">
              <Landmark className="size-5 text-amber-200" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">
                {SOV_BANK.NOME_BANCO}
              </p>
              <p className="text-[10px] text-slate-400">Livro-caixa central da Cidadela</p>
            </div>
          </div>
          {reconciliacao &&
            (reconciliacao.consistente ? (
              <span
                className="flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-1 text-[9px] font-bold text-emerald-300"
                title="Saldo confere com o livro-caixa"
              >
                <BadgeCheck className="size-3" /> Verificada
              </span>
            ) : (
              <span
                className="flex items-center gap-1 rounded-full bg-red-400/15 px-2 py-1 text-[9px] font-bold text-red-300"
                title={`Divergência registrada para auditoria (carteira ${formatarSov(reconciliacao.saldo_carteira)} vs ledger ${formatarSov(reconciliacao.saldo_ledger)})`}
              >
                <ShieldAlert className="size-3" /> Auditoria
              </span>
            ))}
        </div>

        <p className="mt-4 text-[10px] uppercase tracking-widest text-slate-400">SOV Bank · Saldo líquido</p>
        <p className="text-3xl font-black text-white">
          {saldo === null ? "—" : formatarSov(saldo)}{" "}
          <span className="text-sm font-bold text-amber-200">{SOV_BANK.MOEDA_NOME}</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Disponível:{" "}
          <span className="font-bold text-slate-200">
            {saldo === null ? "—" : `${formatarSov(saldo)} ${SOV_BANK.MOEDA}`}
          </span>
        </p>
        {/* SOV Invest: a segunda carteira do MESMO jogador (investimentos). */}
        <div className="mt-3 flex items-center justify-between rounded-xl border border-sky-400/20 bg-sky-400/5 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">
            SOV Invest (investimentos)
          </p>
          <p className="text-sm font-black text-sky-200">
            {saldoInvest === null ? "—" : `${formatarSov(saldoInvest)} ${SOV_BANK.MOEDA}`}
          </p>
        </div>
        <p className="mt-1 text-[10px] text-slate-500">
          Dividendos e investimentos caem no SOV Invest. Retirada Invest → Bank: IOF 10%.
        </p>
        {/* Perfil pessoal × Perfil do clube (§3): dois mundos separados. */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 px-3 py-2">
            <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-amber-200">
              <UserRound className="size-3" /> Perfil Pessoal
            </p>
            <p className="mt-1 text-sm font-black text-white">
              {saldo === null ? "—" : formatarSov(saldo)}
            </p>
          </div>
          {clube && (
            <div className="rounded-xl border border-sky-400/20 bg-sky-400/5 px-3 py-2">
              <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-sky-300">
                <Building2 className="size-3" /> Caixa do Clube
              </p>
              <p className={`mt-1 text-sm font-black ${clube.caixa < 0 ? "text-rose-300" : "text-emerald-300"}`}>
                {formatarSov(clube.caixa)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Perfil do Clube (§3-§5): finanças do clube com extrato recolhível. */}
      {clube && (
        <div className="mb-3 rounded-2xl border border-sky-400/20 bg-sky-400/5 p-3" data-testid="perfil-clube">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">
                Perfil do Clube · {clube.nome}
              </p>
              <p className={`mt-1 text-2xl font-black ${clube.caixa < 0 ? "text-rose-300" : "text-emerald-300"}`}>
                {formatarSov(clube.caixa)}{" "}
                <span className="text-xs font-bold text-sky-300">{SOV_BANK.MOEDA}</span>
              </p>
              {clube.caixa < 0 && (
                <p className="text-[10px] text-rose-300">Clube endividado — recupera jogando.</p>
              )}
            </div>
            <Building2 className="size-8 text-sky-400/50" />
          </div>
          <button
            data-testid="extrato-clube-toggle"
            onClick={() => alternarSecao("extrato-clube")}
            className="mt-3 flex w-full items-center justify-between rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:border-sky-400/40"
          >
            <span className="flex items-center gap-1.5">
              <ReceiptText className="size-3.5 text-sky-300" />
              Extrato do clube ({clube.extrato.length})
            </span>
            {extratoClubeAberto ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          {extratoClubeAberto && (
            <div className="mt-2 space-y-1.5">
              {clube.extrato.length === 0 && (
                <p className="py-3 text-center text-xs text-slate-500">Sem lançamentos ainda.</p>
              )}
              {clube.extrato.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-950/50 px-2.5 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] text-slate-200">{tx.descricao}</p>
                    <p className="text-[9px] uppercase tracking-wider text-slate-500">
                      {tx.tipo} · T{tx.temporada} R{tx.rodada}
                    </p>
                  </div>
                  <span
                    className={`ml-2 shrink-0 text-xs font-bold ${
                      tx.valor >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {tx.valor >= 0 ? "+" : ""}
                    {formatarSov(tx.valor)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Últimas movimentações */}
      <div className="mb-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
        <button
          data-testid="extrato-toggle"
          onClick={() => alternarSecao("ultimas")}
          className="flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500"
        >
          <span>Últimas movimentações</span>
          {extratoAberto ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
        {extratoAberto &&
          (carregando ? (
            <p className="py-2 text-center text-xs text-slate-500">Carregando...</p>
          ) : ultimas.length === 0 ? (
            <p className="py-2 text-center text-xs text-slate-500">
              Nenhuma movimentação ainda — todo Sovereign que entrar aqui terá origem rastreável.
            </p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {ultimas.map((item) => (
                <LinhaMovimentacao key={item.id} item={item} compact />
              ))}
            </div>
          ))}
      </div>

      {/* Seções sob demanda: título → clique → expansão (uma por vez). */}
      <div className="space-y-2">
        {(
          [
            ["extrato", ReceiptText, `Extrato completo (${extrato.length})`],
            ["noticias", Newspaper, "Notícias"],
            ["economia", PieChart, "Economia"],
          ] as const
        ).map(([id, Icon, label]) => (
          <div
            key={id}
            className="rounded-2xl border border-white/10 bg-slate-950/50 p-3"
          >
            <button
              data-testid={`secao-${id}-toggle`}
              onClick={() => alternarSecao(id)}
              className="flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300"
            >
              <span className="flex items-center gap-1.5">
                <Icon className="size-3.5 text-amber-200/70" />
                {label}
              </span>
              {secaoAberta === id ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </button>

            {id === "extrato" && secaoAberta === "extrato" && (
              <div className="mt-2 space-y-1.5">
                {extrato.length === 0 && !carregando && (
                  <p className="py-4 text-center text-xs text-slate-500">Extrato vazio.</p>
                )}
                {extrato.map((item) => (
                  <LinhaMovimentacao key={item.id} item={item} />
                ))}
              </div>
            )}

            {id === "noticias" && secaoAberta === "noticias" && (
              <div className="mt-2 space-y-2">
                {noticias.length === 0 && !carregando && (
                  <p className="py-4 text-center text-xs text-slate-500">
                    Sem boletins econômicos no momento.
                  </p>
                )}
                {noticias.map((n, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                    <p className="text-xs font-bold text-amber-200">{n.titulo}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">{n.corpo}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-widest text-slate-600">
                      Fonte: {n.fonte}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {id === "economia" && secaoAberta === "economia" && (
        <div className="mt-2 space-y-2">
          {!stats && !carregando && (
            <p className="py-4 text-center text-xs text-slate-500">
              Estatísticas indisponíveis neste ambiente.
            </p>
          )}
          {stats && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <StatCard rotulo="Em circulação (carteiras)" valor={stats.em_circulacao} destaque />
                <StatCard rotulo="Distribuído (créditos)" valor={stats.emitido_total} />
                <StatCard rotulo="Gasto (débitos)" valor={stats.retirado_total} />
                <StatCard rotulo="Restante p/ distribuir" valor={stats.disponivel_emissao} />
                <StatCard rotulo="Usuários c/ carteira" valor={stats.usuarios_com_carteira} inteiro />
                <StatCard rotulo="Vagas restantes" valor={stats.vagas_restantes} inteiro />
                <StatCard rotulo="Transações no ledger" valor={stats.transacoes_total} inteiro />
                <StatCard rotulo="Alertas de auditoria" valor={stats.alertas_reconciliacao} inteiro />
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Regras da remessa inicial
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  Estoque econômico total:{" "}
                  <span className="font-bold text-white">
                    {formatarSov(stats.limite_emissao)} {SOV_BANK.MOEDA}
                  </span>{" "}
                  <span className="text-slate-500">(da economia inteira — não por usuário)</span>
                </p>
                <p className="text-xs text-slate-300">
                  População máxima da remessa:{" "}
                  <span className="font-bold text-white">{stats.limite_usuarios} usuários</span>
                </p>
                <p className="text-xs text-slate-300">
                  Bônus de cadastro:{" "}
                  <span className="font-bold text-white">
                    {SOV_BANK.SIGNUP_BONUS} {SOV_BANK.MOEDA}
                  </span>{" "}
                  <span className="text-slate-500">(uma das formas de distribuição do estoque)</span>
                </p>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                  Nenhum Sovereign surge do nada: cada movimentação aponta o sistema e o evento
                  que a originou. Divergências entre saldo e livro-caixa são registradas para
                  auditoria, nunca corrigidas em silêncio.
                </p>
              </div>
            </>
          )}
        </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LinhaMovimentacao({ item, compact = false }: { item: ExtratoItem; compact?: boolean }) {
  const positivo = item.amount >= 0;
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`flex size-6 shrink-0 items-center justify-center rounded-lg ${
              positivo ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"
            }`}
          >
            {positivo ? <ArrowUpRight className="size-3.5" /> : <ArrowDownLeft className="size-3.5" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-white">
              {item.description ?? TIPO_LABEL[item.transaction_type] ?? item.transaction_type}
            </p>
            <p className="truncate text-[10px] text-slate-500">
              {MODULO_LABEL[item.source_module] ?? item.source_module}
              {item.source_event ? ` · ${item.source_event}` : ""}
            </p>
          </div>
        </div>
        <p
          className={`shrink-0 text-xs font-black ${
            positivo ? "text-emerald-300" : "text-red-300"
          }`}
        >
          {positivo ? "+" : "−"}
          {formatarSov(Math.abs(item.amount))} {item.currency}
        </p>
      </div>
      {!compact && (
        <div className="mt-1.5 flex items-center justify-between border-t border-white/5 pt-1.5 text-[9px] text-slate-500">
          <span>
            {formatarData(item.created_at)} · {formatarHora(item.created_at)}
          </span>
          <span className="font-mono">{txCurto(item.id)}</span>
        </div>
      )}
    </div>
  );
}

function StatCard({
  rotulo,
  valor,
  destaque = false,
  inteiro = false,
}: {
  rotulo: string;
  valor: number;
  destaque?: boolean;
  inteiro?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        destaque
          ? "border-amber-300/30 bg-amber-300/10"
          : "border-white/10 bg-slate-950/50"
      }`}
    >
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{rotulo}</p>
      <p className={`mt-1 text-sm font-black ${destaque ? "text-amber-200" : "text-white"}`}>
        {inteiro ? valor.toLocaleString("pt-BR") : `${formatarSov(valor)} ${SOV_BANK.MOEDA}`}
      </p>
    </div>
  );
}
