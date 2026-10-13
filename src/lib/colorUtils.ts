/** Escurece uma cor hex (#RRGGBB) por uma fração (0 a 1) — usado pra gerar
 * a borda de um polígono a partir da cor de preenchimento, sem precisar
 * cadastrar uma segunda cor fixa pra cada status/tema. */
export function darkenHex(hex: string, amount: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const num = parseInt(match[1], 16);
  const channel = (shift: number) => {
    const value = (num >> shift) & 0xff;
    return Math.max(0, Math.round(value * (1 - amount)));
  };
  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  return `#${toHex(channel(16))}${toHex(channel(8))}${toHex(channel(0))}`;
}
