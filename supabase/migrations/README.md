# Migrações Supabase — como aplicar

O projeto **não** usa `supabase` CLI nem `service_role` no workspace: cada
migração é aplicada **manualmente** colando o conteúdo do arquivo no
**SQL Editor** do painel Supabase e executando. Todas são idempotentes
(`IF NOT EXISTS` / `CREATE OR REPLACE`) — podem ser reexecutadas com segurança.

## Ordem obrigatória

1. `futebol.sql` — base do Futebol de Botão (usuários, times, mesas, RPCs).
2. `biblioteca.sql` — Livro de Frases (módulo separado).
3. `trilha.sql` — Jogo da Trilha (módulo separado).
4. `cidadela_rpg.sql` — perfis/profissões da Cidadela.
5. `cidadela_chat_missoes.sql` — chat e missões diárias.
6. `sov_financial_system.sql` — carteiras + ledger base (`user_wallets`,
   `bank_ledger`, `record_transaction`).
7. `sov_integracao_cartorio.sql` — SOV + Cartório.
8. `sov_bank.sql` — **SOV BANK**: config da remessa (100 usuários /
   200.000 SOV de estoque total / 50 SOV de bônus de cadastro), colunas de
   rastreabilidade no ledger, RPCs `sov_bank_*`.
9. `feira.sql` — **Feira**: `cidadela_itens`, `cidadela_inventory`,
   `cidadela_market_listings` + RPCs `feira_*` (depende de `sov_bank.sql`).
10. `tempo_cidadao.sql` — **Tempo de Cidadão + Presença + Perfil**:
    colunas `nome`/`bio` em `cidadela_perfis` (corrige bug latente do RPC de
    presença), tabela `cidadela_tempo`, RPCs `tempo_cidadao_heartbeat`
    (acumula tempo validado, paga +10 SOV/hora via SOV Bank com chave
    `tempo:{user}:{hora}`), `cidadela_perfil_publico` e
    `cidadela_atualizar_perfil` (depende de `sov_bank.sql` e
    `cidadela_chat_missoes.sql`).

## Como verificar se o SOV BANK está operacional

Após aplicar `sov_bank.sql`, rode no SQL Editor:

```sql
SELECT * FROM sov_bank_config;
SELECT sov_bank_stats();
```

Se `sov_bank_config` tiver as chaves `max_users_initial=100`,
`max_sovereign_initial=200000` e `signup_bonus=50`, o banco central está
operacional. Sem a migração, o app **degrada com segurança** (fallback para
as RPCs antigas) — mas nesse estado o SOV BANK **não deve ser declarado
operacional**.
