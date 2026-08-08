import { lightColors } from './palettes';

/**
 * Export estático (paleta clara) — usado por telas que ainda não migraram
 * pro hook `useColors()` reativo ao tema. Novas telas e os componentes
 * compartilhados devem usar `useColors()` (ver `useColors.ts`) pra
 * responder à troca de tema em Ajustes → Aparência.
 */
export const colors = lightColors;

export type { ColorToken } from './palettes';
