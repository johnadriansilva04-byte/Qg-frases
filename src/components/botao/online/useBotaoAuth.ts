import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
  supabase,
} from "@/integrations/supabase/client";
import { buscarPerfil, cachePerfil, limparCache, sair, type Perfil } from "./auth";
import { criarPerfilSeNaoExistir } from "@/lib/botao/api";

export function useBotaoAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroConfiguracao, setErroConfiguracao] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    let syncInProgress = false;
    let lastUserId: string | null = null;

    if (!isSupabaseConfigured()) {
      setErroConfiguracao(getSupabaseConfigError());
      setCarregando(false);
      return;
    }

    const sync = async (u: User | null) => {
      if (syncInProgress) return;

      const currentUserId = u?.id ?? null;
      if (currentUserId === lastUserId && lastUserId !== null) return;
      if (!vivo) return;

      syncInProgress = true;
      lastUserId = currentUserId;

      try {
        setUser(u);
        if (!u) {
          setPerfil(null);
          limparCache();
          setCarregando(false);
          return;
        }

        let p = await buscarPerfil(u.id);
        if (!vivo) return;

        if (p) {
          cachePerfil(p);
        } else if (u.email) {
          p = await criarPerfilSeNaoExistir(u.id, u.email, u.user_metadata?.["nome"]);
          if (p) cachePerfil(p);
          else limparCache();
        } else {
          limparCache();
        }

        setPerfil(p);
        setCarregando(false);
      } catch (error) {
        console.error("Erro no sync de autenticação:", error);
        if (vivo) setCarregando(false);
      } finally {
        syncInProgress = false;
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      void sync(session?.user ?? null);
    });

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const recarregar = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return null;
    const p = await buscarPerfil(user.id);
    if (p) cachePerfil(p);
    setPerfil(p);
    return p;
  }, [user]);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured()) await sair();
    setUser(null);
    setPerfil(null);
  }, []);

  return {
    user,
    perfil,
    carregando,
    erroConfiguracao,
    recarregar,
    logout,
    aplicarPerfil: (p: Perfil) => {
      cachePerfil(p);
      setPerfil(p);
    },
  };
}
