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
export type EmployeeSector = 'lavoura' | 'corte' | 'cria' | 'escritorio';
export type EmployeeCostType = 'mensalista' | 'diarista' | 'tarefa';
export type EmployeeStatus = 'ativo' | 'inativo';
export type TimeEntryType = 'entrada' | 'saida_almoco' | 'volta_almoco' | 'saida';
export type CattleAnimalStatus = 'ativo' | 'vendido' | 'abatido' | 'morto';
export type CattleAnimalSex = 'macho' | 'femea';
export type CattleHealthEventType = 'vacina' | 'tratamento' | 'doenca' | 'outro';

/** Chaves de preferência de alerta — usadas em Ajustes → Notificações pra
 * ligar/desligar cada tipo de alerta inteligente mostrado na home da fazenda. */
export type AlertPreferenceKey =
  | 'documentos'
  | 'mortalidade'
  | 'peso_lote'
  | 'financeiro_safra'
  | 'vacina_pendente'
  | 'parto_previsto'
  | 'clima'
  | 'abigeato'
  | 'cocho_baixo'
  | 'boletim_diario';
export type AlertPreferences = Partial<Record<AlertPreferenceKey, boolean>>;

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  alert_preferences: AlertPreferences;
  created_at: string;
};

/** Convite por código pra entrar numa fazenda já existente (multiusuário). */
export type FarmInvite = {
  id: string;
  farm_id: string;
  code: string;
  role: FarmRole;
  created_by: string;
  expires_at: string;
  created_at: string;
};

export type Farm = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  /** Localização usada pros alertas de clima proativos — nulo até o usuário
   * capturar a posição atual em Clima → "Ativar alertas de clima". */
  latitude: number | null;
  longitude: number | null;
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
  photo_url: string | null;
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
  /** Meta de peso vivo (kg) pra considerar o lote pronto pra abate. Opcional. */
  target_slaughter_weight_kg: number | null;
  /** Rendimento de carcaça estimado (%) — usado só pra projeção financeira
   * antes do abate de verdade (que tem seu próprio rendimento real). */
  estimated_carcass_yield_pct: number;
  created_at: string;
};

export type CattleLotCostCategory = 'racao' | 'sanidade' | 'frete' | 'mao_de_obra' | 'outro';

/** Custo lançado num lote de corte — ração, sanidade, frete, mão de obra. */
export type CattleLotCost = {
  id: string;
  lot_id: string;
  category: CattleLotCostCategory;
  description: string;
  amount: number;
  applied_at: string;
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
  photo_url: string | null;
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

export type BreedingCowCostCategory = 'racao' | 'sanidade' | 'mao_de_obra' | 'outro';

/** Custo lançado numa matriz — ração, sanidade, mão de obra. */
export type BreedingCowCost = {
  id: string;
  cow_id: string;
  category: BreedingCowCostCategory;
  description: string;
  amount: number;
  applied_at: string;
  created_at: string;
};

export type PregnancyDiagnosisResult = 'positivo' | 'negativo' | 'reabsorcao';

/** Diagnóstico de gestação (DG) — confirma ou descarta a prenhez de uma
 * inseminação, normalmente feito ~30 dias depois por palpação/ultrassom. */
export type PregnancyDiagnosis = {
  id: string;
  insemination_id: string;
  diagnosis_date: string;
  result: PregnancyDiagnosisResult;
  method: string | null;
  notes: string | null;
  created_at: string;
};

/** Desmame de um parto — peso e data em que o(s) bezerro(s) foram
 * desmamados, base do "peso de desmame" (KPI zootécnico padrão). */
export type Weaning = {
  id: string;
  calving_id: string;
  weaning_date: string;
  weight_kg: number | null;
  notes: string | null;
  created_at: string;
};

/** Pesagem/escore de condição corporal (ECC) da própria matriz — nutrição
 * afeta reprodução diretamente. */
export type CowWeighing = {
  id: string;
  cow_id: string;
  weighed_at: string;
  weight_kg: number;
  body_condition_score: number | null;
  notes: string | null;
  created_at: string;
};

/** Ficha completa de um funcionário — separado por setor. */
export type Employee = {
  id: string;
  farm_id: string;
  full_name: string;
  sector: EmployeeSector;
  role: string;
  cost_type: EmployeeCostType;
  cost_value: number;
  cpf: string | null;
  phone: string | null;
  admission_date: string;
  birth_date: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  status: EmployeeStatus;
  notes: string | null;
  created_at: string;
};

export type EmployeeMessageSender = 'funcionario' | 'gerente';

/** Mensagem de chat entre funcionário e gerente — sem login separado pro
 * funcionário, "sender" é só a etiqueta de quem está escrevendo naquele
 * momento (mesmo padrão do ponto digital: dispositivo compartilhado). */
export type EmployeeMessage = {
  id: string;
  employee_id: string;
  sender: EmployeeMessageSender;
  body: string;
  read_at: string | null;
  created_at: string;
};

/** Documento de um funcionário — base dos alertas de documentação. */
export type EmployeeDocument = {
  id: string;
  employee_id: string;
  document_type: string;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
};

/** Registro de ponto digital, com geolocalização. */
export type TimeEntry = {
  id: string;
  employee_id: string;
  entry_type: TimeEntryType;
  recorded_at: string;
  latitude: number | null;
  longitude: number | null;
  location_accuracy_m: number | null;
  notes: string | null;
  created_at: string;
};

/** Lançamento do histórico de produtividade de um funcionário. */
export type ProductivityRecord = {
  id: string;
  employee_id: string;
  record_date: string;
  activity: string;
  quantity: number;
  unit: string;
  notes: string | null;
  created_at: string;
};

/** Animal individual dentro de um lote — ficha completa, com brinco. */
export type CattleAnimal = {
  id: string;
  farm_id: string;
  lot_id: string;
  tag_number: string;
  sex: CattleAnimalSex | null;
  breed: string | null;
  entry_weight_kg: number | null;
  entry_date: string;
  status: CattleAnimalStatus;
  notes: string | null;
  created_at: string;
};

/** Pesagem individual de um animal. */
export type CattleAnimalWeighing = {
  id: string;
  animal_id: string;
  weighed_at: string;
  weight_kg: number;
  body_condition_score: number | null;
  notes: string | null;
  created_at: string;
};

/** Evento de saúde de um animal (vacina, tratamento, doença). */
export type CattleAnimalHealthEvent = {
  id: string;
  animal_id: string;
  event_date: string;
  event_type: CattleHealthEventType;
  description: string;
  notes: string | null;
  photo_url: string | null;
  /** Data da próxima dose/retorno — opcional, base do alerta de "vacina pendente". */
  next_due_date: string | null;
  /** Protocolo sanitário que originou este evento, se algum foi escolhido. */
  protocol_id: string | null;
  created_at: string;
};

/** Protocolo sanitário recorrente da fazenda (ex.: "Aftosa" a cada 180 dias) —
 * usado pra sugerir/calcular a próxima dose automaticamente ao registrar um
 * evento de saúde de um animal. */
export type CattleHealthProtocol = {
  id: string;
  farm_id: string;
  name: string;
  event_type: CattleHealthEventType;
  interval_days: number;
  notes: string | null;
  created_at: string;
};

/** Movimentação de um animal entre lotes. */
export type CattleAnimalMovement = {
  id: string;
  animal_id: string;
  from_lot_id: string | null;
  to_lot_id: string;
  moved_at: string;
  notes: string | null;
  created_at: string;
};

export type CattleFieldCollectionCategory =
  | 'suplementacao'
  | 'altura_forragem'
  | 'rebanho'
  | 'aguada'
  | 'sanidade'
  | 'cerca';

export type CattleFieldCollectionStatus =
  | 'dentro_padrao'
  | 'fora_padrao'
  | 'atencao'
  | 'acima_padrao'
  | 'nao_realizada'
  | 'ausencia_gado';

/** Checagem rápida de campo de um lote (categoria + situação), com foto e
 * GPS como evidência de que o funcionário passou lá — inspirado em apps de
 * monitoramento de pasto já usados no setor. */
export type CattleFieldCollection = {
  id: string;
  lot_id: string;
  category: CattleFieldCollectionCategory;
  status: CattleFieldCollectionStatus;
  notes: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  location_accuracy_m: number | null;
  /** Contagem de cabeças, só quando `category === 'rebanho'` — base do
   * detector de possível abigeato. */
  head_count: number | null;
  /** Nível (%) do cocho/aguada, só quando `category === 'aguada'`. */
  level_pct: number | null;
  collected_at: string;
  created_at: string;
};

export type CattleInventoryCategory = 'racao' | 'nucleo_mineral' | 'medicamento' | 'outro';
export type CattleInventoryUnit = 'kg' | 'saco' | 'litro' | 'dose' | 'unidade';
export type CattleInventoryMovementType = 'entrada' | 'saida';

/** Item de estoque da pecuária (ração, núcleo/sal mineral, medicamento
 * veterinário) — a quantidade atual não fica aqui, é calculada a partir do
 * estoque inicial + movimentações (ver useCattleInventoryItems). */
export type CattleInventoryItem = {
  id: string;
  farm_id: string;
  name: string;
  category: CattleInventoryCategory;
  unit: CattleInventoryUnit;
  initial_quantity: number;
  /** Abaixo disso, o item entra em alerta de estoque baixo. Null = sem alerta. */
  min_quantity: number | null;
  unit_cost: number | null;
  notes: string | null;
  created_at: string;
};

/** Entrada (compra) ou saída (consumo) de um item de estoque — a saída
 * pode opcionalmente indicar pra qual lote foi (ex.: ração consumida pelo
 * Lote 5). */
export type CattleInventoryMovement = {
  id: string;
  item_id: string;
  type: CattleInventoryMovementType;
  quantity: number;
  lot_id: string | null;
  notes: string | null;
  moved_at: string;
  created_at: string;
};

export type LavouraInventoryCategory = 'sementes' | 'fertilizante' | 'defensivo' | 'combustivel' | 'outro';
export type LavouraInventoryUnit = CattleInventoryUnit;
export type LavouraInventoryMovementType = CattleInventoryMovementType;

/** Item de estoque da Lavoura (sementes, fertilizante, defensivo,
 * combustível) — mesmo desenho do estoque da Pecuária: quantidade atual
 * calculada, nunca guardada solta. */
export type LavouraInventoryItem = {
  id: string;
  farm_id: string;
  name: string;
  category: LavouraInventoryCategory;
  unit: LavouraInventoryUnit;
  initial_quantity: number;
  min_quantity: number | null;
  unit_cost: number | null;
  notes: string | null;
  created_at: string;
};

/** Entrada (compra) ou saída (aplicação) de um item de estoque da
 * Lavoura — a saída pode indicar em qual safra foi usada. */
export type LavouraInventoryMovement = {
  id: string;
  item_id: string;
  type: LavouraInventoryMovementType;
  quantity: number;
  plot_season_id: string | null;
  notes: string | null;
  moved_at: string;
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
      farm_invites: {
        Row: FarmInvite;
        Insert: Partial<FarmInvite> & { farm_id: string; code: string; created_by: string };
        Update: Partial<FarmInvite>;
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
      cattle_lot_costs: {
        Row: CattleLotCost;
        Insert: Partial<CattleLotCost> & { lot_id: string; description: string; amount: number };
        Update: Partial<CattleLotCost>;
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
      breeding_cow_costs: {
        Row: BreedingCowCost;
        Insert: Partial<BreedingCowCost> & { cow_id: string; description: string; amount: number };
        Update: Partial<BreedingCowCost>;
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
      pregnancy_diagnoses: {
        Row: PregnancyDiagnosis;
        Insert: Partial<PregnancyDiagnosis> & { insemination_id: string; result: PregnancyDiagnosisResult };
        Update: Partial<PregnancyDiagnosis>;
        Relationships: [];
      };
      weanings: {
        Row: Weaning;
        Insert: Partial<Weaning> & { calving_id: string };
        Update: Partial<Weaning>;
        Relationships: [];
      };
      cow_weighings: {
        Row: CowWeighing;
        Insert: Partial<CowWeighing> & { cow_id: string; weight_kg: number };
        Update: Partial<CowWeighing>;
        Relationships: [];
      };
      employees: {
        Row: Employee;
        Insert: Partial<Employee> & {
          farm_id: string;
          full_name: string;
          sector: EmployeeSector;
          role: string;
          cost_value: number;
        };
        Update: Partial<Employee>;
        Relationships: [];
      };
      employee_documents: {
        Row: EmployeeDocument;
        Insert: Partial<EmployeeDocument> & { employee_id: string; document_type: string };
        Update: Partial<EmployeeDocument>;
        Relationships: [];
      };
      employee_messages: {
        Row: EmployeeMessage;
        Insert: Partial<EmployeeMessage> & { employee_id: string; sender: EmployeeMessageSender; body: string };
        Update: Partial<EmployeeMessage>;
        Relationships: [];
      };
      time_entries: {
        Row: TimeEntry;
        Insert: Partial<TimeEntry> & { employee_id: string; entry_type: TimeEntryType };
        Update: Partial<TimeEntry>;
        Relationships: [];
      };
      productivity_records: {
        Row: ProductivityRecord;
        Insert: Partial<ProductivityRecord> & {
          employee_id: string;
          activity: string;
          quantity: number;
          unit: string;
        };
        Update: Partial<ProductivityRecord>;
        Relationships: [];
      };
      cattle_animals: {
        Row: CattleAnimal;
        Insert: Partial<CattleAnimal> & { farm_id: string; lot_id: string; tag_number: string };
        Update: Partial<CattleAnimal>;
        Relationships: [];
      };
      cattle_animal_weighings: {
        Row: CattleAnimalWeighing;
        Insert: Partial<CattleAnimalWeighing> & { animal_id: string; weight_kg: number };
        Update: Partial<CattleAnimalWeighing>;
        Relationships: [];
      };
      cattle_animal_health_events: {
        Row: CattleAnimalHealthEvent;
        Insert: Partial<CattleAnimalHealthEvent> & {
          animal_id: string;
          event_type: CattleHealthEventType;
          description: string;
        };
        Update: Partial<CattleAnimalHealthEvent>;
        Relationships: [];
      };
      cattle_health_protocols: {
        Row: CattleHealthProtocol;
        Insert: Partial<CattleHealthProtocol> & { farm_id: string; name: string; event_type: CattleHealthEventType; interval_days: number };
        Update: Partial<CattleHealthProtocol>;
        Relationships: [];
      };
      cattle_animal_movements: {
        Row: CattleAnimalMovement;
        Insert: Partial<CattleAnimalMovement> & { animal_id: string; to_lot_id: string };
        Update: Partial<CattleAnimalMovement>;
        Relationships: [];
      };
      cattle_field_collections: {
        Row: CattleFieldCollection;
        Insert: Partial<CattleFieldCollection> & {
          lot_id: string;
          category: CattleFieldCollectionCategory;
          status: CattleFieldCollectionStatus;
        };
        Update: Partial<CattleFieldCollection>;
        Relationships: [];
      };
      cattle_inventory_items: {
        Row: CattleInventoryItem;
        Insert: Partial<CattleInventoryItem> & { farm_id: string; name: string; category: CattleInventoryCategory; unit: CattleInventoryUnit };
        Update: Partial<CattleInventoryItem>;
        Relationships: [];
      };
      cattle_inventory_movements: {
        Row: CattleInventoryMovement;
        Insert: Partial<CattleInventoryMovement> & { item_id: string; type: CattleInventoryMovementType; quantity: number };
        Update: Partial<CattleInventoryMovement>;
        Relationships: [];
      };
      lavoura_inventory_items: {
        Row: LavouraInventoryItem;
        Insert: Partial<LavouraInventoryItem> & { farm_id: string; name: string; category: LavouraInventoryCategory; unit: LavouraInventoryUnit };
        Update: Partial<LavouraInventoryItem>;
        Relationships: [];
      };
      lavoura_inventory_movements: {
        Row: LavouraInventoryMovement;
        Insert: Partial<LavouraInventoryMovement> & { item_id: string; type: LavouraInventoryMovementType; quantity: number };
        Update: Partial<LavouraInventoryMovement>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      join_farm_by_code: {
        Args: { invite_code: string };
        Returns: { result_farm_id: string; result_farm_name: string }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
