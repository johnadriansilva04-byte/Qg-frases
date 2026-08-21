import { useState } from "react";
import { Lock, LogIn, UserRound } from "lucide-react";
import { cadastrar, cachePerfil, entrar, CORES_PADRAO, type Perfil } from "@/components/botao/online/auth";

type Props = {
  onPronto: (p: Perfil) => void;
};

/**
 * LOGIN NO CHAT — formulário encaixado no celular como card de conversa.
 * Mesma autenticação única do app (Supabase Auth via online/auth). Cadastro
 * mínimo: email + senha + nome; a identidade do clube é definida depois no
 * CareerIntro/ProfileSetup (não duplica fluxos aqui).
 * §25: guarda de execução — 1 clique = 1 intenção = 1 chamada de auth.
 */
export function ChatAuthCard({ onPronto }: Props) {
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const submit = async () => {
    if (ocupado) return; // barreira reentrante (§25)
    setOcupado(true);
    setErro(null);
    try {
      if (modo === "login") {
        const p = await entrar(email.trim(), senha);
        if (!p) throw new Error("Login ok, mas o perfil não veio. Tente de novo.");
        cachePerfil(p);
        onPronto(p);
      } else {
        const p = await cadastrar({
          email: email.trim(),
          senha,
          nome: nome.trim() || "Novato",
          time: "Esquadrão da Cidadela",
          abreviacao: "CID",
          numero: 10,
          cores: CORES_PADRAO,
        });
        cachePerfil(p);
        onPronto(p);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Algo deu errado. Tente de novo.";
      setErro(
        msg.includes("email rate limit")
          ? "Muitas tentativas seguidas. Aguarde 1 minuto e tente de novo."
          : msg,
      );
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="ml-7 w-[92%] rounded-2xl rounded-bl-sm border border-emerald-500/30 bg-slate-900/90 p-3 shadow-lg shadow-emerald-950/40 animate-in slide-in-from-bottom-2">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
        <Lock className="size-3.5" />
        {modo === "login" ? "Entrar" : "Criar conta"}
      </p>

      <div className="space-y-2">
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-medium text-slate-400">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            maxLength={100}
            autoComplete="email"
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-500/60"
          />
        </label>

        <label className="block">
          <span className="mb-0.5 block text-[10px] font-medium text-slate-400">Senha</span>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="mínimo 6 caracteres"
            maxLength={72}
            autoComplete={modo === "login" ? "current-password" : "new-password"}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-500/60"
          />
        </label>

        {modo === "cadastro" && (
          <label className="block">
            <span className="mb-0.5 block text-[10px] font-medium text-slate-400">
              <UserRound className="mr-1 inline size-3" /> Seu nome
            </span>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Como o Pracinha te chama?"
              maxLength={40}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-500/60"
            />
          </label>
        )}

        {erro && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300 animate-in fade-in">
            {erro}
          </p>
        )}

        <button
          onClick={() => void submit()}
          disabled={ocupado || !email.trim() || !senha}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-3 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.99] disabled:opacity-40"
        >
          <LogIn className="size-4" />
          {ocupado ? "Verificando..." : modo === "login" ? "Entrar na Cidadela" : "Criar e entrar"}
        </button>

        <button
          onClick={() => {
            setErro(null);
            setModo(modo === "login" ? "cadastro" : "login");
          }}
          className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
        >
          {modo === "login" ? "Não tenho conta — quero criar" : "Já tenho conta — voltar ao login"}
        </button>
      </div>
    </div>
  );
}
