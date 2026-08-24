#!/usr/bin/env bash
#
# Sobe um PostgreSQL temporário, aplica as migrations e roda os testes de RLS.
# Não toca no projeto Supabase real nem precisa de Docker.
#
#   npm run db:test
#
set -euo pipefail

if ! command -v initdb >/dev/null 2>&1; then
  for candidate in /usr/lib/postgresql/*/bin /usr/local/pgsql/bin /opt/homebrew/opt/postgresql*/bin; do
    if [ -x "$candidate/initdb" ]; then
      PATH="$candidate:$PATH"
      break
    fi
  done
fi

if ! command -v initdb >/dev/null 2>&1; then
  echo "PostgreSQL não encontrado. Instale o pacote 'postgresql' (versão 15 ou superior)." >&2
  exit 1
fi

# /var/tmp é usado no lugar de /tmp porque o processo do Postgres pode rodar com
# outro usuário e precisa atravessar o diretório.
BASE="${TMPDIR_DB:-/var/tmp}/nossa-viagem-db-test-$$"
DATA="$BASE/data"
PORT="${PGPORT:-0}"

cleanup() {
  as_pg "pg_ctl -D '$DATA' -m immediate stop" >/dev/null 2>&1 || true
  rm -rf "$BASE"
}
trap cleanup EXIT

# O Postgres se recusa a rodar como root. Nesse caso delegamos ao usuário postgres.
NEEDS_SU=0
if [ "$(id -u)" = "0" ] && id postgres >/dev/null 2>&1; then
  NEEDS_SU=1
fi

as_pg() {
  if [ "$NEEDS_SU" = "1" ]; then
    su postgres -c "PATH='$(dirname "$(command -v initdb)")':\$PATH $1"
  else
    bash -c "$1"
  fi
}

# Procura uma porta livre para não colidir com outro Postgres na máquina.
if [ "$PORT" = "0" ]; then
  PORT=$(node -e "const n=require('net');const s=n.createServer();s.listen(0,()=>{console.log(s.address().port);s.close();});" 2>/dev/null || echo 55432)
fi

mkdir -p "$BASE"
chmod 755 "$BASE"
[ "$NEEDS_SU" = "1" ] && chown postgres "$BASE"

# Silencia os NOTICE de "does not exist, skipping": são esperados na primeira aplicação.
export PGOPTIONS="-c client_min_messages=warning"

echo "→ Criando instância temporária na porta $PORT…"
as_pg "initdb -D '$DATA' -U postgres --auth=trust -E UTF8" >/dev/null
as_pg "pg_ctl -D '$DATA' -o '-p $PORT -k $BASE' -l '$BASE/server.log' start -w" >/dev/null

PSQL_BASE="psql -h $BASE -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL_BASE -c "create database nv_test;" >/dev/null
PSQL="$PSQL_BASE -d nv_test"

echo "→ Aplicando o arcabouço mínimo do Supabase…"
$PSQL -f supabase/tests/00_supabase_stub.sql >/dev/null

echo "→ Aplicando as migrations…"
for file in supabase/migrations/*.sql; do
  $PSQL -f "$file" >/dev/null
  echo "   ✓ $(basename "$file")"
done

echo "→ Carregando a viagem de exemplo…"
$PSQL -f supabase/seed/demo_trip.sql >/dev/null

echo "→ Testes de Row Level Security:"
echo
psql -h "$BASE" -p "$PORT" -U postgres -d nv_test -f supabase/tests/01_rls_test.sql
echo
echo "✓ Banco validado."
