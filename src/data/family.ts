// ─────────────────────────────────────────────────────────────────────────────
//  THE FAMILY DATA. This is the only file you need to edit to grow the tree.
//
//  1. Add a person to `people` (the id just needs to be unique, lowercase is easiest).
//  2. Add or edit a parent unit in `units`: its year, who the parents are,
//     and who their kids are. A person can be in as many units as they like.
//  3. Optionally give people a hometown, clubs, and hobbies. Anyone who shares
//     one gets a faint connecting thread automatically.
// ─────────────────────────────────────────────────────────────────────────────

export interface Person {
  id: string
  name: string
  /** Unnamed slot for a future family member (drawn as an unlit lantern). */
  placeholder?: boolean
  hometown?: string
  clubs?: string[]
  hobbies?: string[]
  /** A short line shown on their card. */
  note?: string
}

export interface Unit {
  id: string
  /** The year this parent unit was formed. Picks the household's color. */
  year: number
  /** Optional nickname, shown instead of the parents' names. */
  name?: string
  parents: string[]
  children: string[]
}

/** The coparents at the heart of the tree; they get a golden halo. */
export const CORE = ['eddy', 'steven', 'michelle', 'dieter']

export const TITLE = 'The Lantern Family'
export const SUBTITLE = 'CASA family tree'

export const people: Person[] = [
  // 2024 parents
  { id: 'alistair', name: 'Alistair' },
  { id: 'anabelle', name: 'Anabelle' },
  { id: 'alicia', name: 'Alicia' },
  { id: 'olivia', name: 'Olivia' },
  { id: 'phil', name: 'Phil' },
  { id: 'tom', name: 'Tom' },

  // The core four + Steffi
  { id: 'steffi', name: 'Steffi' },
  { id: 'eddy', name: 'Eddy' },
  { id: 'steven', name: 'Steven' },
  { id: 'michelle', name: 'Michelle' },
  { id: 'dieter', name: 'Dieter' },

  // Kids of the core four
  { id: 'amy', name: 'Amy' },
  { id: 'wilson', name: 'Wilson' },
  { id: 'michelle-2', name: 'Michelle' },
  { id: 'angie', name: 'Angie' },
  { id: 'susan', name: 'Susan' },

  // Kids of Eddy + Steven
  { id: 'erica', name: 'Erica' },
  { id: 'juleen', name: 'Juleen' },
  { id: 'ian', name: 'Ian' },

  // 2026 coparents who joined from other families
  { id: 'nathan', name: 'Nathan' },
  { id: 'noah', name: 'Noah' },
  { id: 'emily', name: 'Emily' },
  { id: 'susan-2', name: 'Susan' },

  // Grandkids
  { id: 'tina', name: 'Tina' },
  { id: 'irene', name: 'Irene' },
  { id: 'emma', name: 'Emma' },
  { id: 'isa', name: 'Isa' },
  { id: 'zoe', name: 'Zoe' },
  { id: 'emma-2', name: 'Emma' },
  { id: 'wn-kid-1', name: 'Future kid', placeholder: true },
  { id: 'wn-kid-2', name: 'Future kid', placeholder: true },
]

export const units: Unit[] = [
  { id: 'u24-alistair', year: 2024, parents: ['alistair', 'anabelle'], children: ['steffi', 'eddy'] },
  { id: 'u24-alicia', year: 2024, parents: ['alicia', 'olivia', 'phil', 'tom'], children: ['steven', 'michelle', 'dieter'] },

  {
    id: 'u25-core',
    year: 2025,
    name: 'The core four',
    parents: ['eddy', 'steven', 'michelle', 'dieter'],
    children: ['amy', 'wilson', 'michelle-2', 'angie', 'susan'],
  },

  { id: 'u26-eddy', year: 2026, parents: ['eddy', 'steven'], children: ['erica', 'juleen', 'ian'] },
  { id: 'u26-amy', year: 2026, parents: ['amy', 'nathan'], children: ['tina', 'irene', 'emma'] },
  { id: 'u26-wilson', year: 2026, parents: ['wilson', 'noah'], children: ['wn-kid-1', 'wn-kid-2'] },
  { id: 'u26-angie', year: 2026, parents: ['angie', 'emily'], children: ['isa', 'zoe', 'emma-2'] },
  { id: 'u26-susan', year: 2026, parents: ['susan', 'susan-2'], children: [] },
]

// ─────────────────────────────────────────────────────────────────────────────
//  EXAMPLE TRAITS. These are made up so you can see the connection threads.
//  Replace them with real ones (or set SHOW_EXAMPLE_TRAITS to false) before sharing.
// ─────────────────────────────────────────────────────────────────────────────
export const SHOW_EXAMPLE_TRAITS = true

export const exampleTraits: Record<string, Pick<Person, 'hometown' | 'clubs' | 'hobbies'>> = {
  eddy: { hometown: 'Bay Area', clubs: ['Lion dance'], hobbies: ['Photography'] },
  steven: { hometown: 'NYC', clubs: ['Badminton'], hobbies: ['Boba runs'] },
  michelle: { hometown: 'Bay Area', clubs: ['Dance team'], hobbies: ['Baking'] },
  dieter: { hometown: 'Houston', clubs: ['Badminton'], hobbies: ['Climbing'] },
  amy: { hometown: 'NYC', clubs: ['Dance team'], hobbies: ['Baking'] },
  wilson: { hometown: 'Houston', clubs: ['Lion dance'], hobbies: ['Climbing'] },
  erica: { hometown: 'Bay Area', hobbies: ['Photography'] },
  tina: { clubs: ['Dance team'] },
  isa: { hometown: 'NYC', hobbies: ['Boba runs'] },
  alicia: { clubs: ['Lion dance'] },
  ian: { clubs: ['Badminton'] },
}
