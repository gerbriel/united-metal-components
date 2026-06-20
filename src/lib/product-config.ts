export const COLORS = [
  { name: 'White',         hex: '#F5F5F5', textDark: true  },
  { name: 'Light Stone',   hex: '#C8B896', textDark: true  },
  { name: 'Pebble Beige',  hex: '#D4BF9A', textDark: true  },
  { name: 'Mocha Tan',     hex: '#A88660', textDark: true  },
  { name: 'Taupe',         hex: '#8F7E6E', textDark: true  },
  { name: 'Clay',          hex: '#B5724A', textDark: true  },
  { name: 'Brown',         hex: '#5C3A1E', textDark: false },
  { name: 'Zinc Gray',     hex: '#686868', textDark: false },
  { name: 'Pewter Gray',   hex: '#969696', textDark: true  },
  { name: 'Galvalume',     hex: '#C8C8C0', textDark: true  },
  { name: 'Hawaiian Blue', hex: '#3A74C4', textDark: false },
  { name: 'Forest Green',  hex: '#2A5024', textDark: false },
  { name: 'Barn Red',      hex: '#7A2020', textDark: false },
  { name: 'Black',         hex: '#1A1A1A', textDark: false },
  { name: 'Light Rock',    hex: '#A09080', textDark: false },
  { name: 'Dark Stone',    hex: '#504540', textDark: false },
] as const

export type ColorName = typeof COLORS[number]['name']

export type TubingConfig =
  | { type: 'preset'; lengths: number[] }
  | { type: 'special-order' }

// Per-foot products sold by the piece with preset length options
export const TUBING_CONFIG: Record<string, TubingConfig> = {
  'TUBE-2.5-14GA':  { type: 'preset', lengths: [20, 22, 24, 26, 32] },
  'TUBE-2.25-14GA': { type: 'preset', lengths: [20, 32] },
  'TUBE-2.25-12GA': { type: 'special-order' },
}

// Panel presets (all customers); contractors can also enter a custom length
export const PANEL_LENGTHS = [16, 21, 26, 31]

// Hat channel and brace presets
export const HAT_CHANNEL_LENGTHS = [2, 3, 16, 21, 26, 31]
export const BRACE_LENGTHS = [2, 3]

// SKUs that get a length selector (per-foot products sold by piece)
export const PANEL_SKUS = new Set(['PANEL-29GA', 'PANEL-29GA-SCRAP', 'PANEL-GALVALUME', 'PANEL-STONE'])

// SKUs that support color selection
export const COLOR_SKUS = new Set([
  'PANEL-29GA',
  'PANEL-29GA-SCRAP',
  'TRIM-BOX-EVE',
  'TRIM-CORNER',
  'TRIM-FLASHING',
  'TRIM-J',
  'TRIM-L',
  'TRIM-SIDE-VERT',
  'RIDGE-CAP',
  'HAT-CHANNEL',
])
