# The Lantern Family

An interactive 3D lantern-garden family tree for our CASA family. Each person is a paper lantern, and each parent unit is a glowing ring in its year's color. Red threads run from each ring to that unit's kids. Turn it around and the same people regroup around glowing hubs for the clubs and hometowns they share.

- The front is the family tree. Drag it around (or press **Turn to connections**) and everyone drifts into the back face: a map of shared clubs and hometowns
- Drag to orbit and scroll to zoom
- Click a ring, or pick from **Households**, to fly in on one household
- Click a lantern to see that person's bio and households
- Press `Esc`, click empty sky, or press **See the whole family** to zoom back out

## Adding people

Everything lives in [`src/data/family.ts`](src/data/family.ts):

1. Add the person to `people`, with a unique `id`.
2. Add them to a unit in `units`, as a parent, a kid, or both. A person can be in any number of units.
3. Optionally give them a `classYear`, `hometown`, `clubs`, and a `bio`; the class, hometown, and bio show on their card. People who share a hometown or club are linked automatically, ignoring capitalization. To link nearby hometowns, give both people the same `area` (for example `'Greater LA'`).

New years pick up a color automatically. To choose one yourself, add it to `YEAR_COLORS` in `src/data/graph.ts`.

## Running locally

```bash
npm install
npm run dev
```

## Deploying to Vercel

It's a static Vite site. Import the repo at vercel.com/new and keep the defaults (Framework: Vite, Build: `npm run build`, Output: `dist`). Or deploy from the terminal:

```bash
npx vercel --prod
```
