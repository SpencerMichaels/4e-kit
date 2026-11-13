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
 * 5: Attack.altBonus for printed conditional bonuses ("+37 while bloodied");
 * 'unknown' for Attack.vs and Power.usage when the print names none (validators
 * flag it for review instead of a guess); grants-ca 'source-allies' includes the
 * source.
 * 6: ClauseBase `if` is one exact printed fragment of the owning Line.text or a
 * list of them (a split condition; no " ... " joins); `unless` holds the printed
 * condition under which the clause does not apply (replaces the "not:" prefix);
 * `optional: true` marks an effect the print makes optional ("can shift 4
 * squares"), offered as a choice and never auto-applied (options are no longer
 * written as `if`).
 * 7: clause kind difficult-terrain; move "fly" and "move" (plain movement);
 * status "no-provoke"; `who` may be a list (one effect on several subjects:
 * ["self", "ally"]); Aura.rangeIf ("aura 2, or 3 while bloodied"); condition
 * escapeDc ("grabbed (escape DC 20)"). Damage quotes need the dice, not the
 * word "damage" (validators: "2d8+10 plus 2d6 lightning damage" is two clauses).
 * 8: clause kinds charge, disease (printed name, optional diseaseId and stage),
 * reroll and action-point; Who 'rider' and 'mount'; duration 'this-power'
 * (only the attacks the same power makes); Monster.savingThrowNotes for printed
 * conditional saving throw bonuses ("+5 against fear effects"), which are no
 * longer folded into savingThrowBonus.
 * 9: Monster.defensesIf for printed conditional defense values ("Fortitude 23
 * (25 while bloodied)", "AC 24 (28 against opportunity attacks)"); the base value
 * stays in defenses. Clause kind sense ("gains tremorsense 10", "can see
 * invisible creatures": sense 'see-invisible').
 * 10: clause kind choice (either/or outcomes: options of clauses, one level
 * deep, each quoted inside the choice's own span; chooser self/target);
 * grants-ca `to` 'rider', 'mount' and 'ally' (a third party gains combat
 * advantage); ModifierStat skill and ability checks ('skill:athletics',
 * 'skill-checks', 'ability:str', 'ability-checks'); reroll `what` may be a list.
 * "falls asleep" is condition 'unconscious' (4e sleep is unconscious; the
 * printed wake rule goes in an 'until' duration), not a new status.
 * 11: clause kind speed (a movement mode gained or set: "gains a fly speed of
 * 12", "fly 8 (hover)"; a change to one non-walk mode in `change`; a plain
 * "+2 bonus to speed" stays modifier 'speed'); status 'no-concealment'
 * ("cannot benefit from invisibility or concealment"); ModifierStat
 * 'initiative'; saveModifier on condition and ongoing-damage clauses ("(save
 * ends, with a -2 penalty to the saving throw)": -2); Aura.range is optional,
 * with Aura.rangeText for a printed size that is not a number ("aura sight").
 * 12: damage `duration` (a lingering window: "deal 1d6 extra damage until the
 * end of its next turn") and `by` (who deals it, when not the source: "undead
 * allies deal 2d6 extra fire damage"); `per` (the printed "for each ..." words)
 * on damage, modifier, heal and temp-hp; heal and temp-hp amounts may be dice
 * ("1d10") or 'damage-dealt' / 'half-damage-dealt' (heal), temp-hp also
 * 'surge-value'; half-damage `who`/`duration`; ongoing-damage `increase`
 * ("that damage increases by 5"); statuses 'no-regain-hp', 'no-healing-surges',
 * 'ignore-difficult-terrain'; power-restriction actions, movement and 'named'
 * (with `powers`); ModifierStat 'forced-movement' ("moves 1 square fewer than
 * the effect specifies": -1) and 'recharge' (recharge rolls); clause kinds
 * automatic (hit, critical, save), lose-resistance, immunity, end-effect and
 * extra-action; zone `blocksLineOfSight`; Attack.name for named sub-attacks;
 * Monster.hpIf ("(99 if in a possessed body)") and regeneration
 * `suppressedText` for printed suppressors that are not damage types.
 */
export const SCHEMA_VERSION = 12

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

/**
 * "any living creature in the zone" is creatures-in-area with an `if`. A clause
 * `who` is one Who, or a list when one printed effect covers several subjects
 * ("The overseer and one ally turn invisible": ["self", "ally"]). 'rider' and
 * 'mount': the creature riding the source, or the source's mount.
 */
export type Who =
  | 'target' | 'self' | 'each-target' | 'ally' | 'enemies-in-area' | 'creatures-in-area' | 'allies-in-area'
  | 'rider' | 'mount' | 'other'

/** Checks: 'skill:stealth', 'skill-checks' (all), 'ability:str' ("Strength checks"), 'ability-checks'. */
export type ModifierStat =
  | 'attack' | 'ac' | 'fortitude' | 'reflex' | 'will' | 'defenses'
  | 'speed' | 'saving-throws' | 'damage' | 'initiative' | 'forced-movement' | 'recharge'
  | `skill:${Skill}` | 'skill-checks' | `ability:${Ability}` | 'ability-checks'

/** A dice amount: "1d10", "2d6+3". */
export type DiceAmount = `${number}d${number}${string}`

interface ClauseBase {
  /** Character span [start, end) in the owning Line.text. */
  at: [number, number]
  /**
   * The printed condition: exact fragment(s) of the owning Line.text, never the
   * clause's own words ("if the target is bloodied"; a split condition is
   * several fragments in printed order). Shown, never auto-applied.
   */
  if?: string | string[]
  /** Exact printed fragment(s) of a condition under which the clause does not apply ("If the target is already slowed"). */
  unless?: string | string[]
  /** The print makes the effect optional ("can shift 4 squares"): offered as a choice, never auto-applied. */
  optional?: true
}

/** What a power-restriction clause forbids: "can't use encounter powers", "cannot attack", "cannot shift". */
export type PowerRestriction =
  | 'encounter' | 'daily' | 'attack' | 'all'
  | 'standard' | 'move' | 'minor' | 'immediate' | 'opportunity'
  | 'shift' | 'teleport' | 'charge' | 'named'

/**
 * typeChoice (damage, ongoing-damage, resistance, vulnerability): "one of the
 * following types: acid, cold or fire" is chosen when used; `types` is then []
 * and a resistance's `type` is 'choice'.
 */
export type Clause = ClauseBase & (
  /** extra: conditional (with `if`); critical: inline "(crit 2d8 + 11)"; duration: dealt later in a window; by: who deals it, if not the source. */
  | { kind: 'damage'; dice: string; types: DamageType[]; typeChoice?: DamageType[]; who: Who | Who[]; extra?: true; critical?: true; by?: Who | Who[]; per?: string; duration?: Duration }
  /** PC/item damage formula ("2[W] + Strength modifier"); 4ecb evaluates it. */
  | { kind: 'damage-formula'; text: string; types: DamageType[] }
  | { kind: 'half-damage'; who?: Who | Who[]; duration?: Duration }
  /** saveModifier: a printed modifier to the saving throw against it ("(save ends, with a -2 penalty to the saving throw)": -2). increase: "that damage increases by 5". */
  | { kind: 'ongoing-damage'; amount: number; types: DamageType[]; typeChoice?: DamageType[]; who: Who | Who[]; duration: Duration; saveGroup?: string; saveModifier?: number; increase?: true }
  /** escapeDc: a grab's "(escape DC 20)". "falls asleep" is 'unconscious' with the wake rule as duration. saveModifier as for ongoing-damage. */
  | { kind: 'condition'; condition: ConditionId; who: Who | Who[]; duration: Duration; saveGroup?: string; escapeDc?: number; saveModifier?: number }
  /** `to` gains it against `who`: 'source' only, 'source-allies' (the source and its allies), 'all', or only a third party ('rider', 'mount', 'ally'). */
  | { kind: 'grants-ca'; to: 'all' | 'source' | 'source-allies' | 'rider' | 'mount' | 'ally'; who: Who | Who[]; duration: Duration; saveGroup?: string }
  | { kind: 'forced-move'; move: 'push' | 'pull' | 'slide'; squares: number; who: Who | Who[] }
  /** move "fly": flies; "move": any other movement of its own ("moves its speed", "jumps 5 squares"); no squares when no number is printed. */
  | { kind: 'move'; move: 'shift' | 'teleport' | 'swap' | 'fly' | 'move'; squares?: number; who: Who | Who[] }
  /** One clause for "+2 to attack rolls and damage rolls": stat ['attack', 'damage']. */
  | { kind: 'modifier'; stat: ModifierStat | ModifierStat[]; value: number; who: Who | Who[]; duration: Duration; saveGroup?: string; per?: string }
  | { kind: 'resistance' | 'vulnerability'; type: DamageType | 'all' | 'choice'; typeChoice?: DamageType[]; value: number; who: Who | Who[]; duration: Duration; saveGroup?: string }
  /** perTarget: per creature hit or damaged ("5 hit points for each creature damaged"). per (also damage, modifier, temp-hp): printed "for each ..." words. */
  | { kind: 'heal'; amount: number | DiceAmount | 'surge-value' | 'half-surge-value' | 'damage-dealt' | 'half-damage-dealt'; who: Who | Who[]; perTarget?: true; per?: string }
  | { kind: 'temp-hp'; amount: number | DiceAmount | 'surge-value'; who: Who | Who[]; per?: string }
  | { kind: 'regeneration'; value: number; who: Who | Who[]; duration: Duration }
  | { kind: 'revive'; hp: number }
  /** "uses bite twice", "makes two claw attacks": power is the printed name. */
  | { kind: 'use-power'; power: string; times?: number; who: Who | Who[] }
  /** "<power> recharges". */
  | { kind: 'recharge-power'; power: string }
  | { kind: 'lose-healing-surge'; count: number; who: Who | Who[] }
  /** Partial concealment unless total. */
  | { kind: 'concealment'; total?: true; who: Who | Who[]; duration: Duration }
  /** The power creates a zone; what the zone does is other clauses with `if`. */
  | { kind: 'zone'; duration: Duration; blocksLineOfSight?: true }
  /** "makes a saving throw" (with a bonus: "+2 bonus"). */
  | { kind: 'saving-throw'; bonus?: number; who: Who | Who[] }
  | { kind: 'summon'; creature: string; count?: number }
  /** "the triggering attack targets the guard instead": who becomes the target. */
  | { kind: 'redirect-attack'; who: Who | Who[] }
  /** "scores a critical hit on a roll of 18-20": min 18. */
  | { kind: 'crit-range'; min: number; who: Who | Who[]; duration: Duration }
  /** "can't use encounter or daily powers": what ['encounter', 'daily']; 'named': the printed names in `powers`. */
  | { kind: 'power-restriction'; what: PowerRestriction | PowerRestriction[]; powers?: string[]; who: Who | Who[]; duration: Duration; saveGroup?: string }
  /** "becomes insubstantial and gains phasing": one clause per status. */
  | { kind: 'status'; status: StatusId; who: Who | Who[]; duration: Duration; saveGroup?: string }
  /** "can make opportunity attacks against all enemies within its reach" (Threatening Reach). */
  | { kind: 'opportunity-reach'; who: Who | Who[] }
  /**
   * The area the line describes (an aura, zone or burst) is difficult terrain;
   * `who` limits it ("difficult terrain for enemies": enemies-in-area), absent
   * for every creature.
   */
  | { kind: 'difficult-terrain'; who?: Who | Who[]; duration: Duration }
  /** "charges the enemy and makes the following attack"; "can charge" is `optional`. */
  | { kind: 'charge'; who: Who | Who[] }
  /**
   * "the target contracts mummy rot (stage 1)": disease is the printed name;
   * diseaseId the matching Disease entry (filled by tools); stage as printed.
   */
  | { kind: 'disease'; disease: string; diseaseId?: string; stage?: number; who: Who | Who[] }
  /**
   * "forces the attacker to reroll the attack": who rerolls; keep says which
   * roll counts when printed ("must use the second result": 'new').
   */
  | { kind: 'reroll'; what: RerollWhat | RerollWhat[]; keep?: 'new' | 'higher' | 'lower'; who: Who | Who[] }
  /** "gains 1 action point". */
  | { kind: 'action-point'; amount: number; who: Who | Who[] }
  /** A sense the subject gains: "gains tremorsense 10"; "can see invisible creatures" is 'see-invisible'. */
  | { kind: 'sense'; sense: SenseKind | 'see-invisible'; range?: number; who: Who | Who[]; duration: Duration }
  /** A mode gained or set ("gains a fly speed of 12"); change: to a non-walk mode ("+2 to its fly speed"). "+2 bonus to speed" is modifier 'speed'. */
  | { kind: 'speed'; mode: SpeedMode; value?: number; change?: number; hover?: true; who: Who | Who[]; duration: Duration }
  /** Either/or ("slides 4 squares or is knocked prone"): 2+ options of clauses inside this span (with "or"/"either"), no nested choice; chooser when printed. */
  | { kind: 'choice'; options: OptionClause[][]; chooser?: 'self' | 'target' }
  | { kind: 'automatic'; what: 'hit' | 'critical' | 'save'; who: Who | Who[]; duration: Duration }
  /** value: only that much ("ignores 10 points of resist all"). */
  | { kind: 'lose-resistance'; types: (DamageType | 'all')[]; value?: number; who: Who | Who[]; duration: Duration }
  /** to: damage types, 'all' (all damage) or printed words ("fear"). */
  | { kind: 'immunity'; to: string[]; who: Who | Who[]; duration: Duration }
  /** No conditions: the printed effects end ("ends one effect a save can end"). */
  | { kind: 'end-effect'; conditions?: ConditionId[]; who: Who | Who[] }
  | { kind: 'extra-action'; action: ActionType; who: Who | Who[] }
  | { kind: 'unparsed'; text: string }
)

/** A clause inside a choice option: any clause but another choice. */
export type OptionClause = Exclude<Clause, { kind: 'choice' }>

/** The movement mode of a speed clause. */
export type SpeedMode = 'walk' | 'fly' | 'climb' | 'swim' | 'burrow' | 'teleport' | 'overland-flight'

/** What a reroll clause rerolls. */
export type RerollWhat = 'attack' | 'save' | 'damage' | 'check'

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
  /** A named sub-attack in a multi-attack power ("Earth Shock"). */
  name?: string
  /** When a secondary attack happens relative to the previous one. */
  after?: 'hit' | 'miss' | 'always'
  range: Range
  /** "one creature", "each enemy in the burst". */
  target: string
  bonus: AttackBonus
  /** 'any': the attacker picks the defense ("vs. any defense"); 'unknown': the print names none ("+34 vs ;"). */
  vs: Defense | 'any' | 'unknown'
  /** Printed conditional bonuses: "(+37 while bloodied)", "or +20 vs. Reflex if the target is bloodied" (vs when it changes). */
  altBonus?: { value: number; if: string; vs?: Defense }[]
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
  /** 'unknown' when the print gives no usage (never a guessed default). */
  usage: Usage | 'unknown'
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
  /** Absent when the printed size is not a number: "aura sight" is rangeText "sight". */
  range?: number
  rangeText?: string
  /** Printed alternative sizes: "aura 2, or 3 while the balor is bloodied" is range 2, rangeIf [{ value: 3, if: "while the balor is bloodied" }]. */
  rangeIf?: { value: number; if: string | string[] }[]
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
  /** "HP 66 (99 if in a possessed body)": [{ value: 99, if: "if in a possessed body" }]. */
  hpIf?: { value: number; if: string | string[] }[]
  initiative: number
  perception: number
  senses: Sense[]
  speed: Speed
  defenses: Record<Defense, number>
  /**
   * Printed conditional defense values: "Fortitude 23 (25 while bloodied)" is
   * fortitude 23 in defenses plus { defense: 'fortitude', value: 25, if: "while bloodied" }.
   */
  defensesIf?: { defense: Defense; value: number; if: string | string[] }[]
  /** The unconditional bonus only ("Saving Throws +5 against fear effects" is 0). */
  savingThrowBonus: number
  /** Printed conditional saving throw bonuses and notes: "+5 against fear effects". */
  savingThrowNotes?: string[]
  actionPoints: number
  /** String for non-damage immunities: "fear", "gaze", "charm". */
  immune: { type: DamageType | string }[]
  resist: DamageModifier[]
  vulnerable: DamageModifier[]
  /** suppressedText: printed suppressors that are not damage types ("direct sunlight"). */
  regeneration?: { value: number; suppressedBy: DamageType[]; suppressedText?: string; text: string }
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
