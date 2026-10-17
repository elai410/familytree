import { create } from 'zustand'
import type { TraitKind } from './data/graph'

export type Selection = { kind: 'unit' | 'person'; id: string } | null
export type Side = 'front' | 'back'

interface TreeState {
  selected: Selection
  hovered: Selection
  traits: Record<TraitKind, boolean>
  /** Which face the camera is looking at: the family tree or the connections map. */
  side: Side
  /** Bumped to ask the camera to turn around to the other face. */
  flips: number
  select: (s: Selection) => void
  hover: (s: Selection) => void
  toggleTrait: (k: TraitKind) => void
  setSide: (s: Side) => void
  flip: () => void
}

export const useTree = create<TreeState>((set) => ({
  selected: null,
  hovered: null,
  traits: { clubs: true, hometowns: true },
  side: 'front',
  flips: 0,
  select: (selected) => set({ selected }),
  hover: (hovered) => set({ hovered }),
  toggleTrait: (k) => set((s) => ({ traits: { ...s.traits, [k]: !s.traits[k] } })),
  setSide: (side) => set({ side }),
  flip: () => set((s) => ({ flips: s.flips + 1, selected: null })),
}))
