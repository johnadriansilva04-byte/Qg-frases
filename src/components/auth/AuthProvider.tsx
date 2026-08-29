import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useBotaoAuth } from "@/components/botao/online/useBotaoAuth";
import { excluirContaUsuario } from "@/lib/botao/api";
import type { Perfil } from "@/components/botao/online/auth";

export type ModalTipo = "login" | "editar" | null;

type AuthContextValue = {
  /** Perfil logado (null = visitante). */
  perfil: Perfil | null;
  /** Estado de carregamento da sessão (true = ainda verificando). */
  carregando: boolean;
  /** Abre o modal de login uma vez por aba (guard via sessionStorage). */
  pedirLogin: (pontoEntrada?: string) => void;
  /** Fecha o modal e marca sessionStorage (visitante decidiu continuar sem conta). */
  fecharLogin: () => void;
  /** Registra um handler que é chamado quando o visitante escolhe "continuar sem conta". */
  aoContinuarSemConta: (handler: () => void) => void;
  /** Sai da conta (logout). */
  sairDaConta: () => Promise<void>;
  /** Exclui a conta do usuário. */
  apagarConta: () => Promise<void>;
  /** Aplica um perfil (após login/cadastro). */
  aplicarPerfilGlobal: (p: Perfil) => void;
  /** Abre o modal em modo de edição de conta. */
  abrirEdicaoConta: () => void;
  /** Estado do modal: null = fechado, "login" = tela de login, "editar" = tela de edição. */
  tipoModal: ModalTipo;
  /** Recarrega o perfil do banco. */
  recarregar: () => Promise<Perfil | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const GUARD_KEY = "auth:pediu-login-v1";

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useBotaoAuth();
  const [tipoModal, setTipoModal] = useState<ModalTipo>(null);
  const continuarSemContaHandlers = useRef(new Set<() => void>());
  const jaPediuRef = useRef(false);

  // Auto-login silencioso: quando o perfil aparece (sessão conhecida), fecha o modal
  useEffect(() => {
    if (auth.perfil && tipoModal === "login") {
      setTipoModal(null);
    }
  }, [auth.perfil, tipoModal]);

  const pedirLogin = useCallback((pontoEntrada?: string) => {
    if (auth.perfil) return; // já logado
    if (jaPediuRef.current) return;
    try {
      if (sessionStorage.getItem(GUARD_KEY)) return;
    } catch { /* SSR */ }
    jaPediuRef.current = true;
    console.log("[Auth] pedirLogin:", pontoEntrada ?? "global");
    setTipoModal("login");
  }, [auth.perfil]);

  const fecharLogin = useCallback(() => {
    setTipoModal(null);
    try {
      sessionStorage.setItem(GUARD_KEY, "1");
    } catch { /* SSR */ }
    // Notificar handlers registrados
    continuarSemContaHandlers.current.forEach((h) => {
      try { h(); } catch { /* swallow */ }
    });
  }, []);

  const aoContinuarSemConta = useCallback((handler: () => void) => {
    continuarSemContaHandlers.current.add(handler);
    return () => {
      continuarSemContaHandlers.current.delete(handler);
    };
  }, []);

  const sairDaConta = useCallback(async () => {
    await auth.logout();
    setTipoModal(null);
  }, [auth]);

  const apagarConta = useCallback(async () => {
    if (auth.perfil?.user_id) {
      try { await excluirContaUsuario(auth.perfil.user_id); } catch (e) { console.error("[Auth] excluir:", e); }
    }
    await auth.logout();
    setTipoModal(null);
  }, [auth]);

  const aplicarPerfilGlobal = useCallback((p: Perfil) => {
    auth.aplicarPerfil(p);
    setTipoModal(null);
  }, [auth]);

  const abrirEdicaoConta = useCallback(() => {
    if (auth.perfil) setTipoModal("editar");
  }, [auth.perfil]);

  return (
    <AuthContext.Provider
      value={{
        perfil: auth.perfil,
        carregando: auth.carregando,
        pedirLogin,
        fecharLogin,
        aoContinuarSemConta,
        sairDaConta,
        apagarConta,
        aplicarPerfilGlobal,
        abrirEdicaoConta,
        tipoModal,
        recarregar: auth.recarregar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Hook para consumir o contexto de auth global. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
