import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { buscarPerfil, cachePerfil, limparCache, sair, type Perfil } from "./auth";

export function useBotaoAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;

    const sync = async (u: User | null) => {
      if (!vivo) return;
      setUser(u);
      if (!u) {
        setPerfil(null);
        limparCache();
        setCarregando(false);
        return;
      }
      const p = await buscarPerfil(u.id);
      if (!vivo) return;
      if (p) cachePerfil(p);
      else limparCache();
      setPerfil(p);
      setCarregando(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;
      void sync(session?.user ?? null);
    });

    void supabase.auth.getUser().then(({ data }) => sync(data.user ?? null));

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const recarregar = useCallback(async () => {
    if (!user) return null;
    const p = await buscarPerfil(user.id);
    if (p) cachePerfil(p);
    setPerfil(p);
    return p;
  }, [user]);

  const logout = useCallback(async () => {
    await sair();
    setUser(null);
    setPerfil(null);
  }, []);

  return { user, perfil, carregando, recarregar, logout, aplicarPerfil: (p: Perfil) => {
    cachePerfil(p);
    setPerfil(p);
  } };
}
