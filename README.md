# Nossa Viagem

A central da sua viagem — do planejamento à volta para casa.

Voos, hospedagens, aluguel de carro, roteiro dia a dia, mapas, rotas, orçamento,
documentos e checklists de todas as suas viagens em um só lugar. Feito para
abrir no celular no meio da viagem e responder em segundos:

> Onde a gente precisa estar agora? Que horas sair? Quanto demora para chegar?
> Qual é o endereço? Qual é a nossa reserva? Quanto já gastamos? Onde está o voucher?

O nome do produto fica em `src/lib/config.ts` (`APP.name`) e pode ser trocado em
um único lugar.

---

## Sumário

1. [O que já funciona](#o-que-já-funciona)
2. [Tecnologias](#tecnologias)
3. [Instalação](#instalação)
4. [Supabase: projeto, migrations e storage](#supabase-projeto-migrations-e-storage)
5. [Variáveis de ambiente](#variáveis-de-ambiente)
6. [Google Maps: quais APIs e como restringir as chaves](#google-maps-quais-apis-e-como-restringir-as-chaves)
7. [Segurança e Row Level Security](#segurança-e-row-level-security)
8. [Desenvolvimento](#desenvolvimento)
9. [Testes](#testes)
10. [Deploy na Vercel](#deploy-na-vercel)
11. [Backup e migrations](#backup-e-migrations)
12. [PWA e uso offline](#pwa-e-uso-offline)
13. [Estrutura de pastas](#estrutura-de-pastas)
14. [Solução de problemas](#solução-de-problemas)
15. [Próximos passos previstos](#próximos-passos-previstos)

---

## O que já funciona

| Área | Situação |
| --- | --- |
| Cadastro, login, logout, recuperação de senha | Pronto |
| Login com Google | Pronto no código; basta habilitar o provedor no Supabase |
| Criar, editar, duplicar e excluir viagens | Pronto |
| Dashboard com próxima viagem, próximo compromisso e pendências | Pronto |
| Voos com múltiplos trechos, fusos, passageiros e bagagem | Pronto |
| Hospedagens (hotel, Airbnb, pousada…) com campos de temporada | Pronto |
| Aluguel de carro com retirada, devolução e condições | Pronto |
| Roteiro dia a dia, arrastar e soltar, eventos sem horário | Pronto |
| Calendário (mês, semana, dia, agenda) e exportação `.ics` | Pronto |
| Busca de endereços (Places API) com Place ID e coordenadas | Pronto |
| Mapa da viagem com filtros e rota do dia | Pronto |
| Distância e tempo de deslocamento (Routes API) com cache | Pronto |
| Rotas com várias paradas, reordenação e otimização | Pronto |
| Abrir qualquer rota no Google Maps | Pronto (não exige API key) |
| Financeiro: orçado × real, pagamentos, categorias, moedas | Pronto |
| Divisão de gastos entre viajantes e acerto de contas | Pronto |
| Documentos em storage privado com URL assinada | Pronto |
| Checklists | Pronto |
| Informações rápidas e links rápidos | Pronto |
| Compartilhamento com proprietário / editor / visualizador | Pronto |
| PDF resumido e completo, com mapas e QR Codes | Pronto |
| Exportação JSON, CSV de despesas e ICS | Pronto |
| PWA instalável com leitura offline | Pronto |

> Nenhum desses itens existe apenas como tela: todos os formulários gravam no
> banco e todos os botões fazem alguma coisa.

---

## Tecnologias

- **Next.js 16** (App Router, Server Components e Server Actions)
- **React 19** e **TypeScript** em modo estrito
- **Tailwind CSS 4** com um sistema de design próprio (sem tema pronto)
- **Radix UI** para diálogos, menus e componentes acessíveis
- **Supabase**: PostgreSQL, Auth, Storage e Row Level Security
- **Zod** para validação (mesma regra no formulário e no servidor)
- **dnd-kit** para arrastar e soltar
- **Vitest** para os testes de lógica

---

## Instalação

Requisitos: **Node.js 20.9+** e npm.

```bash
git clone <url-do-repositório>
cd lua-de-mel
npm install
cp .env.example .env.local   # preencha as variáveis (veja abaixo)
npm run dev
```

Abra <http://localhost:3000>. Sem as variáveis do Supabase o aplicativo redireciona
para `/configurar`, que mostra o que ainda falta.

---

## Supabase: projeto, migrations e storage

### 1. Criar o projeto

1. Acesse <https://supabase.com/dashboard> e crie um projeto.
2. Escolha uma região próxima dos usuários (para o Brasil, `South America (São Paulo)`).
3. Guarde a senha do banco em local seguro.

### 2. Aplicar as migrations

As migrations ficam em `supabase/migrations/` e devem ser aplicadas **na ordem
do nome do arquivo**:

| Arquivo | O que faz |
| --- | --- |
| `20260101000000_init_schema.sql` | Tabelas, tipos, índices, timestamps e triggers |
| `20260101000100_rls_policies.sql` | Row Level Security em todas as tabelas |
| `20260101000200_functions.sql` | Convites, transferência de propriedade, resumo financeiro |
| `20260101000300_storage.sql` | Buckets e políticas de acesso aos arquivos |
| `20260101000400_hardening.sql` | Fecha o acesso anônimo às funções e fixa o `search_path` |

> Duas particularidades do Supabase que as migrations já contornam: a função
> auxiliar do Storage fica em `public` (o schema `storage` pertence ao
> `supabase_storage_admin` e não aceita objetos novos), e o último arquivo revoga
> o `EXECUTE` que o Postgres e o próprio Supabase concedem por padrão — sem ele,
> funções internas ficariam chamáveis por `/rest/v1/rpc/...` sem login.

**Opção A — SQL Editor (mais simples):** abra o SQL Editor do projeto, cole o
conteúdo de cada arquivo na ordem e execute um de cada vez.

**Opção B — CLI do Supabase:**

```bash
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push
```

### 3. Storage

O arquivo de migration já cria os dois buckets:

- **`trip-documents`** — privado. Vouchers, cartões de embarque e comprovantes.
  Só participantes da viagem conseguem ler, e sempre por URL assinada temporária.
- **`trip-covers`** — público. Apenas as imagens de capa escolhidas pelo usuário.

Confira em *Storage* se os dois aparecem depois de rodar as migrations.

### 4. Autenticação

Em *Authentication → URL Configuration*:

- **Site URL**: `http://localhost:3000` em desenvolvimento; o domínio real em produção.
- **Redirect URLs**: adicione `http://localhost:3000/auth/callback` e
  `https://seu-dominio.com/auth/callback`.

Para o **login com Google**, habilite o provedor em *Authentication → Providers →
Google* e informe o Client ID e o Client Secret do Google Cloud. Se não habilitar,
o botão existe mas retorna um aviso — o login por e-mail e senha continua normal.

### 5. Dados de demonstração (opcional)

Depois de criar sua conta no aplicativo, rode no SQL Editor:

```sql
-- Uma única vez: registra a função
-- (cole o conteúdo de supabase/seed/demo_trip.sql)

select public.seed_demo_trip('seu-email@exemplo.com');
```

Isso cria a viagem fictícia **Serra Gaúcha**, com 2 voos, 1 hospedagem, 1 carro,
4 dias de roteiro, 10 eventos, despesas, contatos, links e checklists — o
suficiente para testar tudo. Para remover, basta excluir a viagem pela interface.

---

## Variáveis de ambiente

Copie `.env.example` para `.env.local`. O arquivo `.env.local` está no
`.gitignore` e **nunca** deve ser commitado.

### Obrigatórias

| Variável | Onde encontrar |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public key |

> A chave **service role** não é usada em lugar nenhum deste projeto. Se você a
> encontrar em algum arquivo, é bug — remova.

### Opcionais (Google Maps)

| Variável | Para quê |
| --- | --- |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Mapa interativo no navegador |
| `GOOGLE_MAPS_SERVER_API_KEY` | Busca de endereços, rotas e mapas do PDF |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Estilo personalizado do mapa |
| `NEXT_PUBLIC_APP_URL` | URL pública, usada nos links de convite |

Sem as chaves do Google o sistema **continua funcionando**: o endereço passa a ser
digitado à mão, os recursos de cálculo automático ficam ocultos e a página
`/configurar` explica o que habilitar.

---

## Google Maps: quais APIs e como restringir as chaves

No [Google Cloud Console](https://console.cloud.google.com/), crie um projeto,
ative o faturamento e habilite:

| API | Usada para |
| --- | --- |
| **Maps JavaScript API** | Mapa interativo na página `/mapa` |
| **Places API (New)** | Busca de endereços com autocomplete |
| **Routes API** | Distância, duração e polyline das rotas |
| **Maps Static API** | Imagens dos mapas no PDF |

### Use duas chaves separadas

**Chave 1 — navegador** (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)

Fica visível no HTML, então a restrição é indispensável:

- *Application restrictions* → **Websites (HTTP referrers)**
  - `https://seu-dominio.com/*`
  - `http://localhost:3000/*`
- *API restrictions* → apenas **Maps JavaScript API**

**Chave 2 — servidor** (`GOOGLE_MAPS_SERVER_API_KEY`)

Sem o prefixo `NEXT_PUBLIC_`, então nunca chega ao navegador:

- *Application restrictions* → **None** (ou por IP, se o seu deploy tiver IP fixo)
- *API restrictions* → **Places API (New)**, **Routes API** e **Maps Static API**

### Controle de custo

O projeto foi escrito para gastar pouco:

- **Field masks** em todas as chamadas: pedimos só os campos usados.
- **Session tokens** no autocomplete: a busca e os detalhes contam como uma cobrança.
- **Debounce de 320 ms** e mínimo de 3 caracteres antes de consultar.
- **Place ID e coordenadas gravados no banco**: um local pesquisado uma vez não é
  pesquisado de novo.
- **Cache de rotas** na tabela `route_legs_cache`, válido por 30 dias, com botão
  *Atualizar rota* para forçar novo cálculo.
- **Nada é recalculado a cada renderização**: o cálculo só acontece quando você pede.
- **A geração do PDF não chama o Google**: usa apenas o que já está em cache.

Recomendado: defina um orçamento com alertas em *Billing → Budgets & alerts* e
uma cota diária em *APIs & Services → Quotas*.

---

## Segurança e Row Level Security

Três princípios guiam o projeto:

**1. O banco é a última palavra.** Toda tabela tem RLS ativo. As políticas se
baseiam na tabela `trip_members` e valem mesmo que alguém chame a API do Supabase
diretamente, sem passar pela interface. Esconder um botão é conveniência; a
proteção real está no Postgres.

**2. Chaves de servidor não vão para o navegador.** Places, Routes e Static Maps
são chamadas por rotas internas (`/api/places/*`, `/api/routes/compute`,
`/api/maps/static`), que verificam a sessão antes de repassar.

**3. Documentos são privados de verdade.** O bucket `trip-documents` não é
público. Cada visualização gera uma URL assinada que expira em 5 minutos, e a
política do Storage confere se o usuário participa da viagem daquele arquivo.

### Papéis

| Papel | Pode |
| --- | --- |
| **Proprietário** | Tudo: editar, excluir, convidar, gerenciar participantes, transferir a viagem |
| **Editor** | Visualizar, adicionar e editar informações; enviar documentos |
| **Visualizador** | Visualizar, gerar PDF, acessar mapas e documentos |

Convites são vinculados ao e-mail: o link só funciona para quem foi convidado.

### O que o sistema não guarda

Dados de cartão de crédito. Não há campo para isso e não deve haver. Para
pagamentos, registre apenas a forma (“cartão de crédito”, “Pix”) e o valor.

---

## Desenvolvimento

```bash
npm run dev         # servidor de desenvolvimento
npm run build       # build de produção
npm start           # roda o build
npm run lint        # ESLint
npm run typecheck   # TypeScript sem emitir arquivos
npm test            # testes de lógica (Vitest)
npm run db:test     # testes de RLS em um PostgreSQL temporário
npm run check       # typecheck + testes + build, tudo de uma vez
```

Antes de considerar uma etapa concluída, rode `npm run check`.

---

## Testes

### Lógica da aplicação (`npm test`)

111 testes cobrindo o que quebra silenciosamente se estiver errado:

- **Datas e fusos** — conversão entre horário local e instante absoluto, duração
  real de voos entre fusos diferentes, horário de verão, contagem de dias e noites.
- **Dinheiro** — leitura de “1.250,00”, arredondamento sem erro de ponto
  flutuante, divisão entre viajantes sem perder centavos.
- **Financeiro** — orçado × real, gastos por categoria, balanço entre
  participantes e sugestão de acerto de contas.
- **Permissões** — o que cada papel pode fazer (espelha o RLS).
- **URLs do Google Maps** — origem, destino, paradas e modo de transporte.
- **Roteiro** — montagem da linha do tempo, ordenação e aviso de deslocamento
  que não cabe no intervalo entre eventos.
- **Validações** — todos os formulários, incluindo os casos que devem falhar.

### Banco de dados (`npm run db:test`)

Sobe um PostgreSQL temporário, aplica as migrations e verifica na prática, com
quatro usuários diferentes, que:

- quem não participa da viagem não enxerga nem consegue inserir nada;
- o visualizador vê tudo mas não altera nada;
- o editor cria conteúdo mas não convida ninguém nem exclui a viagem;
- o proprietário não pode ser trocado por um `UPDATE` comum;
- um convite endereçado a outro e-mail é recusado;
- documentos no Storage só aparecem para participantes;
- excluir a viagem limpa tudo em cascata, sem deixar órfãos.

Precisa de PostgreSQL 15+ instalado na máquina. Não usa Docker nem toca no
projeto Supabase real.

---

## Deploy na Vercel

1. Suba o repositório para o GitHub.
2. Em <https://vercel.com>, importe o projeto (o Next.js é detectado sozinho).
3. Em *Settings → Environment Variables*, cadastre:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (opcional)
   - `GOOGLE_MAPS_SERVER_API_KEY` (opcional)
   - `NEXT_PUBLIC_APP_URL` com o domínio final
4. Faça o deploy.
5. Volte ao Supabase e adicione o domínio em *Authentication → URL Configuration*.
6. Volte ao Google Cloud e adicione o domínio nas restrições de referrer da chave
   do navegador.

---

## Backup e migrations

### Backup

- O Supabase faz backup automático diário (a retenção depende do plano).
- Backup manual do banco inteiro:
  ```bash
  npx supabase db dump --db-url "postgresql://postgres:SENHA@db.<ref>.supabase.co:5432/postgres" -f backup.sql
  ```
- Cada usuário pode exportar a própria viagem pela interface, em
  *Configurações → Exportar*: JSON completo, CSV de despesas e `.ics` do calendário.
- Os arquivos do Storage não entram no dump do banco; baixe-os separadamente pelo
  painel ou pela CLI, se quiser um backup completo.

### Migrations

Nunca altere o banco pelo painel sem registrar a mudança:

1. Crie um arquivo em `supabase/migrations/` com data e hora no nome:
   `AAAAMMDDHHMMSS_descricao.sql`.
2. Escreva a alteração de forma idempotente (`create ... if not exists`,
   `drop policy if exists ...`).
3. Rode `npm run db:test` para conferir que tudo continua de pé.
4. Atualize `src/types/database.ts` se a mudança afetar colunas.
5. Aplique com `npx supabase db push`.

---

## PWA e uso offline

O aplicativo é instalável: no Android e no desktop aparece o convite “Instalar”;
no iPhone, use *Compartilhar → Adicionar à Tela de Início*.

O service worker (`public/sw.js`) guarda:

- os arquivos estáticos do Next (cache primeiro);
- as páginas que você já abriu (rede primeiro, cache como rede de segurança).

Na prática: **abra antes de viajar** as seções que vai precisar (roteiro, voos,
hospedagem, documentos) e elas continuam acessíveis sem internet, em modo leitura.

Nunca vão para o cache: chamadas de API, páginas de autenticação e arquivos do
Storage. Ao sair da conta, o cache de páginas é apagado — importante em aparelho
compartilhado.

Para uma garantia a mais, gere o **PDF da viagem**: ele foi feito para ser útil
sem rede, com endereço, horário, telefone e código de reserva sempre em texto —
os QR Codes são um atalho, nunca a única forma de chegar à informação.

---

## Estrutura de pastas

```
src/
├── app/
│   ├── (auth)/            login, cadastro, recuperação de senha
│   ├── (app)/             área autenticada
│   │   ├── page.tsx           dashboard
│   │   ├── viagens/           lista, criação
│   │   └── viagens/[tripId]/  home, roteiro, mapa, financeiro, PDF…
│   ├── api/               rotas internas (Places, Routes, Static Maps, exportações)
│   ├── auth/callback/     retorno de e-mail e OAuth
│   ├── convite/[token]/   aceite de convite
│   └── configurar/        diagnóstico das integrações
├── components/
│   ├── ui/                botões, campos, diálogos, cards
│   ├── layout/            cabeçalho, navegação inferior, barra lateral
│   ├── trip/  flights/  stays/  cars/  itinerary/  maps/  finance/
│   ├── documents/  checklist/  pdf/  shared/
├── lib/
│   ├── supabase/          clientes de navegador, servidor e sessão
│   ├── google/            URLs do Maps, Places, Routes, polyline, mapa estático
│   ├── format/            datas, dinheiro e distâncias (centralizados)
│   ├── domain/            linha do tempo, conflitos, cálculos financeiros
│   ├── validators/        schemas Zod
│   ├── pdf/               montagem do documento e QR Codes
│   └── calendar/          .ics e Google Calendar
├── server/
│   ├── actions/           Server Actions por módulo
│   ├── queries/           leitura de dados
│   └── trip-access.ts     verificação de permissão
├── types/                 tipos do banco
└── proxy.ts               renovação de sessão e proteção de rotas

supabase/
├── migrations/            schema, RLS, funções e storage
├── seed/                  viagem de demonstração
└── tests/                 testes de RLS
```

---

## Solução de problemas

**O aplicativo redireciona para `/configurar`.**
As variáveis do Supabase não foram lidas. Confira se o arquivo se chama
`.env.local` (não `.env.example`) e reinicie o `npm run dev` — o Next só lê as
variáveis na inicialização.

**“Você não tem permissão para esta ação nesta viagem.”**
Seu papel na viagem é de visualizador, ou as migrations de RLS não foram
aplicadas. Rode `npm run db:test` para verificar as políticas.

**O e-mail de confirmação não chega.**
Em desenvolvimento, o Supabase limita o envio. Você pode confirmar a conta
manualmente em *Authentication → Users*, ou desligar a confirmação obrigatória em
*Authentication → Providers → Email* enquanto desenvolve.

**A busca de endereços não retorna nada.**
Confira se a **Places API (New)** está habilitada (não a Places API antiga) e se
`GOOGLE_MAPS_SERVER_API_KEY` está definida. A página `/configurar` mostra o
estado de cada integração.

**O mapa aparece cinza ou com marca d'água.**
Normalmente é restrição de referrer ou faturamento desativado no Google Cloud.
Abra o console do navegador: a mensagem de erro do Google diz exatamente o motivo.

**“Não foi possível atualizar a rota neste momento.”**
A Routes API não respondeu. A página não quebra: o roteiro segue funcionando sem
a estimativa e o botão *Tentar de novo* refaz a chamada.

**O PDF sai sem os mapas.**
Os mapas dependem da **Maps Static API** com a chave de servidor. Sem ela, o
roteiro sai completo, apenas sem as imagens — a lista numerada de paradas continua.

**`npm run db:test` diz que o PostgreSQL não foi encontrado.**
Instale o pacote (`sudo apt install postgresql` ou `brew install postgresql@16`)
ou aponte o caminho: `PGBIN=/caminho/para/bin npm run db:test`.

---

## Próximos passos previstos

A arquitetura já está preparada, mas **nada disso é necessário** para o uso diário:

- **Importação de reservas por API oficial** (Amadeus, Skyscanner ou similar). A
  camada de serviço é abstrata de propósito, para trocar de fornecedor sem
  reescrever o sistema. *Scraping de Google Flights, Booking ou Airbnb não será
  implementado* — só APIs autorizadas.
- **Cotação automática de moedas**: hoje o câmbio é digitado; o valor original
  nunca é sobrescrito, então a troca por uma API é direta.
- **Notificações push**: a tabela `notifications` já existe.
- **Favoritos entre viagens**: hoje os favoritos são por viagem.
- **Internacionalização**: toda a formatação de data e dinheiro já está
  centralizada em `src/lib/format/`.
