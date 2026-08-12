import { LogOut, User } from "lucide-react";
import type { Perfil } from "../online/auth";
import { STORAGE_KEYS } from "../online/auth";

type Props = {
  perfil: Perfil | null;
  onLogin: () => void;
  onLogout: () => void;
};

export function UserMenu({ perfil, onLogin, onLogout }: Props) {
  const isLoggedIn = !!perfil;
  const timeNome = localStorage.getItem(STORAGE_KEYS.TIME) || 'Meu Time';
  const abreviacao = localStorage.getItem(STORAGE_KEYS.ABREVIACAO) || 'MTI';

  console.log('[UserMenu] Renderizando:', { isLoggedIn, perfil, timeNome, abreviacao });

  return (
    <div className="fixed top-4 left-4 z-10">
      {isLoggedIn ? (
        <div className="panel flex items-center gap-3 p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <User className="size-5" />
            <div className="text-sm">
              <span className="font-display font-bold">{abreviacao}</span>
              <span className="text-muted-foreground ml-1">{timeNome}</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="btn-ghost p-2"
            title="Sair da conta"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
