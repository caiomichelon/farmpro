/**
 * Tipos do schema Supabase usados pelo app.
 *
 * Mantido manualmente por enquanto, espelhando supabase/migrations/0001_init.sql.
 * Quando o projeto Supabase estiver criado, isso pode ser substituído pelo
 * gerador oficial: `supabase gen types typescript`.
 */

export type PlotType = 'lavoura' | 'pecuaria';
export type FarmRole = 'admin' | 'campo';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';
export type SeasonStatus = 'planejada' | 'plantada' | 'colhendo' | 'colhida';
export type ProductionCostCategory =
  | 'semente'
  | 'adubo'
  | 'defensivo'
  | 'combustivel'
  | 'mao_de_obra'
  | 'outro';
export type CattleLotStatus = 'ativo' | 'vendido' | 'abatido';

export type Profile = {
  id: string;
  full_name: string | null;
  created_at: string;
};

export type Farm = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  created_at: string;
  created_by: string;
};

export type FarmMember = {
  farm_id: string;
  user_id: string;
  role: FarmRole;
  created_at: string;
};

export type Plot = {
  id: string;
  farm_id: string;
  name: string;
  area_hectares: number;
  type: PlotType;
  created_at: string;
};

/** Uma safra (ciclo de plantio) de um talhão. Ver 0003_lavoura.sql. */
export type PlotSeason = {
  id: string;
  plot_id: string;
  season_label: string;
  crop: string;
  variety: string | null;
  planted_area_hectares: number;
  planting_date: string | null;
  status: SeasonStatus;
  created_at: string;
};

/** Custo de produção (insumo) de uma safra — também cobre o histórico de
 * aplicação de defensivo/adubo (categoria + applied_at). */
export type ProductionCost = {
  id: string;
  plot_season_id: string;
  category: ProductionCostCategory;
  description: string;
  quantity: number | null;
  unit: string | null;
  unit_cost: number | null;
  total_cost: number;
  applied_at: string;
  created_at: string;
};

/** Um lançamento de colheita (diário) de uma safra. */
export type HarvestEntry = {
  id: string;
  plot_season_id: string;
  harvested_at: string;
  quantity_sacas: number;
  notes: string | null;
  created_at: string;
};

/** Comprador de grão (trading/cerealista). */
export type GrainBuyer = {
  id: string;
  farm_id: string;
  name: string;
  notes: string | null;
  created_at: string;
};

/** Venda de grão, lançada a partir da tela de colheita de uma safra. */
export type GrainSale = {
  id: string;
  plot_season_id: string;
  buyer_id: string | null;
  sale_date: string;
  quantity_sacas: number;
  price_per_saca: number;
  notes: string | null;
  created_at: string;
};

/** Lote de gado de corte — controle é por lote, não por animal individual. */
export type CattleLot = {
  id: string;
  farm_id: string;
  plot_id: string | null;
  name: string;
  entry_date: string;
  entry_head_count: number;
  entry_avg_weight_kg: number;
  status: CattleLotStatus;
  created_at: string;
};

/** Pesagem periódica de um lote — base do GMD e do escore de condição corporal. */
export type CattleLotWeighing = {
  id: string;
  lot_id: string;
  weighed_at: string;
  avg_weight_kg: number;
  head_count: number | null;
  body_condition_score: number | null;
  notes: string | null;
  created_at: string;
};

/** Evento de mortalidade de um lote — base da taxa de mortalidade. */
export type CattleMortalityEvent = {
  id: string;
  lot_id: string;
  event_date: string;
  head_count: number;
  cause: string | null;
  notes: string | null;
  created_at: string;
};

/** Frigorífico comprador. */
export type Slaughterhouse = {
  id: string;
  farm_id: string;
  name: string;
  notes: string | null;
  created_at: string;
};

/** Registro de abate por frigorífico — indicadores zootécnicos de saída. */
export type CattleSlaughter = {
  id: string;
  lot_id: string;
  slaughterhouse_id: string | null;
  slaughter_date: string;
  head_count: number;
  exit_avg_weight_kg: number;
  carcass_yield_pct: number | null;
  fat_finish_score: number | null;
  feed_conversion_ratio: number | null;
  price_per_arroba: number;
  next_slaughter_date: string | null;
  notes: string | null;
  created_at: string;
};

/** Matriz (vaca reprodutora) — área de Cria/Reprodução, separada do Corte. */
export type BreedingCow = {
  id: string;
  farm_id: string;
  identification: string;
  birth_date: string | null;
  notes: string | null;
  created_at: string;
};

/** Inseminação de uma matriz. */
export type Insemination = {
  id: string;
  cow_id: string;
  insemination_date: string;
  veterinarian: string | null;
  method: string | null;
  sire_or_semen: string | null;
  expected_calving_date: string | null;
  notes: string | null;
  created_at: string;
};

/** Parto de uma matriz — histórico de quantos bezerros ela já deu. */
export type Calving = {
  id: string;
  cow_id: string;
  insemination_id: string | null;
  calving_date: string;
  calf_count: number;
  calf_identification: string | null;
  notes: string | null;
  created_at: string;
};

/**
 * Preparação para o futuro — ainda sem gateway de pagamento integrado.
 * Ver supabase/migrations/0002_subscriptions_placeholder.sql.
 */
export type Subscription = {
  id: string;
  owner_id: string;
  status: SubscriptionStatus;
  plan: string | null;
  provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      farms: {
        Row: Farm;
        Insert: Partial<Farm> & { name: string; created_by: string };
        Update: Partial<Farm>;
        Relationships: [];
      };
      farm_members: {
        Row: FarmMember;
        Insert: Partial<FarmMember> & { farm_id: string; user_id: string };
        Update: Partial<FarmMember>;
        Relationships: [];
      };
      plots: {
        Row: Plot;
        Insert: Partial<Plot> & { farm_id: string; name: string; area_hectares: number; type: PlotType };
        Update: Partial<Plot>;
        Relationships: [];
      };
      subscriptions: {
        Row: Subscription;
        Insert: Partial<Subscription> & { owner_id: string };
        Update: Partial<Subscription>;
        Relationships: [];
      };
      plot_seasons: {
        Row: PlotSeason;
        Insert: Partial<PlotSeason> & {
          plot_id: string;
          season_label: string;
          crop: string;
          planted_area_hectares: number;
        };
        Update: Partial<PlotSeason>;
        Relationships: [];
      };
      production_costs: {
        Row: ProductionCost;
        Insert: Partial<ProductionCost> & {
          plot_season_id: string;
          category: ProductionCostCategory;
          description: string;
          total_cost: number;
        };
        Update: Partial<ProductionCost>;
        Relationships: [];
      };
      harvest_entries: {
        Row: HarvestEntry;
        Insert: Partial<HarvestEntry> & { plot_season_id: string; quantity_sacas: number };
        Update: Partial<HarvestEntry>;
        Relationships: [];
      };
      grain_buyers: {
        Row: GrainBuyer;
        Insert: Partial<GrainBuyer> & { farm_id: string; name: string };
        Update: Partial<GrainBuyer>;
        Relationships: [];
      };
      grain_sales: {
        Row: GrainSale;
        Insert: Partial<GrainSale> & {
          plot_season_id: string;
          quantity_sacas: number;
          price_per_saca: number;
        };
        Update: Partial<GrainSale>;
        Relationships: [];
      };
      cattle_lots: {
        Row: CattleLot;
        Insert: Partial<CattleLot> & {
          farm_id: string;
          name: string;
          entry_head_count: number;
          entry_avg_weight_kg: number;
        };
        Update: Partial<CattleLot>;
        Relationships: [];
      };
      cattle_lot_weighings: {
        Row: CattleLotWeighing;
        Insert: Partial<CattleLotWeighing> & { lot_id: string; avg_weight_kg: number };
        Update: Partial<CattleLotWeighing>;
        Relationships: [];
      };
      cattle_mortality_events: {
        Row: CattleMortalityEvent;
        Insert: Partial<CattleMortalityEvent> & { lot_id: string; head_count: number };
        Update: Partial<CattleMortalityEvent>;
        Relationships: [];
      };
      slaughterhouses: {
        Row: Slaughterhouse;
        Insert: Partial<Slaughterhouse> & { farm_id: string; name: string };
        Update: Partial<Slaughterhouse>;
        Relationships: [];
      };
      cattle_slaughters: {
        Row: CattleSlaughter;
        Insert: Partial<CattleSlaughter> & {
          lot_id: string;
          head_count: number;
          exit_avg_weight_kg: number;
          price_per_arroba: number;
        };
        Update: Partial<CattleSlaughter>;
        Relationships: [];
      };
      breeding_cows: {
        Row: BreedingCow;
        Insert: Partial<BreedingCow> & { farm_id: string; identification: string };
        Update: Partial<BreedingCow>;
        Relationships: [];
      };
      inseminations: {
        Row: Insemination;
        Insert: Partial<Insemination> & { cow_id: string };
        Update: Partial<Insemination>;
        Relationships: [];
      };
      calvings: {
        Row: Calving;
        Insert: Partial<Calving> & { cow_id: string };
        Update: Partial<Calving>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
