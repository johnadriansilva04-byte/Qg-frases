import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type SupabaseConfig = {
  url: string;
  key: string;
};

function readEnv(name: string): string | undefined {
  const viteValue = import.meta.env?.[`VITE_${name}`] as string | undefined;
  if (viteValue) return viteValue.trim();

  if (typeof process !== "undefined") {
    const nodeValue = process.env?.[name] ?? process.env?.[`VITE_${name}`];
    if (nodeValue) return nodeValue.trim();
  }

  return undefined;
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function readSupabaseConfig(): SupabaseConfig | null {
  const url = readEnv("SUPABASE_URL");
  const key = readEnv("SUPABASE_ANON_KEY") ?? readEnv("SUPABASE_PUBLISHABLE_KEY");

  if (!url || !key) return null;
  return { url, key };
}

export function getSupabaseConfigError(): string | null {
  const missing = [
    ...(!readEnv("SUPABASE_URL") ? ["VITE_SUPABASE_URL (ou SUPABASE_URL)"] : []),
    ...(!readEnv("SUPABASE_ANON_KEY") && !readEnv("SUPABASE_PUBLISHABLE_KEY")
      ? ["VITE_SUPABASE_ANON_KEY (ou SUPABASE_ANON_KEY)"]
      : []),
  ];

  if (missing.length === 0) return null;
  return `Supabase não configurado. Defina ${missing.join(" e ")} no ambiente.`;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfigError() === null;
}

export function assertSupabaseConfigured(): void {
  const error = getSupabaseConfigError();
  if (error) throw new Error(error);
}

function createSupabaseClient(): SupabaseClient<Database> {
  const config = readSupabaseConfig();
  if (!config) {
    throw new Error(getSupabaseConfigError() ?? "Supabase não configurado.");
  }

  return createClient<Database>(config.url, config.key, {
    global: {
      fetch: createSupabaseFetch(config.key),
    },
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

let _supabase: SupabaseClient<Database> | null = null;

function getSupabaseClient(): SupabaseClient<Database> {
  if (!_supabase) _supabase = createSupabaseClient();
  return _supabase;
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    const client = getSupabaseClient();
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
