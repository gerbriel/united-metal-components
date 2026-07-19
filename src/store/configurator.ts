import { create } from 'zustand'

// Live product-configuration state shared between the order form (which owns the
// color/length UI) and the 3D <ProductViewer>, so picking a color on the detail
// page recolors the interactive model in real time. Client-only, single product
// at a time — reset() is called by the form when it mounts for a new product.
interface ConfiguratorState {
  // Color NAME from product-config COLORS. `undefined` = nothing chosen yet (the
  // viewer shows the display-default finish, see product3d/resolve displayColor);
  // `null` = explicitly bare / no color (e.g. a bare overstock piece).
  color: string | null | undefined
  length: number | null  // selected length in feet (null = representative length)
  setColor: (color: string | null | undefined) => void
  setLength: (length: number | null) => void
  reset: () => void
}

export const useConfigurator = create<ConfiguratorState>((set) => ({
  color: undefined,
  length: null,
  setColor: (color) => set({ color }),
  setLength: (length) => set({ length }),
  reset: () => set({ color: undefined, length: null }),
}))
