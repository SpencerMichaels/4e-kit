// D&D 4e content schema: monsters, powers, effect clauses, items, traps,
// diseases, monster templates and themes. Design notes live in the
// "4e Content Schema Draft" doc; the rules in short:
//   - Line.text keeps the printed wording; clauses are derived from it.
//   - Text that fits no clause kind becomes an 'unparsed' clause.
//   - Every entry records its provenance.
//   - Plain JSON only (no classes, no functions).

import type {
  Ability, ActionType, ConditionId, CreatureType, DamageType, Defense, Duration,
  Origin, RangeKind, Rank, Recharge, Role, SenseKind, Size, Skill, Usage,
} from './vocab'

export const SCHEMA_VERSION = 1

// ── Shared pieces ──

export interface SourceRef {
  book: string
  page?: number
}

export interface Provenance {
  origin: 'parser' | 'agent' | 'human'
  /** Parser version, or model id for agent edits. */
  by?: string
  /** ISO date. */
  at: string
  /** The agent's own assessment; 'low' sends the entry to the review queue. */
  confidence?: 'high' | 'low'
  /** Set once a human has checked the entry. */
  reviewed?: true
  /** What was corrected, and why. */
  notes?: string[]
}

/** One printed line of a power or trait, plus the mechanics derived from it. */
export interface Line {
  /** As printed, whitespace-normalized. */
  text: string
  clauses: Clause[]
}

// ── Effect clauses ──

export type Who = 'target' | 'self' | 'each-target' | 'ally' | 'enemies-in-area' | 'other'

export type ModifierStat =
  | 'attack' | 'ac' | 'fortitude' | 'reflex' | 'will' | 'defenses'
  | 'speed' | 'saving-throws' | 'damage'

interface ClauseBase {
  /** Character span [start, end) in the owning Line.text. */
  at: [number, number]
  /** Condition text ("if the target is bloodied"): shown, never auto-applied. */
  if?: string
}

export type Clause = ClauseBase & (
  | { kind: 'damage'; dice: string; types: DamageType[]; who: Who }
  /** PC/item damage formula ("2[W] + Strength modifier"); 4ecb evaluates it. */
  | { kind: 'damage-formula'; text: string; types: DamageType[] }
  | { kind: 'half-damage' }
  | { kind: 'ongoing-damage'; amount: number; types: DamageType[]; who: Who; duration: Duration; saveGroup?: string }
  | { kind: 'condition'; condition: ConditionId; who: Who; duration: Duration; saveGroup?: string }
  | { kind: 'grants-ca'; to: 'all' | 'source' | 'source-allies'; who: Who; duration: Duration }
  | { kind: 'forced-move'; move: 'push' | 'pull' | 'slide'; squares: number; who: Who }
  | { kind: 'move'; move: 'shift' | 'teleport' | 'swap'; squares?: number; who: Who }
  | { kind: 'modifier'; stat: ModifierStat; value: number; who: Who; duration: Duration }
  | { kind: 'resistance' | 'vulnerability'; type: DamageType | 'all'; value: number; who: Who; duration: Duration }
  | { kind: 'heal'; amount: number | 'surge-value' | 'half-surge-value'; who: Who }
  | { kind: 'temp-hp'; amount: number; who: Who }
  | { kind: 'regeneration'; value: number; who: Who; duration: Duration }
  | { kind: 'revive'; hp: number }
  | { kind: 'unparsed'; text: string }
)

export type ClauseKind = Clause['kind']

// ── Powers and attacks ──

export type AttackBonus =
  | { kind: 'fixed'; value: number } // monsters, traps
  | { kind: 'level'; plus: number } // templates and themes: "level + 5"
  | { kind: 'formula'; text: string } // PC and item powers; 4ecb evaluates them

export interface Range {
  kind: RangeKind
  /** Melee reach. */
  reach?: number
  /** Ranged distance, or burst/blast/wall/aura size. */
  size?: number
  /** "area burst 2 within 10" -> within 10. */
  within?: number
  note?: string
}

export interface Attack {
  label: 'primary' | 'secondary' | 'tertiary'
  /** When a secondary attack happens relative to the previous one. */
  after?: 'hit' | 'miss' | 'always'
  range: Range
  /** "one creature", "each enemy in the burst". */
  target: string
  bonus: AttackBonus
  vs: Defense
  hit?: Line
  miss?: Line
  critical?: Line
  /** Applies when the hit's save-ends effects end. */
  aftereffect?: Line
  /** Applies on the target's first failed saving throw. */
  firstFailedSave?: Line
}

export interface Power {
  name: string
  action: ActionType
  usage: Usage
  /** Present when usage is 'recharge'. */
  recharge?: Recharge
  /** "2/Encounter". */
  usesPerEncounter?: number
  /** Basic attack icon. */
  basic?: 'melee' | 'ranged'
  keywords: string[]
  trigger?: Line
  requirement?: Line
  /** Empty for utility powers. */
  attacks: Attack[]
  /** Effect not tied to a hit or miss. */
  effect?: Line
  sustain?: { action: ActionType; line: Line }
  special?: Line
  /** Item and theme scaling ("Level 11: 4 fire damage"). */
  levelSteps?: { level: number; text: string }[]
}

export interface Trait {
  name: string
  keywords: string[]
  text: Line
}

export interface Aura extends Trait {
  range: number
}

// ── Monsters ──

export interface Sense {
  kind: SenseKind
  range?: number
}

export interface Speed {
  walk: number
  fly?: number
  overlandFlight?: number
  climb?: number
  swim?: number
  burrow?: number
  teleport?: number
  notes?: string
}

export interface Monster {
  id: string
  name: string
  level: number
  role: Role | null
  rank: Rank
  leader?: true
  size: Size
  origin: Origin | null
  type: CreatureType | null
  /** Subtypes: "undead", "devil", "mount". */
  keywords: string[]
  xp: number
  /** Minions: 1. Bloodied is derived. */
  hp: number
  initiative: number
  perception: number
  senses: Sense[]
  speed: Speed
  defenses: Record<Defense, number>
  savingThrowBonus: number
  actionPoints: number
  /** String for non-damage immunities: "fear", "gaze", "charm". */
  immune: { type: DamageType | string }[]
  resist: { type: DamageType | 'all' | string; value: number; note?: string }[]
  vulnerable: { type: DamageType | string; value: number; note?: string }[]
  regeneration?: { value: number; suppressedBy: DamageType[]; text: string }
  /** Ability scores. */
  abilities: Record<Ability, number>
  skills: Partial<Record<Skill, number>>
  alignment: string
  languages: string
  equipment: string
  traits: Trait[]
  auras: Aura[]
  powers: Power[]
  description: string
  source: SourceRef
  provenance: Provenance
}

// ── Items ──

export type DescriptionPart =
  | { type: 'text'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'properties'; items: string[] }

export type ItemSlot =
  | 'head' | 'neck' | 'arms' | 'hands' | 'waist' | 'feet' | 'ring' | 'body'
  | 'weapon' | 'implement' | 'tattoo' | 'wondrous' | 'mount' | 'ki-focus'

export interface Item {
  id: string
  name: string
  category: 'item' | 'weapon' | 'armor' | 'implement' | 'ritual' | 'alchemical' | 'set'
  level: number
  rarity: 'common' | 'uncommon' | 'rare' | null
  /** Tiers of one item; price in gp. */
  levels: { level: number; enhancement?: number; price: number }[]
  slot?: ItemSlot
  /** "Any melee", "Cloth, leather or hide". */
  itemType?: string
  critical?: Line
  properties: Line[]
  /** Usage may be 'consumable'. */
  powers: Power[]
  weapon?: {
    damage: string
    proficiency: number
    range?: string
    groups: string[]
    properties: string[]
    category: string
    weight?: string
  }
  ritual?: {
    keySkill: string
    castTime: string
    duration: string
    componentCost: string
    category: string
  }
  itemSet?: string
  flavor: string
  description: DescriptionPart[]
  source: SourceRef
  provenance: Provenance
}

// ── Traps and diseases ──

export interface Trap {
  id: string
  name: string
  kind: 'trap' | 'hazard' | 'terrain' | 'object'
  level: number
  role: 'blaster' | 'lurker' | 'obstacle' | 'warder' | string
  rank: 'standard' | 'elite' | 'solo'
  xp: number
  /** Perception and other skill checks to notice or understand it. */
  detect: { skill: string; dc: number; text: string }[]
  initiative?: number
  hp?: number
  defenses?: Partial<Record<Defense, number>>
  immune: { type: string }[]
  resist: { type: string; value: number }[]
  trigger?: Line
  powers: Power[]
  countermeasures: Line[]
  flavor: string
  description: string
  source: SourceRef
  provenance: Provenance
}

export interface Disease {
  id: string
  name: string
  level: number
  /** When the disease is delivered by an attack. */
  attack?: Attack
  endurance: { improveDc: number; maintainDc: number; worsenText?: string }
  /** Stage 0 = cured. */
  stages: { stage: number; final?: true; line: Line }[]
  flavor: string
  source: SourceRef
  provenance: Provenance
}

// ── Monster templates and themes ──

/** Data replacement for the old prereqCheck function. */
export type TemplatePrereq =
  | { kind: 'min-level'; level: number }
  | { kind: 'keyword'; any: string[] }
  | { kind: 'origin'; any: Origin[] }
  | { kind: 'type'; any: CreatureType[] }
  | { kind: 'all'; of: TemplatePrereq[] }

export interface MonsterTemplate {
  id: string
  name: string
  kind: 'functional' | 'class'
  /** Role the creature becomes. */
  role: Role
  /** Standard -> elite, elite -> solo. */
  raisesRank: true
  leader?: true
  prerequisite: { text: string; check?: TemplatePrereq }
  /** Added keyword: "undead", "shadow". */
  keyword?: string
  originChange?: Origin
  senses: Sense[]
  /** Bonuses. */
  defenses: Partial<Record<Defense, number>>
  /** Extra HP per level. */
  hpPerLevel: number
  hpNote?: string
  savingThrows: number
  actionPoints: number
  immune: { type: DamageType | string }[]
  resist: { type: DamageType | string; byTier: { heroic: number; paragon: number; epic: number } }[]
  vulnerable: { type: DamageType | string; value: number }[]
  regeneration?: { value: number; note?: string }
  traits: Trait[]
  auras: Aura[]
  powers: Power[]
  description: string
  source: SourceRef
  provenance: Provenance
}

export interface ThemePower extends Power {
  category: 'attack' | 'utility'
  recommendedFor?: Role[]
  flavor?: string
}

export interface MonsterTheme {
  id: string
  name: string
  description: string
  originChange?: Origin
  skills?: { always: string[]; choices?: string[][]; bonus: number }
  powers: ThemePower[]
  source: SourceRef
  provenance: Provenance
}
