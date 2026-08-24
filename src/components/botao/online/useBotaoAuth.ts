import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
  supabase,
} from "@/integrations/supabase/client";
import { buscarPerfil, cachePerfil, limparCache, sair, type Perfil } from "./auth";
import { decidirDestinoSessao } from "./sessaoRegras";
import { alinharCacheSoberania, criarPerfilSeNaoExistir } from "@/lib/botao/api";
import { bootstrapFinanceiro } from "@/lib/financial/sovBankApi";
import { cacheSoberaniaInteiro } from "@/lib/financial/sovApi";

export function useBotaoAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroConfiguracao, setErroConfiguracao] = useState<string | null>(null);
  /** Sessão Auth válida SEM conta de jogo (perfil removido) → recusa. */
  const [contaSemCadastro, setContaSemCadastro] = useState(false);

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
      if (lastUserId && lastUserId !== currentUserId) {
        limparCache();
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

        let p = await buscarPerfil(u.id);
        if (!vivo) return;

        if (p) {
          cachePerfil(p);
          setContaSemCadastro(false);
        } else {
          const destino = decidirDestinoSessao({ temPerfil: false, usuarioCriadoEm: u.created_at });
          if (destino === "recuperar-cadastro-recente" && u.email) {
            // Primeiro acesso imediatamente após o signUp: o trigger pode ter
            // falhado — a recuperação do perfil é legítima (e o bônus é
            // idempotente na chave signup:{user}).
            p = await criarPerfilSeNaoExistir(u.id, u.email, u.user_metadata?.["nome"]);
            if (p) cachePerfil(p);
            else limparCache();
            setContaSemCadastro(false);
          } else {
            // RECUSA-CONTA-SEM-PERFIL:inicio
            // Sessão ANTIGA sem perfil = conta de jogo removida. AUTENTICAÇÃO
            // ≠ CONTA: sem auto-provisionamento — nada de perfil novo, sem
            // carteira, sem bônus, sem hidratação de carreira. Encerra a
            // sessão (mata o refresh token) e sinaliza o cadastro.
            setContaSemCadastro(true);
            await sair();
            if (!vivo) return;
            limparCache();
            setUser(null);
            setPerfil(null);
            setCarregando(false);
            return;
            // RECUSA-CONTA-SEM-PERFIL:fim
          }
        }

        // Bootstrap financeiro em TODA sessão (não só no cadastro): carteira +
        // bônus de cadastro idempotente (signup:{user}). Cobre perfis criados
        // pelo trigger de signup (que não passava pelo caminho do bônus) e
        // auto-cura qualquer falha anterior. O cache pontos_soberania e o
        // estado do perfil são alinhados ao saldo AUTORITATIVO do ledger;
        // erro real (null) nunca vira 0 nem sobrescreve o cache.
        if (p) {
          const saldo = await bootstrapFinanceiro(u.id);
          if (!vivo) return;
          if (saldo != null && saldo !== p.pontos_soberania) {
            await alinharCacheSoberania(u.id, saldo);
            p = { ...p, pontos_soberania: cacheSoberaniaInteiro(saldo) };
            cachePerfil(p);
          }
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
    limparCache();
    setContaSemCadastro(false);
    if (isSupabaseConfigured()) await sair();
    setUser(null);
    setPerfil(null);
  }, []);

  return {
    user,
    perfil,
    carregando,
    erroConfiguracao,
    contaSemCadastro,
    recarregar,
    logout,
    aplicarPerfil: (p: Perfil) => {
      cachePerfil(p);
      setContaSemCadastro(false);
      setPerfil(p);
    },
  };
}
