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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
