import { families } from '../data/family'
import { useTree } from '../state'

/** The landing page: one card per family; picking one opens its tree. */
export function Dashboard() {
  const openFamily = useTree((s) => s.openFamily)
  return (
    <main className="dashboard">
      <header className="brand">
        <div className="seal" aria-hidden="true">家</div>
        <div>
          <h1>Families</h1>
          <p>Choose a family tree to open</p>
        </div>
      </header>
      <ul className="family-list">
        {families.map((f) => (
          <li key={f.id}>
            <button className="family-card glass" onClick={() => openFamily(f.id)}>
              <p className="eyebrow">{f.subtitle}</p>
              <h2>{f.title}</h2>
              <small>
                {f.people.filter((p) => !p.placeholder).length} members · {f.units.length} households
              </small>
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
