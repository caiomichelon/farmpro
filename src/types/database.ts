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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
