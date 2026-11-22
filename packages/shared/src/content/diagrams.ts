/**
 * Bundled diagrams for the Phase 2 starter terms (the app draws these until teachers upload
 * their own pictures in Phase 4). Each is a 200×200 SVG with no labels, so nothing gives the
 * answer away. Terms point at a part with a highlight box in fractions of the picture.
 *
 * Colours: brand tokens (atom particles per BRAND.md) and `diagramColors`.
 */
import { colors, diagramColors as d } from '../theme/colors.js';

export type DiagramId =
  | 'atom'
  | 'animal-cell'
  | 'cell-division'
  | 'plant-cell'
  | 'earthquake'
  | 'food-chain'
  | 'solar-system';

export type Diagram = { id: DiagramId; svg: string; altText: string };

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">${body}</svg>`;

/** Simple X-shaped chromosome centred on (x, y). */
const chromosome = (x: number, y: number, s = 1, color: string = colors.violet) =>
  `<g transform="translate(${x} ${y}) scale(${s})" stroke="${color}" stroke-width="4" stroke-linecap="round">` +
  `<path d="M-6 -8 Q0 0 6 8"/><path d="M6 -8 Q0 0 -6 8"/></g>`;

const arrow = (x1: number, y1: number, x2: number, y2: number) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 7;
  const p1 = `${x2 - h * Math.cos(a - 0.5)},${y2 - h * Math.sin(a - 0.5)}`;
  const p2 = `${x2 - h * Math.cos(a + 0.5)},${y2 - h * Math.sin(a + 0.5)}`;
  return (
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${d.outline}" stroke-width="3" stroke-linecap="round"/>` +
    `<polygon points="${x2},${y2} ${p1} ${p2}" fill="${d.outline}"/>`
  );
};

// ── Atom: 2 protons, 2 neutrons, electrons on two shells ──────────────────────
const atom = svg(
  `<circle cx="100" cy="100" r="45" fill="none" stroke="${colors.violet}" stroke-opacity="0.35" stroke-width="2.5"/>` +
    `<circle cx="100" cy="100" r="78" fill="none" stroke="${colors.violet}" stroke-opacity="0.35" stroke-width="2.5"/>` +
    // nucleus: protons coral, neutrons lilacLine (outlined so they show on the lilac card)
    `<circle cx="89" cy="89" r="11" fill="${colors.coral}" stroke="${d.outline}" stroke-width="2"/>` +
    `<circle cx="111" cy="89" r="11" fill="${colors.lilacLine}" stroke="${d.outline}" stroke-width="2"/>` +
    `<circle cx="89" cy="111" r="11" fill="${colors.lilacLine}" stroke="${d.outline}" stroke-width="2"/>` +
    `<circle cx="111" cy="111" r="11" fill="${colors.coral}" stroke="${d.outline}" stroke-width="2"/>` +
    // electrons
    `<circle cx="132" cy="68" r="7" fill="${colors.violet}"/>` +
    `<circle cx="68" cy="132" r="7" fill="${colors.violet}"/>` +
    `<circle cx="100" cy="22" r="7" fill="${colors.violet}"/>` +
    `<circle cx="178" cy="100" r="7" fill="${colors.violet}"/>` +
    `<circle cx="45" cy="155" r="7" fill="${colors.violet}"/>`,
);

// ── Animal cell: membrane, nucleus with nucleolus and chromosomes, mitochondria ──
const animalCell = svg(
  `<path d="M100 14 C150 12 188 50 186 100 C184 152 148 188 98 186 C48 184 12 150 14 98 C16 50 52 16 100 14 Z" fill="${d.cellAnimal}" stroke="${d.cellAnimalEdge}" stroke-width="4"/>` +
    `<ellipse cx="150" cy="140" rx="16" ry="9" transform="rotate(-25 150 140)" fill="${d.mitochondrion}" stroke="${d.outline}" stroke-width="2"/>` +
    `<ellipse cx="48" cy="140" rx="15" ry="8" transform="rotate(30 48 140)" fill="${d.mitochondrion}" stroke="${d.outline}" stroke-width="2"/>` +
    `<ellipse cx="150" cy="58" rx="14" ry="8" transform="rotate(20 150 58)" fill="${d.mitochondrion}" stroke="${d.outline}" stroke-width="2"/>` +
    `<circle cx="60" cy="58" r="3" fill="${d.cellAnimalEdge}"/><circle cx="130" cy="170" r="3" fill="${d.cellAnimalEdge}"/>` +
    `<circle cx="40" cy="100" r="3" fill="${d.cellAnimalEdge}"/><circle cx="168" cy="100" r="3" fill="${d.cellAnimalEdge}"/>` +
    // nucleus
    `<circle cx="96" cy="96" r="34" fill="${d.nucleus}" stroke="${d.outline}" stroke-width="3"/>` +
    `<circle cx="82" cy="84" r="9" fill="${d.nucleolus}"/>` +
    chromosome(110, 104) +
    chromosome(90, 112, 0.8),
);

// ── Cell division: mitosis (1 → 2) above, meiosis (1 → 4) below ────────────────
const cell = (x: number, y: number, r: number, chromos: number) => {
  let body = `<circle cx="${x}" cy="${y}" r="${r}" fill="${d.cellAnimal}" stroke="${d.cellAnimalEdge}" stroke-width="3"/>`;
  const g = r * 0.3;
  const spots: [number, number][] =
    chromos === 4
      ? [
          [-g, -g],
          [g, -g],
          [-g, g],
          [g, g],
        ]
      : [
          [-g, 0],
          [g, 0],
        ];
  for (const [dx, dy] of spots) body += chromosome(x + dx, y + dy, r < 16 ? 0.45 : 0.5);
  return body;
};
const cellDivision = svg(
  // mitosis row
  cell(36, 55, 24, 4) +
    arrow(66, 55, 92, 55) +
    cell(122, 55, 20, 4) +
    cell(172, 55, 20, 4) +
    // divider
    `<line x1="10" y1="100" x2="190" y2="100" stroke="${colors.violet}" stroke-opacity="0.25" stroke-width="2" stroke-dasharray="6 6"/>` +
    // meiosis row
    cell(36, 150, 24, 4) +
    arrow(66, 150, 92, 150) +
    cell(124, 128, 15, 2) +
    cell(170, 128, 15, 2) +
    cell(124, 172, 15, 2) +
    cell(170, 172, 15, 2),
);

// ── Plant cell: wall, big vacuole, nucleus, chloroplasts ───────────────────────
const chloroplast = (x: number, y: number, rot: number) =>
  `<g transform="rotate(${rot} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="16" ry="9" fill="${d.leaf}" stroke="${d.leafDark}" stroke-width="2"/>` +
  `<line x1="${x - 8}" y1="${y - 3}" x2="${x + 8}" y2="${y - 3}" stroke="${d.leafDark}" stroke-width="2"/>` +
  `<line x1="${x - 8}" y1="${y + 3}" x2="${x + 8}" y2="${y + 3}" stroke="${d.leafDark}" stroke-width="2"/></g>`;
const plantCell = svg(
  `<rect x="16" y="20" width="168" height="160" rx="14" fill="${d.cellPlant}" stroke="${d.cellPlantWall}" stroke-width="7"/>` +
    `<rect x="62" y="62" width="90" height="80" rx="24" fill="${d.vacuole}" stroke="${d.outline}" stroke-width="2"/>` +
    `<circle cx="48" cy="150" r="17" fill="${d.nucleus}" stroke="${d.outline}" stroke-width="2.5"/>` +
    `<circle cx="44" cy="146" r="5" fill="${d.nucleolus}"/>` +
    chloroplast(150, 48, 0) +
    chloroplast(46, 50, 20) +
    chloroplast(166, 110, 80) +
    chloroplast(120, 162, -10) +
    chloroplast(40, 100, 90),
);

// ── Earthquake: cross-section with a fault, focus underground, epicentre on top ──
const earthquake = svg(
  `<rect x="0" y="0" width="200" height="72" fill="${d.sky}"/>` +
    `<rect x="0" y="70" width="200" height="130" fill="${d.soil}"/>` +
    `<rect x="0" y="130" width="200" height="70" fill="${d.soilDark}"/>` +
    `<line x1="0" y1="70" x2="200" y2="70" stroke="${d.outline}" stroke-width="3"/>` +
    // houses on the surface
    `<rect x="24" y="52" width="18" height="18" fill="${colors.white}" stroke="${d.outline}" stroke-width="2"/><path d="M21 52 L33 42 L45 52 Z" fill="${colors.coral}" stroke="${d.outline}" stroke-width="2"/>` +
    `<rect x="158" y="50" width="20" height="20" fill="${colors.white}" stroke="${d.outline}" stroke-width="2"/><path d="M155 50 L168 39 L181 50 Z" fill="${colors.coral}" stroke="${d.outline}" stroke-width="2"/>` +
    // fault line
    `<line x1="60" y1="70" x2="140" y2="190" stroke="${d.outline}" stroke-width="4"/>` +
    // seismic waves around the focus
    `<circle cx="113" cy="150" r="18" fill="none" stroke="${colors.white}" stroke-width="2" stroke-opacity="0.8"/>` +
    `<circle cx="113" cy="150" r="32" fill="none" stroke="${colors.white}" stroke-width="2" stroke-opacity="0.5"/>` +
    // focus (star)
    `<path d="M113 140 L116 147 L124 148 L118 153 L120 161 L113 157 L106 161 L108 153 L102 148 L110 147 Z" fill="${colors.sunny}" stroke="${d.outline}" stroke-width="1.5"/>` +
    // epicentre marker directly above
    `<line x1="113" y1="140" x2="113" y2="74" stroke="${colors.white}" stroke-width="2" stroke-dasharray="4 4"/>` +
    `<circle cx="113" cy="70" r="7" fill="${colors.coral}" stroke="${d.outline}" stroke-width="2"/>`,
);

// ── Food chain: plant → grasshopper → frog; mushrooms break down dead matter ───
const foodChain = svg(
  // ground first, so everything stands on it
  `<rect x="0" y="120" width="200" height="80" fill="${d.soil}"/>` +
    `<line x1="0" y1="120" x2="200" y2="120" stroke="${d.outline}" stroke-width="3"/>` +
    // plant
    `<line x1="30" y1="120" x2="30" y2="78" stroke="${d.leafDark}" stroke-width="4"/>` +
    `<ellipse cx="20" cy="92" rx="12" ry="6" transform="rotate(-30 20 92)" fill="${d.leaf}" stroke="${d.leafDark}" stroke-width="2"/>` +
    `<ellipse cx="40" cy="86" rx="12" ry="6" transform="rotate(30 40 86)" fill="${d.leaf}" stroke="${d.leafDark}" stroke-width="2"/>` +
    `<ellipse cx="22" cy="108" rx="11" ry="5" transform="rotate(-25 22 108)" fill="${d.leaf}" stroke="${d.leafDark}" stroke-width="2"/>` +
    `<ellipse cx="38" cy="104" rx="11" ry="5" transform="rotate(25 38 104)" fill="${d.leaf}" stroke="${d.leafDark}" stroke-width="2"/>` +
    arrow(50, 104, 66, 104) +
    // grasshopper
    `<path d="M88 110 L80 94 L74 119" fill="none" stroke="${d.outline}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<ellipse cx="96" cy="106" rx="22" ry="8" fill="${d.insect}" stroke="${d.outline}" stroke-width="2"/>` +
    `<circle cx="118" cy="102" r="6" fill="${d.insect}" stroke="${d.outline}" stroke-width="2"/>` +
    `<circle cx="120" cy="100" r="1.5" fill="${d.outline}"/>` +
    `<path d="M104 113 L101 119 M110 113 L113 119" stroke="${d.outline}" stroke-width="2"/>` +
    `<path d="M120 97 Q130 84 136 86" fill="none" stroke="${d.outline}" stroke-width="1.5"/>` +
    arrow(132, 106, 146, 106) +
    // frog
    `<ellipse cx="172" cy="106" rx="20" ry="13" fill="${d.frog}" stroke="${d.outline}" stroke-width="2"/>` +
    `<circle cx="164" cy="92" r="6" fill="${d.frog}" stroke="${d.outline}" stroke-width="2"/>` +
    `<circle cx="180" cy="92" r="6" fill="${d.frog}" stroke="${d.outline}" stroke-width="2"/>` +
    `<circle cx="164" cy="92" r="2.5" fill="${d.outline}"/><circle cx="180" cy="92" r="2.5" fill="${d.outline}"/>` +
    `<path d="M164 110 Q172 115 180 110" fill="none" stroke="${d.outline}" stroke-width="2"/>` +
    // dead matter and decomposers in the soil
    `<rect x="20" y="150" width="70" height="16" rx="8" fill="${d.soilDark}" stroke="${d.outline}" stroke-width="2"/>` +
    arrow(170, 126, 152, 146) +
    `<rect x="132" y="160" width="10" height="20" fill="${d.stem}" stroke="${d.outline}" stroke-width="2"/>` +
    `<path d="M120 162 Q137 136 154 162 Z" fill="${d.fungus}" stroke="${d.outline}" stroke-width="2"/>` +
    `<rect x="160" y="166" width="8" height="15" fill="${d.stem}" stroke="${d.outline}" stroke-width="2"/>` +
    `<path d="M151 168 Q164 148 177 168 Z" fill="${d.fungus}" stroke="${d.outline}" stroke-width="2"/>`,
);

// ── Solar system: Sun, Mars, asteroid belt, Jupiter, a comet ───────────────────
const rocks = [
  [96, 70, 4],
  [100, 88, 3],
  [104, 104, 5],
  [99, 122, 3],
  [95, 138, 4],
  [108, 80, 3],
  [107, 130, 3],
] as const;
const solarSystem = svg(
  `<clipPath id="space"><rect x="0" y="0" width="200" height="200" rx="24"/></clipPath><g clip-path="url(#space)">` +
    `<rect x="0" y="0" width="200" height="200" rx="24" fill="${d.space}"/>` +
    `<circle cx="20" cy="40" r="1.5" fill="${colors.white}"/><circle cx="70" cy="170" r="1.2" fill="${colors.white}"/>` +
    `<circle cx="150" cy="170" r="1.5" fill="${colors.white}"/><circle cx="185" cy="140" r="1.2" fill="${colors.white}"/>` +
    `<circle cx="10" cy="104" r="44" fill="${d.sun}"/>` +
    `<circle cx="72" cy="104" r="7" fill="${d.mars}"/>` +
    rocks
      .map(
        ([x, y, r]) =>
          `<circle cx="${x}" cy="${y}" r="${r}" fill="${d.rock}" stroke="${d.rockDark}" stroke-width="1"/>`,
      )
      .join('') +
    `<circle cx="146" cy="110" r="20" fill="${d.jupiter}"/>` +
    `<path d="M127 104 H165 M126 114 H166" stroke="${d.jupiterBand}" stroke-width="4"/>` +
    // comet: tail points away from the Sun
    `<path d="M160 44 L196 22 L198 36 Z" fill="${d.cometTail}" opacity="0.8"/>` +
    `<path d="M160 44 L192 14 L196 24 Z" fill="${colors.white}" opacity="0.6"/>` +
    `<circle cx="158" cy="46" r="7" fill="${colors.white}" stroke="${d.cometTail}" stroke-width="2"/>` +
    `</g>`,
);

export const DIAGRAMS: Record<DiagramId, Diagram> = {
  atom: {
    id: 'atom',
    svg: atom,
    altText: 'A model of an atom with particles in the middle and on rings around it',
  },
  'animal-cell': {
    id: 'animal-cell',
    svg: animalCell,
    altText: 'An animal cell with its parts inside',
  },
  'cell-division': {
    id: 'cell-division',
    svg: cellDivision,
    altText:
      'Two kinds of cell division: one cell making two cells, and one cell making four smaller cells',
  },
  'plant-cell': {
    id: 'plant-cell',
    svg: plantCell,
    altText: 'A plant cell with a thick wall and parts inside',
  },
  earthquake: {
    id: 'earthquake',
    svg: earthquake,
    altText: 'A slice of the ground during an earthquake, with houses on the surface',
  },
  'food-chain': {
    id: 'food-chain',
    svg: foodChain,
    altText: 'A plant, a grasshopper and a frog above ground, and mushrooms on the soil',
  },
  'solar-system': {
    id: 'solar-system',
    svg: solarSystem,
    altText:
      'Part of the solar system with the Sun, two planets, a band of rocks and an icy object',
  },
};
