// The five Neroli locations. East Side has no spa services (massage, facials) and
// hides those categories throughout the app (Build Plan §1, §12.2).

export interface LocationDef {
  id: string
  name: string
  shortCode: string
  hasSpa: boolean
  notes: string
}

export const LOCATIONS: LocationDef[] = [
  { id: 'brookfield', name: 'Brookfield', shortCode: 'BF', hasSpa: true, notes: 'Full service' },
  { id: 'downtown', name: 'Downtown', shortCode: 'DT', hasSpa: true, notes: 'Full service' },
  {
    id: 'east-side',
    name: 'East Side',
    shortCode: 'ES',
    hasSpa: false,
    notes: 'Hair & nails only — spa categories hidden'
  },
  { id: 'mequon', name: 'Mequon', shortCode: 'MQ', hasSpa: true, notes: 'Full service' },
  { id: 'north-shore', name: 'North Shore', shortCode: 'NS', hasSpa: true, notes: 'Full service' }
]

export const LOCATION_IDS = LOCATIONS.map((l) => l.id)

const NAME_TO_ID = new Map<string, string>()
for (const loc of LOCATIONS) {
  NAME_TO_ID.set(loc.name.toLowerCase(), loc.id)
  NAME_TO_ID.set(loc.shortCode.toLowerCase(), loc.id)
}
// "Eastside" / "East Side" both map to the canonical East Side (§14.1).
NAME_TO_ID.set('eastside', 'east-side')

/** Resolve any Zenoti "Center Name" / "Center" spelling to a canonical location id. */
export function canonicalLocationId(raw: string | undefined | null): string | null {
  if (!raw) return null
  const key = String(raw).trim().toLowerCase()
  if (NAME_TO_ID.has(key)) return NAME_TO_ID.get(key)!
  // Tolerate trailing descriptors e.g. "East Side Salon"
  for (const [name, id] of NAME_TO_ID.entries()) {
    if (key.startsWith(name)) return id
  }
  return null
}

export function locationById(id: string): LocationDef | undefined {
  return LOCATIONS.find((l) => l.id === id)
}

export function locationName(id: string): string {
  return locationById(id)?.name ?? id
}

/** Service categories suppressed at non-spa locations (East Side). */
export const SPA_CATEGORIES = ['Massage', 'Facials', 'Facial']
