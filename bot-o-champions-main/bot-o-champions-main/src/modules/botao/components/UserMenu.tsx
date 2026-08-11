import { LogIn, LogOut } from "lucide-react";
import type { Perfil } from "../online/auth";

export function UserMenu({
  perfil,
  emPartida,
  onLogin,
  onLogout,
}: {
  perfil: Perfil | null;
  emPartida: boolean;
  onLogin: () => void;
  onLogout: () => void;
}) {
  if (!perfil) {
    return (
      <button onClick={onLogin} className="btn-ghost shrink-0 gap-2">
        <LogIn className="size-4" /> Entrar
      </button>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="hidden min-w-0 text-right sm:block">
        <span className="block truncate font-display text-sm leading-none">{perfil.time_personalizado}</span>
        <span className="block truncate text-[11px] tracking-widest text-muted-foreground uppercase">
          {perfil.abreviacao_time} · #{perfil.numero_jogador}
        </span>
      </span>
      <button
        onClick={onLogout}
        disabled={emPartida}
        title={emPartida ? "Não dá pra sair durante uma partida online" : "Sair da conta"}
        className="btn-ghost shrink-0 gap-2 disabled:opacity-50"
      >
        <LogOut className="size-4" />
        <span className="hidden sm:inline">Sair</span>
      </button>
    </div>
  );
}
