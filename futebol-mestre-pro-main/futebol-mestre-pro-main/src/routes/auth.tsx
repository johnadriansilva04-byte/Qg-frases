import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar na Mesa Soberana — Futebol de Botão" },
      {
        name: "description",
        content: "Acesse seu perfil de futebol de botão para jogar amistosos lendários, o seminário retro e mesas online.",
      },
      { property: "og:title", content: "Entrar na Mesa Soberana" },
      { property: "og:description", content: "Acesse seu perfil de futebol de botão e entre em campo." },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: window.location.origin,
            data: { nome: nome || email.split("@")[0] },
          },
        });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível entrar.");
    } finally {
      setCarregando(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Falha ao entrar com Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-3xl">{modo === "entrar" ? "Entrar na mesa" : "Criar jogador"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Seu perfil, time personalizado e cores são reconhecidos automaticamente.
      </p>

      <form onSubmit={enviar} className="surface mt-6 space-y-4 p-5">
        {modo === "criar" && (
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome do jogador</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu apelido na mesa" />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="senha">Senha</Label>
          <Input
            id="senha"
            type="password"
            required
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={carregando}>
          {modo === "entrar" ? "Entrar" : "Criar conta"}
        </Button>
        <Button type="button" variant="secondary" className="w-full" onClick={google}>
          Continuar com Google
        </Button>
        <button
          type="button"
          onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
          className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {modo === "entrar" ? "Ainda não tenho conta" : "Já tenho conta"}
        </button>
      </form>
    </main>
  );
}
