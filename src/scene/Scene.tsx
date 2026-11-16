import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { activeSetFor, allBounds, backPositions, connectionSetFor, coreSet, flat, people, positions, units, type Vec3 } from '../data/graph'
import { useTree, type Side } from '../state'
import { Ambient } from './Ambient'
import { Connections } from './Connections'
import { Household } from './Household'
import { Lantern } from './Lantern'
import { morph, releaseTo, updateOverall } from './morph'
import { TraitThreads } from './TraitThreads'
import { useArrowKeys } from './useArrowKeys'

/** Look at the tree from slightly above. */
const LIFT = 0.14
const PANEL_PX = 340 // width the details panel covers on desktop
const SWAY = 0.12

/** The camera angle that faces a side, picked to be the nearest turn from where it is now. */
function azimuthFor(side: Side, from: number) {
  const base = side === 'front' ? 0 : Math.PI
  return base + Math.round((from - base) / (Math.PI * 2)) * Math.PI * 2
}

/** Bounds of some ids on one face (labels hang below, so the bottom gets a little extra). */
function boxOn(face: Map<string, Vec3>, ids: Iterable<string>, pad: number) {
  const pts = [...ids].map((id) => face.get(id)).filter((p): p is Vec3 => !!p)
  if (!pts.length) return { cx: 0, cy: 0, w: 40, h: 40 }
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const minY = Math.min(...ys) - 3
  const maxY = Math.max(...ys) + 2
  return {
    cx: (Math.min(...xs) + Math.max(...xs)) / 2,
    cy: (minY + maxY) / 2,
    w: Math.max(...xs) - Math.min(...xs) + pad * 2,
    h: maxY - minY + pad * 2,
  }
}

function CameraRig() {
  const controls = useRef<CameraControls>(null!)
  const selected = useTree((s) => s.selected)
  const hovered = useTree((s) => s.hovered)
  const flips = useTree((s) => s.flips)
  const lastFlips = useRef(flips)
  const lastInteraction = useRef(-10)
  const { camera, size } = useThree()

  useEffect(() => {
    const c = controls.current
    if (!c) return
    const current = useTree.getState().side
    // A flip turns to the other face; a household always lives on the front.
    const flipping = flips !== lastFlips.current
    lastFlips.current = flips
    const side: Side = flipping ? (current === 'front' ? 'back' : 'front') : selected?.kind === 'unit' ? 'front' : current
    const face = side === 'front' ? positions : backPositions

    const ids = !selected ? [...face.keys()] : side === 'back' && selected.kind === 'person' ? connectionSetFor(selected.id) : activeSetFor(selected)!
    const box = boxOn(face, ids, selected ? 9 : 6)

    const cam = camera as THREE.PerspectiveCamera
    const desktop = size.width > 760
    // Leave room for the details panel: on the right on desktop, along the bottom on phones.
    const usableW = selected && desktop ? Math.max(0.4, (size.width - PANEL_PX) / size.width) : 1
    // Keep clear of the header and legend; on phones the card also takes the bottom ~45%.
    const [topFrac, bottomFrac] = desktop ? [0.13, 0.07] : selected ? [0.15, 0.45] : [0.14, 0.1]
    const usableH = 1 - topFrac - bottomFrac
    const vHalf = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)
    const hHalf = vHalf * (size.width / size.height)
    const dist = Math.max(box.h / 2 / (vHalf * usableH), box.w / 2 / (hHalf * usableW), 12)

    const az = azimuthFor(side, c.azimuthAngle)
    const dir = new THREE.Vector3(Math.sin(az), LIFT, Math.cos(az)).normalize()
    c.setLookAt(box.cx + dir.x * dist, box.cy + dir.y * dist, dir.z * dist, box.cx, box.cy, 0, true)
    c.setFocalOffset(
      ((1 - usableW) / 2) * 2 * hHalf * dist,
      ((bottomFrac - topFrac) / 2) * 2 * vHalf * dist,
      0,
      true,
    )
  }, [selected, camera, size, flips])

  useEffect(() => {
    const c = controls.current
    const onStart = () => (lastInteraction.current = performance.now() / 1000)
    c.addEventListener('controlstart', onStart)
    c.addEventListener('control', onStart)
    return () => {
      c.removeEventListener('controlstart', onStart)
      c.removeEventListener('control', onStart)
    }
  }, [])

  useFrame(({ clock }, dt) => {
    const c = controls.current
    // Turning past the side releases the lanterns toward the other face. A little
    // hysteresis means small orbits near the side don't send them back and forth.
    morph.now = clock.elapsedTime
    const turn = (1 - Math.cos(c.azimuthAngle)) / 2
    const was = useTree.getState().side
    const side: Side = was === 'front' ? (turn > 0.58 ? 'back' : 'front') : turn < 0.42 ? 'front' : 'back'
    if (side !== was) useTree.getState().setSide(side)
    releaseTo(side === 'back' ? 1 : 0)
    updateOverall()

    // When nobody is touching it, sway gently on whichever side you're on.
    const idle = performance.now() / 1000 - lastInteraction.current > 5
    if (!idle || selected || hovered || c.active) return
    const target = azimuthFor(side, c.azimuthAngle) + Math.sin(clock.elapsedTime * 0.1) * SWAY
    c.rotate((target - c.azimuthAngle) * Math.min(1, dt * 0.6), 0, false)
  })

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={6}
      maxDistance={320}
      smoothTime={0.7}
      dollySpeed={0.6}
      minPolarAngle={0.35}
      maxPolarAngle={Math.PI - 0.35}
    />
  )
}

function Tree() {
  const selected = useTree((s) => s.selected)
  const side = useTree((s) => s.side)
  const activeSet = useMemo(
    () => (selected?.kind === 'person' && side === 'back' ? connectionSetFor(selected.id) : activeSetFor(selected)),
    [selected, side],
  )

  return (
    <>
      {units.map((u) => (
        <Household key={u.id} unit={u} activeSet={activeSet} />
      ))}
      {people.map((p) => (
        <Lantern
          key={p.id}
          person={p}
          position={positions.get(p.id)!}
          core={coreSet.has(p.id)}
          active={activeSet ? activeSet.has(p.id) : null}
        />
      ))}
      <TraitThreads activeSet={activeSet} />
      <Connections activeSet={activeSet} />
    </>
  )
}

export function Scene() {
  const select = useTree((s) => s.select)
  useArrowKeys()
  const start = useMemo(() => {
    const ys = [...flat.values()].map((p) => p[1])
    const y = (Math.min(...ys) + Math.max(...ys)) / 2
    const d = allBounds.radius * 3
    return [0, y + d * 0.3, d] as [number, number, number]
  }, [])

  return (
    <Canvas
      camera={{ position: start, fov: 45, near: 0.5, far: 1200 }}
      dpr={[1, 2]}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={['#05061a']} />
      <fog attach="fog" args={['#0a0820', allBounds.radius * 2.5, allBounds.radius * 7]} />
      <Ambient radius={allBounds.radius} />
      <Tree />
      <CameraRig />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={0.55} luminanceSmoothing={0.2} intensity={1.15} radius={0.75} />
        <Vignette offset={0.25} darkness={0.75} />
      </EffectComposer>
    </Canvas>
  )
}
