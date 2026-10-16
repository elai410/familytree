import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { activeSetFor, allBounds, boundsOf, coreSet, people, positions, units, type Vec3 } from '../data/graph'
import { useTree } from '../state'
import { Ambient } from './Ambient'
import { Household } from './Household'
import { Lantern } from './Lantern'
import { TraitThreads } from './TraitThreads'

/** Candidate viewing directions, roughly evenly spread over a sphere. */
const DIRECTIONS = Array.from({ length: 48 }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / 48
  const r = Math.sqrt(1 - y * y)
  const a = i * 2.39996
  return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)
})

/**
 * Pick the angle that spreads the focused people out the most on screen,
 * looking in from outside the ball so the rest of the family sits behind them.
 */
function bestDirection(ids: Set<string>, center: Vec3, current: THREE.Vector3) {
  const pts = [...ids].map((id) => positions.get(id)).filter((p): p is Vec3 => !!p).map((p) => new THREE.Vector3(...p))
  const outward = new THREE.Vector3(...center).sub(new THREE.Vector3(...allBounds.center))
  const hasOutward = outward.length() > allBounds.radius * 0.2
  outward.normalize()
  let best = current.clone().normalize()
  let bestScore = -Infinity
  const proj = pts.map(() => new THREE.Vector3())
  for (const d of DIRECTIONS) {
    if (hasOutward && d.dot(outward) < 0.15) continue
    pts.forEach((p, i) => proj[i].copy(p).projectOnPlane(d))
    let minGap = Infinity
    for (let i = 0; i < proj.length; i++)
      for (let j = i + 1; j < proj.length; j++) minGap = Math.min(minGap, proj[i].distanceTo(proj[j]))
    // Prefer slightly-above views and staying close to where the camera already is.
    const score = Math.min(minGap, 8) + d.y * 1.5 + d.dot(current) * 1.0
    if (score > bestScore) {
      bestScore = score
      best = d
    }
  }
  return best
}

function CameraRig() {
  const controls = useRef<CameraControls>(null!)
  const selected = useTree((s) => s.selected)
  const hovered = useTree((s) => s.hovered)
  const lastInteraction = useRef(-10)
  const { camera, size } = useThree()

  useEffect(() => {
    const c = controls.current
    if (!c) return
    if (!selected) {
      c.fitToSphere(new THREE.Sphere(new THREE.Vector3(...allBounds.center), allBounds.radius), true)
      return
    }
    const ids = activeSetFor(selected)!
    const b = boundsOf(ids, 7)
    const radius = selected.kind === 'person' ? Math.max(b.radius * 0.8, 14) : b.radius
    const cam = camera as THREE.PerspectiveCamera
    const current = cam.position.clone().sub(c.getTarget(new THREE.Vector3()))
    const dir = bestDirection(ids, b.center, current.normalize())
    const vFov = THREE.MathUtils.degToRad(cam.fov)
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (size.width / size.height))
    const dist = radius / Math.sin(Math.min(vFov, hFov) / 2)
    const [x, y, z] = b.center
    c.setLookAt(x + dir.x * dist, y + dir.y * dist, z + dir.z * dist, x, y, z, true)
  }, [selected, camera, size])

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

  useFrame((_, dt) => {
    const idle = performance.now() / 1000 - lastInteraction.current > 4
    if (idle && !selected && !hovered) controls.current.rotate(dt * 0.06, 0, false)
  })

  return <CameraControls ref={controls} makeDefault minDistance={6} maxDistance={260} smoothTime={0.7} dollySpeed={0.6} />
}

function Tree() {
  const selected = useTree((s) => s.selected)
  const activeSet = useMemo(() => activeSetFor(selected), [selected])

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
    </>
  )
}

export function Scene() {
  const select = useTree((s) => s.select)
  const start = useMemo(() => {
    const d = allBounds.radius * 2.6
    return [allBounds.center[0], allBounds.center[1] + d * 0.25, allBounds.center[2] + d] as [number, number, number]
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
