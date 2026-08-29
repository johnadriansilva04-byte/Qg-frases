import { useState, useRef, useEffect } from "react";
import { User, LogIn, Settings, LogOut, Trash2, UserPlus } from "lucide-react";
import { useAuth } from "./AuthProvider";

export function UserMenu() {
  const { perfil, carregando, pedirLogin, sairDaConta, apagarConta, abrirEdicaoConta } = useAuth();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [aberto]);

  if (carregando) return null;

  const iniciais = perfil?.nome
    ? perfil.nome.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : null;

  return (
    <div ref={ref} className="fixed top-3 right-3 z-[90]">
      {/* Botão avatar */}
      <button
        onClick={() => (perfil ? setAberto(!aberto) : pedirLogin("user-menu"))}
        className="flex size-10 items-center justify-center rounded-full border border-border bg-background text-sm font-bold text-foreground shadow-md transition hover:border-primary/50 hover:shadow-lg"
        title={perfil ? perfil.nome : "Entrar"}
      >
        {iniciais ? (
          <span className="select-none">{iniciais}</span>
        ) : (
          <User className="size-4 text-muted-foreground" />
        )}
      </button>

      {/* Dropdown */}
      {aberto && (
        <div className="absolute right-0 top-11 w-48 overflow-hidden rounded-xl border border-border bg-background shadow-xl">
          {perfil ? (
            <>
              <div className="border-b border-border px-3 py-2">
                <p className="truncate text-xs font-bold text-foreground">{perfil.nome}</p>
                <p className="truncate text-[10px] text-muted-foreground">{perfil.time_personalizado}</p>
              </div>
              <button
                onClick={() => { abrirEdicaoConta(); setAberto(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground transition hover:bg-muted"
              >
                <Settings className="size-3.5" /> Editar conta
              </button>
              <button
                onClick={() => { sairDaConta(); setAberto(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground transition hover:bg-muted"
              >
                <LogOut className="size-3.5" /> Sair
              </button>
              <button
                onClick={() => { if (confirm("Apagar conta permanentemente?")) { apagarConta(); setAberto(false); } }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive transition hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" /> Apagar conta
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { pedirLogin("user-menu"); setAberto(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground transition hover:bg-muted"
              >
                <LogIn className="size-3.5" /> Entrar
              </button>
              <button
                onClick={() => { pedirLogin("user-menu-cadastro"); setAberto(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground transition hover:bg-muted"
              >
                <UserPlus className="size-3.5" /> Criar conta
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
