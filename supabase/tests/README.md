# Testes do banco

Verificam, em um PostgreSQL de verdade, que as políticas de Row Level Security
fazem o que prometem: quem não participa de uma viagem não enxerga nada dela, o
visualizador não altera, o editor não convida e o proprietário não pode ser
trocado por um `UPDATE` comum.

## Como rodar

Precisa de PostgreSQL 15+ instalado localmente (não usa Docker nem o projeto
Supabase real).

```bash
npm run db:test
```

O script sobe uma instância temporária, aplica o arcabouço mínimo do Supabase
(`00_supabase_stub.sql`), roda todas as migrations, cria a viagem de exemplo e
executa as 20 verificações de `01_rls_test.sql`. Ao final, derruba a instância.

Tudo acontece dentro de uma transação com `rollback` no fim — nada fica gravado.

## O que o arcabouço reproduz

O Supabase traz pronto o schema `auth` (com `auth.users` e `auth.uid()`), o
schema `storage` e os papéis `anon`, `authenticated` e `service_role`. O arquivo
`00_supabase_stub.sql` recria o mínimo desses elementos para que as migrations
rodem iguais em um Postgres comum. Ele existe apenas para o teste e **não** deve
ser aplicado no projeto real.
