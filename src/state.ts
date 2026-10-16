import { create } from 'zustand'
import type { TraitKind } from './data/graph'

export type Selection = { kind: 'unit' | 'person'; id: string } | null

interface TreeState {
  selected: Selection
  hovered: Selection
  traits: Record<TraitKind, boolean>
  select: (s: Selection) => void
  hover: (s: Selection) => void
  toggleTrait: (k: TraitKind) => void
}

export const useTree = create<TreeState>((set) => ({
  selected: null,
  hovered: null,
  traits: { clubs: true, hometowns: true, hobbies: true },
  select: (selected) => set({ selected }),
  hover: (hovered) => set({ hovered }),
  toggleTrait: (k) => set((s) => ({ traits: { ...s.traits, [k]: !s.traits[k] } })),
}))
