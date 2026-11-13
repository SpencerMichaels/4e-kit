// D&D 4e content schema: monsters, powers, effect clauses, items, traps,
// diseases, monster templates and themes. Design notes live in the
// "4e Content Schema Draft" doc; the rules in short:
//   - Line.text keeps the printed wording; clauses are derived from it.
//   - Text that fits no clause kind becomes an 'unparsed' clause.
//   - Every entry records its provenance.
//   - Plain JSON only (no classes, no functions).

import type {
  Ability, ActionType, ConditionId, CreatureType, DamageType, Defense, Duration,
  Origin, RangeKind, Rank, Recharge, Role, SenseKind, Size, Skill, StatusId, Usage,
} from './vocab'

/**
 * 2: sources[], 'any' defense, optional resistance values, failedSaves and
 * extraLines, Power.range, item subtype/armor/tier/price text, trap traits,
 * level-relative disease DCs, template 'any' role and not/any-of prereqs.
 * 3: clause kinds use-power, recharge-power, lose-healing-surge, concealment,
 * zone, saving-throw and summon; extra/critical damage; multi-stat modifiers;
 * saveGroup on modifier, resistance/vulnerability and grants-ca; durations
 * while-in-aura and permanent; area Who values; Power.usesPerRound; string
 * source pages; trap auras and terrain usage; 'triggered' action type; item
 * weight/special/requirement/propertyLevelSteps/alchemical; template
 * rankChange (replaces raisesRank).
 * 4: clause kinds redirect-attack, crit-range, power-restriction, status
 * (insubstantial, phasing) and opportunity-reach; typeChoice on damage,
 * ongoing-damage and resistance/vulnerability (type 'choice'); heal perTarget;
 * the 'until' duration; optional sustain line; Monster.skillNotes; Trap.speed.
 */
export const SCHEMA_VERSION = 4

/**
 * A resistance or vulnerability: numeric ("resist 10 fire"), a damage type with
 * no number, or text-only. Text-only entries use type 'special' and keep the
 * printed wording in text: { type: 'special', text: 'insubstantial' }.
 */
export interface DamageModifier {
  type: DamageType | 'all' | string
  value?: number
  /** For text-only entries or qualifiers: "half damage from melee and ranged attacks". */
  text?: string
  note?: string
}

// ── Shared pieces ──

export interface SourceRef {
  book: string
  /** A page number, or printed text for booklet ranges ("2-77"). */
  page?: number | string
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

/** "any living creature in the zone" is creatures-in-area with an `if`. */
export type Who =
  | 'target' | 'self' | 'each-target' | 'ally' | 'enemies-in-area' | 'creatures-in-area' | 'allies-in-area' | 'other'

export type ModifierStat =
  | 'attack' | 'ac' | 'fortitude' | 'reflex' | 'will' | 'defenses'
  | 'speed' | 'saving-throws' | 'damage'

interface ClauseBase {
  /** Character span [start, end) in the owning Line.text. */
  at: [number, number]
  /** Condition text ("if the target is bloodied"): shown, never auto-applied. */
  if?: string
}

/** What a power-restriction clause forbids: "can't use encounter powers", "cannot attack". */
export type PowerRestriction = 'encounter' | 'daily' | 'attack' | 'all'

/**
 * typeChoice (damage, ongoing-damage, resistance, vulnerability): "one of the
 * following types: acid, cold or fire" is chosen when used; `types` is then []
 * and a resistance's `type` is 'choice'.
 */
export type Clause = ClauseBase & (
  /** extra: conditional extra damage (with `if`); critical: inline "(crit 2d8 + 11)". */
  | { kind: 'damage'; dice: string; types: DamageType[]; typeChoice?: DamageType[]; who: Who; extra?: true; critical?: true }
  /** PC/item damage formula ("2[W] + Strength modifier"); 4ecb evaluates it. */
  | { kind: 'damage-formula'; text: string; types: DamageType[] }
  | { kind: 'half-damage' }
  | { kind: 'ongoing-damage'; amount: number; types: DamageType[]; typeChoice?: DamageType[]; who: Who; duration: Duration; saveGroup?: string }
  | { kind: 'condition'; condition: ConditionId; who: Who; duration: Duration; saveGroup?: string }
  | { kind: 'grants-ca'; to: 'all' | 'source' | 'source-allies'; who: Who; duration: Duration; saveGroup?: string }
  | { kind: 'forced-move'; move: 'push' | 'pull' | 'slide'; squares: number; who: Who }
  | { kind: 'move'; move: 'shift' | 'teleport' | 'swap'; squares?: number; who: Who }
  /** One clause for "+2 to attack rolls and damage rolls": stat ['attack', 'damage']. */
  | { kind: 'modifier'; stat: ModifierStat | ModifierStat[]; value: number; who: Who; duration: Duration; saveGroup?: string }
  | { kind: 'resistance' | 'vulnerability'; type: DamageType | 'all' | 'choice'; typeChoice?: DamageType[]; value: number; who: Who; duration: Duration; saveGroup?: string }
  /** perTarget: the amount is per creature hit or damaged ("5 hit points for each creature damaged"). */
  | { kind: 'heal'; amount: number | 'surge-value' | 'half-surge-value'; who: Who; perTarget?: true }
  | { kind: 'temp-hp'; amount: number; who: Who }
  | { kind: 'regeneration'; value: number; who: Who; duration: Duration }
  | { kind: 'revive'; hp: number }
  /** "uses bite twice", "makes two claw attacks": power is the printed name. */
  | { kind: 'use-power'; power: string; times?: number; who: Who }
  /** "<power> recharges". */
  | { kind: 'recharge-power'; power: string }
  | { kind: 'lose-healing-surge'; count: number; who: Who }
  /** Partial concealment unless total. */
  | { kind: 'concealment'; total?: true; who: Who; duration: Duration }
  /** The power creates a zone; what the zone does is other clauses with `if`. */
  | { kind: 'zone'; duration: Duration }
  /** "makes a saving throw" (with a bonus: "+2 bonus"). */
  | { kind: 'saving-throw'; bonus?: number; who: Who }
  | { kind: 'summon'; creature: string; count?: number }
  /** "the triggering attack targets the guard instead": who becomes the target. */
  | { kind: 'redirect-attack'; who: Who }
  /** "scores a critical hit on a roll of 18-20": min 18. */
  | { kind: 'crit-range'; min: number; who: Who; duration: Duration }
  /** "can't use encounter or daily powers": what ['encounter', 'daily']. */
  | { kind: 'power-restriction'; what: PowerRestriction | PowerRestriction[]; who: Who; duration: Duration; saveGroup?: string }
  /** "becomes insubstantial and gains phasing": one clause per status. */
  | { kind: 'status'; status: StatusId; who: Who; duration: Duration; saveGroup?: string }
  /** "can make opportunity attacks against all enemies within its reach" (Threatening Reach). */
  | { kind: 'opportunity-reach'; who: Who }
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
  /** 'any': the attacker picks the defense ("vs. any defense"). */
  vs: Defense | 'any'
  hit?: Line
  miss?: Line
  critical?: Line
  /** Applies when the hit's save-ends effects end. */
  aftereffect?: Line
  /** "First Failed Saving Throw:", "Second Failed Saving Throw:", "Each Failed Saving Throw:". */
  failedSaves?: { n: number | 'each'; line: Line }[]
}

export interface Power {
  name: string
  action: ActionType
  usage: Usage
  /** Present when usage is 'recharge'. */
  recharge?: Recharge
  /** "2/Encounter". */
  usesPerEncounter?: number
  /** "1/round". */
  usesPerRound?: number
  /** Basic attack icon. */
  basic?: 'melee' | 'ranged'
  keywords: string[]
  trigger?: Line
  requirement?: Line
  /** Range of a power with no attack roll ("close burst 5; allies in the burst"). */
  range?: Range
  /** Empty for utility powers. */
  attacks: Attack[]
  /** Effect not tied to a hit or miss. */
  effect?: Line
  /** line is absent when the sustain is printed only inline ("(sustain minor)"). */
  sustain?: { action: ActionType; line?: Line }
  special?: Line
  /** Item and theme scaling ("Level 11: 4 fire damage"). */
  levelSteps?: { level: number; text: string }[]
  /** Labeled lines with no field of their own: form lines, numbered eye rays. */
  extraLines?: { label: string; line: Line }[]
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
  resist: DamageModifier[]
  vulnerable: DamageModifier[]
  regeneration?: { value: number; suppressedBy: DamageType[]; text: string }
  /** Ability scores. */
  abilities: Record<Ability, number>
  skills: Partial<Record<Skill, number>>
  /** Printed conditional skill bonuses: "+5 to Stealth checks when in ice or snow". */
  skillNotes?: string[]
  alignment: string
  languages: string
  equipment: string
  traits: Trait[]
  auras: Aura[]
  powers: Power[]
  description: string
  /** Every publication that prints the entry; the first is the primary source. */
  sources: SourceRef[]
  provenance: Provenance
}

// ── Items ──

export type DescriptionPart =
  | { type: 'text'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'properties'; items: string[] }
  /** Artifact and set powers printed inside the description. */
  | { type: 'power'; power: Power }

export type ItemSlot =
  | 'head' | 'neck' | 'arms' | 'hands' | 'waist' | 'feet' | 'ring' | 'body'
  | 'weapon' | 'implement' | 'tattoo' | 'wondrous' | 'mount' | 'ki-focus'

export interface Item {
  id: string
  name: string
  category: 'item' | 'weapon' | 'armor' | 'implement' | 'ritual' | 'alchemical' | 'set'
  level: number
  rarity: 'common' | 'uncommon' | 'rare' | null
  /** Tier-only items ("Heroic Tier" artifacts, boons). */
  tier?: 'heroic' | 'paragon' | 'epic'
  /** Tiers of one item; price in gp, or null with priceText ("Special", "Priceless"). */
  levels: { level: number; enhancement?: number; price: number | null; priceText?: string }[]
  slot?: ItemSlot
  /** Kind within the category: "Consumable", "Divine Boon", "Ammunition", "Mount". */
  subtype?: string
  /** "Any melee", "Cloth, leather or hide". */
  itemType?: string
  critical?: Line
  properties: Line[]
  /** Property scaling ("Level 15: +2 to the bonus"). */
  propertyLevelSteps?: { level: number; text: string }[]
  special?: Line
  requirement?: Line
  /** "1 lb." for non-weapons (weapons keep it in weapon.weight). */
  weight?: string
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
  armor?: {
    category: string
    acBonus: number
    check?: number
    speed?: number
    minEnhancement?: number
  }
  ritual?: {
    keySkill: string
    castTime: string
    duration: string
    componentCost: string
    category: string
  }
  /** Alchemical items: type ("Alchemical Item", "Poison") and formula cost text. */
  alchemical?: { type?: string; formulaCost?: string }
  itemSet?: string
  flavor: string
  description: DescriptionPart[]
  /** Every publication that prints the entry; the first is the primary source. */
  sources: SourceRef[]
  provenance: Provenance
}

// ── Traps and diseases ──

export interface Trap {
  id: string
  name: string
  kind: 'trap' | 'hazard' | 'terrain' | 'object' | 'area' | 'special'
  /** Terrain only: "At-Will Terrain", "Single-Use Terrain". */
  usage?: 'at-will' | 'single-use'
  level: number
  role: 'blaster' | 'lurker' | 'obstacle' | 'warder' | string
  rank: 'standard' | 'elite' | 'solo'
  xp: number
  /** Perception and other skill checks; dc null = "no check needed". */
  detect: { skill: string; dc: number | null; text: string }[]
  initiative?: number
  /** Hazards and creature-like traps that move ("Speed 5", "Speed 0, fly 4 (hover)"). */
  speed?: Speed
  hp?: number
  /** Non-numeric hit points ("see text"). */
  hpText?: string
  defenses?: Partial<Record<Defense, number>>
  immune: { type: string }[]
  resist: DamageModifier[]
  trigger?: Line
  traits: Trait[]
  auras: Aura[]
  powers: Power[]
  countermeasures: Line[]
  flavor: string
  description: string
  /** Every publication that prints the entry; the first is the primary source. */
  sources: SourceRef[]
  provenance: Provenance
}

export interface Disease {
  id: string
  name: string
  level: number
  /** When the disease is delivered by an attack. */
  attack?: Attack
  /** DCs may be level-relative text ("Easy DC", "15 + encounter level"). */
  endurance: { improveDc: number | { text: string }; maintainDc: number | { text: string }; worsenText?: string }
  /** The check itself when it isn't plain Endurance: skill and conditions. */
  check?: { skill: string; text: string }
  /** Stage 0 = cured. */
  stages: { stage: number; final?: true; line: Line }[]
  flavor: string
  /** Every publication that prints the entry; the first is the primary source. */
  sources: SourceRef[]
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
  | { kind: 'any-of'; of: TemplatePrereq[] }
  | { kind: 'not'; of: TemplatePrereq }
  /** "Solo dragon": checks the creature's rank. */
  | { kind: 'rank'; any: Rank[] }

export interface MonsterTemplate {
  id: string
  name: string
  kind: 'functional' | 'class'
  /** Role the creature becomes; 'any' keeps its current role. */
  role: Role | 'any'
  /** 'up': standard -> elite, elite -> solo; 'down': solo -> elite (Elite Dragon). */
  rankChange: 'up' | 'down'
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
  vulnerable: DamageModifier[]
  regeneration?: { value: number; note?: string }
  traits: Trait[]
  auras: Aura[]
  powers: Power[]
  description: string
  /** Every publication that prints the entry; the first is the primary source. */
  sources: SourceRef[]
  provenance: Provenance
}

export interface ThemePower extends Power {
  category: 'attack' | 'utility'
  recommendedFor?: Role[]
  /** The printed recommendation when it isn't just roles: "leaders", "Large or larger brutes". */
  recommendedText?: string
  flavor?: string
}

export interface MonsterTheme {
  id: string
  name: string
  description: string
  originChange?: Origin
  skills?: { always: string[]; choices?: string[][]; bonus: number }
  powers: ThemePower[]
  /** Every publication that prints the entry; the first is the primary source. */
  sources: SourceRef[]
  provenance: Provenance
}
