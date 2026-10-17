// ─────────────────────────────────────────────────────────────────────────────
//  THE FAMILY DATA. This is the only file you need to edit to grow the tree.
//
//  1. Add a person to `people` (the id just needs to be unique, lowercase is easiest).
//  2. Add or edit a parent unit in `units`: its year, who the parents are,
//     and who their kids are. A person can be in as many units as they like.
//  3. Optionally give people a class year, hometown, clubs, and a short bio.
//     Anyone who shares a hometown, area, or club gets a faint connecting thread.
// ─────────────────────────────────────────────────────────────────────────────

export interface Person {
  id: string
  name: string
  /** Unnamed slot for a future family member (drawn as an unlit lantern). */
  placeholder?: boolean
  /** Freshman, Sophomore, Junior, Senior, ... */
  classYear?: string
  hometown?: string
  /** A wider area that links nearby hometowns (e.g. Arcadia and LA are both "Greater LA"). */
  area?: string
  clubs?: string[]
  /** Anything else, shown under their class and hometown. */
  bio?: string
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

  // Kids of the 2024 units
  { id: 'steffi', name: 'Steffi' },
  { id: 'eddy', name: 'Eddy', classYear: 'Junior', hometown: 'LA, California', area: 'Greater LA', clubs: ['Rock climbing', 'Taiwanese American Society'] },
  { id: 'steven', name: 'Steven', classYear: 'Junior', hometown: 'Southborough, Massachusetts', clubs: ['Badminton'] },
  { id: 'michelle', name: 'Michelle', classYear: 'Junior', hometown: 'Delaware' },
  { id: 'dieter', name: 'Dieter', classYear: 'Junior', hometown: 'Queens, New York', area: 'New York City' },

  // Kids of Eddy, Steven, Michelle, and Dieter
  { id: 'amy', name: 'Amy', hometown: 'Bradenton, Florida' },
  { id: 'wilson', name: 'Wilson', classYear: 'Sophomore', hometown: 'Arcadia, California', area: 'Greater LA', clubs: ['Taiwanese American Society'] },
  { id: 'michelle-2', name: 'Michelle', classYear: 'Sophomore', hometown: 'Kentucky' },
  { id: 'angie', name: 'Angie', classYear: 'Sophomore', hometown: 'New Jersey', clubs: ['Badminton'] },
  { id: 'susan', name: 'Susan', hometown: 'North Carolina' },

  // Kids of Eddy + Steven
  { id: 'erica', name: 'Erica' },
  { id: 'juleen', name: 'Juleen', classYear: 'First year', hometown: 'Queens, New York', area: 'New York City', clubs: ['YUCG'] },
  { id: 'ian', name: 'Ian', classYear: 'First year', hometown: 'Seoul, South Korea', clubs: ['YUCG'] },
  { id: 'yerin', name: 'Yerin', hometown: 'New York City' },
  { id: 'joanne', name: 'Joanne', hometown: 'New York City' },

  // 2026 coparents who joined from other families
  { id: 'nathan', name: 'Nathan' },
  { id: 'noah', name: 'Noah' },
  { id: 'emily', name: 'Emily', classYear: 'Sophomore', hometown: 'Hong Kong', clubs: ['Badminton'] },
  { id: 'susan-2', name: 'Susan' },

  // Grandkids
  { id: 'tina', name: 'Tina', hometown: 'Bradenton, Florida' },
  { id: 'irene', name: 'Irene' },
  { id: 'emma', name: 'Emma' },
  { id: 'caspar', name: 'Caspar', hometown: 'Chicago, Illinois', clubs: ['Taiwanese American Society'] },
  { id: 'isa', name: 'Isa', clubs: ['Rock climbing'] },
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
    parents: ['eddy', 'steven', 'michelle', 'dieter'],
    children: ['amy', 'wilson', 'michelle-2', 'angie', 'susan'],
  },

  { id: 'u26-eddy', year: 2026, parents: ['eddy', 'steven'], children: ['joanne', 'yerin', 'juleen', 'erica', 'ian'] },
  { id: 'u26-amy', year: 2026, parents: ['amy', 'nathan'], children: ['tina', 'irene', 'emma', 'caspar'] },
  { id: 'u26-wilson', year: 2026, parents: ['wilson', 'noah'], children: ['wn-kid-1', 'wn-kid-2'] },
  { id: 'u26-angie', year: 2026, parents: ['angie', 'emily'], children: ['isa', 'zoe', 'emma-2'] },
  { id: 'u26-susan', year: 2026, parents: ['susan', 'susan-2'], children: [] },
]
