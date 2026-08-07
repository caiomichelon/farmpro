# FarmPro

Aplicativo técnico de gestão para o agronegócio brasileiro (lavoura + pecuária
de corte e cria), multiplataforma (App Store e Google Play).

Stack: **React Native (Expo) + TypeScript + Expo Router**, backend em
**Supabase** (Postgres, Auth, Storage).

## Estado atual

Esta é a **fundação** do app: capa, login/cadastro, seleção de fazenda (multi
-fazenda), tela principal com resumo (hectares, talhões, lavoura x pecuária)
e a barra de commodities fixa no topo. Os módulos Lavoura, Pecuária (Corte e
Cria/Reprodução) e Funcionários ainda não foram construídos — os botões da
tela principal levam a telas de "em construção".

Veja o briefing completo do projeto para o escopo total.

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha com as chaves do seu projeto Supabase
npm start               # abre o Expo Dev Tools / QR code (Expo Go)
npm run web              # roda no navegador
```

Como o desenvolvimento é feito sem Mac/Xcode local, builds para as lojas
(iOS/Android) devem ser feitos em nuvem via [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npx eas-cli build --platform all
```

## Configurando o backend (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Project Settings > API**, copie a `Project URL` e a `anon public key`
   para o seu `.env` (ver `.env.example`).
3. Rode a migration inicial em **SQL Editor**, colando o conteúdo de
   `supabase/migrations/0001_init.sql` (ou via Supabase CLI: `supabase db push`).

O schema inicial cria: `profiles`, `farms`, `farm_members` (base do sistema de
permissões admin/campo) e `plots` (talhões — usado por enquanto só para o
resumo da tela principal; o cadastro completo de talhão vem com o módulo
Lavoura).

## Estrutura

```
app/                  # Rotas (Expo Router — cada arquivo é uma tela)
  index.tsx            # Capa/entrada
  auth/                # Login e cadastro
  farms/                # Seleção de fazenda + telas por fazenda
    [farmId]/            # Tela principal, Lavoura, Pecuária (por fazenda)
src/
  components/          # Componentes de UI reutilizáveis
  context/             # AuthContext (sessão Supabase)
  hooks/               # useFarms, useFarm
  lib/                 # Cliente Supabase
  data/                 # Fontes de dados (ex.: cotações — hoje mock)
  theme/                # Cores, tipografia, espaçamento
  types/                # Tipos do banco (espelham as migrations)
supabase/
  migrations/          # SQL do schema
```

## Pendências conhecidas desta fase

- **Cotação em tempo real**: a barra de commodities usa dados mock
  (`src/data/commodities.ts`). Falta decidir o provedor de dados (CEPEA/B3/
  cooperativa) para integrar de verdade.
- **Offline-first**: ainda não implementado — é um requisito crítico do
  briefing e deve entrar quando os módulos com lançamento de dados em campo
  (Lavoura, Pecuária) forem construídos.
- **Permissões por perfil**: a tabela `farm_members` já tem os papéis
  `admin`/`campo`, mas a aplicação ainda não restringe telas por papel.
