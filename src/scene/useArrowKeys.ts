import { useEffect } from 'react'
import { backPositions, personById, positions, unitById } from '../data/graph'
import { useTree } from '../state'

const DIRS: Record<string, [number, number]> = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }

/** Arrow keys walk the selection to the nearest lantern or household on screen in that direction; F turns the tree. */
export function useArrowKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target
      if (e.metaKey || e.ctrlKey || e.altKey || (t instanceof Element && t.closest('input, textarea, select, [contenteditable]'))) return
      const { selected, side, select, flip } = useTree.getState()
      if (e.key === 'f' || e.key === 'F') return flip()
      const dir = DIRS[e.key]
      if (!dir) return
      e.preventDefault()

      // Households only live on the front face; the back has people and trait groups (skip the groups).
      const face = side === 'front' ? positions : backPositions
      const ids = [...face.keys()].filter((id) => personById.has(id) || (side === 'front' && unitById.has(id)))
      const pick = (id: string | undefined) => id && select({ kind: personById.has(id) ? 'person' : 'unit', id })
      const cur = selected && face.get(selected.id)

      if (!cur) {
        // Start at the top of the tree, nearest the middle.
        const top = Math.max(...ids.map((id) => face.get(id)![1]))
        return pick(ids.filter((id) => face.get(id)![1] > top - 1).sort((a, b) => Math.abs(face.get(a)![0]) - Math.abs(face.get(b)![0]))[0])
      }

      // Vertical: the nearest row in that direction, then the closest in x.
      // Horizontal: the closest within a 45° cone, favouring the same row.
      const [dx, dy] = dir
      const along = (id: string) => {
        const [x, y] = face.get(id)!
        return dy ? (y - cur[1]) * dy : (x - cur[0]) * dx
      }
      const across = (id: string) => {
        const [x, y] = face.get(id)!
        return dy ? Math.abs(x - cur[0]) : Math.abs(y - cur[1])
      }
      const ahead = ids.filter((id) => id !== selected.id && along(id) > 0.5 && (dy || across(id) < along(id)))
      if (!ahead.length) return
      if (dy) {
        const row = Math.min(...ahead.map(along))
        return pick(ahead.filter((id) => along(id) < row + 1).sort((a, b) => across(a) - across(b))[0])
      }
      const score = (id: string) => along(id) + 3 * across(id)
      pick(ahead.sort((a, b) => score(a) - score(b))[0])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
