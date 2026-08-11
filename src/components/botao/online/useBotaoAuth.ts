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
    let syncInProgress = false; // Flag para evitar chamadas simultâneas
    let lastUserId: string | null = null; // Rastrear o último usuário sync

    const sync = async (u: User | null) => {
      // Guarda para evitar chamadas simultâneas
      if (syncInProgress) {
        console.log('Sync já em progresso, ignorando chamada');
        return;
      }
      
      // Evitar sync se o usuário é o mesmo
      const currentUserId = u?.id ?? null;
      if (currentUserId === lastUserId && lastUserId !== null) {
        console.log('Usuário é o mesmo, ignorando sync');
        return;
      }
      
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
        
        console.log('Buscando perfil para usuário:', u.id);
        const p = await buscarPerfil(u.id);
        
        if (!vivo) return;
        
        if (p) {
          console.log('Perfil encontrado:', p.id);
          cachePerfil(p);
        } else {
          console.log('Perfil não encontrado para usuário:', u.id);
          limparCache();
        }
        
        setPerfil(p);
        setCarregando(false);
      } catch (error) {
        console.error('Erro no sync de autenticação:', error);
        if (vivo) {
          setCarregando(false);
        }
      } finally {
        syncInProgress = false;
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      // Ignorar eventos que não precisam de sync completo
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION" || event === "SIGNED_IN") return;
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
