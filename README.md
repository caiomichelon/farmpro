# FarmPro

Aplicativo técnico de gestão para o agronegócio brasileiro (lavoura + pecuária
de corte e cria), multiplataforma (App Store e Google Play).

Stack: **React Native (Expo) + TypeScript + Expo Router**, backend em
**Supabase** (Postgres, Auth, Storage).

## Estado atual

- **Fundação**: capa, login/cadastro, seleção de fazenda (multi-fazenda),
  tela principal com resumo (hectares, talhões, lavoura x pecuária) e a barra
  de commodities fixa no topo.
- **Módulo Lavoura**: talhões, safra por talhão (cultura, variedade, área
  plantada — o histórico de safras forma a rotação de cultura e a
  produtividade histórica), custo de produção por categoria, acompanhamento
  de colheita em tempo real, venda (lançada dentro da colheita) e compradores
  de grão com ranking de melhor preço.
- **Módulo Pecuária — Corte**: lotes (controle por lote, não por animal),
  pesagens com escore de condição corporal e GMD calculado, mortalidade por
  lote, frigoríficos e registro de abate (rendimento de carcaça, acabamento
  de gordura, conversão alimentar, preço por arroba) com ranking de melhor
  comprador.
- **Módulo Pecuária — Cria/Reprodução**: matrizes, inseminação (com previsão
  automática de parto) e registro de parto, formando o histórico de bezerros
  por vaca.

Ainda não construído: **Gestão de funcionários** e as funcionalidades
transversais do briefing (permissões por perfil aplicadas na UI, painel
financeiro consolidado, alertas, offline-first, gráficos, exportação de
relatórios).

Veja o briefing completo do projeto para o escopo total.

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha com as chaves do seu projeto Supabase
npm start               # abre o Expo Dev Tools / QR code (Expo Go)
npm run web              # roda no navegador
```

Se você alterar o `.env` depois de já ter rodado o app uma vez, limpe o cache
do bundler ao reiniciar (`npx expo start --clear` / `npx expo export --clear`)
— senão o build antigo (sem as novas variáveis) pode ficar em cache.

Como o desenvolvimento é feito sem Mac/Xcode local, builds para as lojas
(iOS/Android) devem ser feitos em nuvem via [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npx eas-cli build --platform all
```

## Configurando o backend (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No painel do projeto, clique em **Connect** e copie a **Project URL** e a
   **anon / publishable key** para o seu `.env` (ver `.env.example`).
3. Rode as migrations em **SQL Editor**, colando o conteúdo de cada arquivo
   de `supabase/migrations/` **em ordem** (`0001` → `0002` → `0003` → `0004`),
   ou tudo de uma vez (são idempotentes, seguras para rodar mais de uma vez).
   Também dá para usar a Supabase CLI: `supabase db push`.
4. Para testar login sem precisar confirmar e-mail: **Authentication →
   Providers → Email**, desligue **"Confirm email"**. Lembre de ligar de
   volta antes de lançar para usuários de verdade.

## Estrutura

```
app/                  # Rotas (Expo Router — cada arquivo é uma tela)
  index.tsx            # Capa/entrada
  auth/                # Login e cadastro
  farms/                # Seleção de fazenda + telas por fazenda
    [farmId]/            # Tela principal
      lavoura/             # Módulo Lavoura
      pecuaria/             # Módulo Pecuária (corte/ e cria/)
src/
  components/          # Componentes de UI reutilizáveis
  context/             # AuthContext (sessão Supabase)
  hooks/               # Um hook por entidade (fazendas, talhões, lotes...)
  lib/                 # Cliente Supabase
  data/                 # Fontes de dados e listas de opção (ex.: cotações — hoje mock)
  theme/                # Cores, tipografia, espaçamento
  types/                # Tipos do banco (espelham as migrations)
supabase/
  migrations/          # SQL do schema, em ordem
```

## Pendências conhecidas desta fase

- **Cotação em tempo real**: a barra de commodities usa dados mock
  (`src/data/commodities.ts`). Falta decidir o provedor de dados (CEPEA/B3/
  cooperativa) para integrar de verdade.
- **Offline-first**: ainda não implementado — é um requisito crítico do
  briefing, a entrar numa fase de polimento depois que os módulos principais
  estiverem todos prontos.
- **Permissões por perfil**: a tabela `farm_members` já tem os papéis
  `admin`/`campo`, mas a aplicação ainda não restringe telas por papel.
- **Gestão de funcionários**: módulo ainda não iniciado.
