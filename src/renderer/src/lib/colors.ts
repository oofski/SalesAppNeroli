// Calm, on-brand categorical palette for charts (greens, stone, warm tan).
export const PALETTE = ['#4A6741', '#8B7355', '#2C3E35', '#A8B5A0', '#6B8E5A', '#C2B280', '#3A7A4A', '#9C8466']

export const LOCATION_COLOR: Record<string, string> = {
  brookfield: '#4A6741',
  downtown: '#8B7355',
  'east-side': '#2C3E35',
  mequon: '#6B8E5A',
  'north-shore': '#C2B280'
}

export function paletteAt(i: number): string {
  return PALETTE[i % PALETTE.length]
}
