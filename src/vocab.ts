// Closed D&D 4e vocabularies shared by 4e DM Dashboard and 4ecb.
// Each list is the single source of truth for its type; ids are lowercase kebab-case.

export const ACTION_TYPES = [
  'standard', 'move', 'minor', 'free',
  'immediate-interrupt', 'immediate-reaction', 'opportunity', 'no-action',
] as const
export type ActionType = (typeof ACTION_TYPES)[number]

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  'standard': 'Standard Action',
  'move': 'Move Action',
  'minor': 'Minor Action',
  'free': 'Free Action',
  'immediate-interrupt': 'Immediate Interrupt',
  'immediate-reaction': 'Immediate Reaction',
  'opportunity': 'Opportunity Action',
  'no-action': 'No Action',
}

/** Glyphs both apps print for action types (4ecb's tests assert this exact set). */
export const ACTION_TYPE_SYMBOLS: Record<ActionType, string> = {
  'standard': '●',
  'move': '≫',
  'minor': '◔',
  'free': '○',
  'immediate-interrupt': '↯',
  'immediate-reaction': '↻',
  'opportunity': '↻',
  'no-action': '–',
}

export const USAGES = ['at-will', 'encounter', 'daily', 'recharge', 'consumable'] as const
export type Usage = (typeof USAGES)[number]

export const USAGE_LABELS: Record<Usage, string> = {
  'at-will': 'At-Will',
  'encounter': 'Encounter',
  'daily': 'Daily',
  'recharge': 'Recharge',
  'consumable': 'Consumable',
}

export type Recharge =
  | { readonly kind: 'roll'; readonly min: 2 | 3 | 4 | 5 | 6 } // "recharge 5-6" -> min 5
  | { readonly kind: 'bloodied' } // "recharge when first bloodied"
  | { readonly kind: 'text'; readonly text: string } // anything else, shown verbatim

export const RANGE_KINDS = [
  'melee', 'ranged', 'close-burst', 'close-blast', 'area-burst', 'area-wall', 'personal', 'aura',
] as const
export type RangeKind = (typeof RANGE_KINDS)[number]

export const DEFENSES = ['ac', 'fortitude', 'reflex', 'will'] as const
export type Defense = (typeof DEFENSES)[number]

export const DEFENSE_LABELS: Record<Defense, string> = {
  ac: 'AC',
  fortitude: 'Fortitude',
  reflex: 'Reflex',
  will: 'Will',
}

export const DAMAGE_TYPES = [
  'acid', 'cold', 'fire', 'force', 'lightning',
  'necrotic', 'poison', 'psychic', 'radiant', 'thunder',
] as const
export type DamageType = (typeof DAMAGE_TYPES)[number]

export const CONDITION_IDS = [
  'blinded', 'dazed', 'deafened', 'dominated', 'dying', 'grabbed', 'helpless',
  'immobilized', 'invisible', 'marked', 'petrified', 'prone', 'removed-from-play',
  'restrained', 'slowed', 'stunned', 'surprised', 'unconscious', 'weakened',
] as const
export type ConditionId = (typeof CONDITION_IDS)[number]

export type Duration =
  | { readonly kind: 'save-ends' }
  /** "until the end of your next turn": whose turn, and whether it's the next one. */
  | { readonly kind: 'turn-end'; readonly whose: 'source' | 'target'; readonly next: boolean }
  | { readonly kind: 'turn-start'; readonly whose: 'source' | 'target'; readonly next: boolean }
  | { readonly kind: 'encounter' }
  | { readonly kind: 'sustain'; readonly action: ActionType }
  /** Damage, forced movement: happens and is done. */
  | { readonly kind: 'instant' }
  /** Prone and similar: lasts until something removes it. */
  | { readonly kind: 'indefinite' }

export const ROLES = ['artillery', 'brute', 'controller', 'lurker', 'skirmisher', 'soldier'] as const
export type Role = (typeof ROLES)[number]

export const RANKS = ['standard', 'elite', 'solo', 'minion'] as const
export type Rank = (typeof RANKS)[number]

export const SIZES = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'] as const
export type Size = (typeof SIZES)[number]

export const ORIGINS = ['aberrant', 'elemental', 'fey', 'immortal', 'natural', 'shadow'] as const
export type Origin = (typeof ORIGINS)[number]

export const CREATURE_TYPES = ['animate', 'beast', 'humanoid', 'magical-beast'] as const
export type CreatureType = (typeof CREATURE_TYPES)[number]

export const ABILITIES = ['str', 'con', 'dex', 'int', 'wis', 'cha'] as const
export type Ability = (typeof ABILITIES)[number]

export const SKILLS = [
  'acrobatics', 'arcana', 'athletics', 'bluff', 'diplomacy', 'dungeoneering', 'endurance',
  'heal', 'history', 'insight', 'intimidate', 'nature', 'perception', 'religion', 'stealth',
  'streetwise', 'thievery',
] as const
export type Skill = (typeof SKILLS)[number]

export const SENSE_KINDS = [
  'darkvision', 'low-light-vision', 'blindsight', 'tremorsense', 'truesight', 'all-around-vision',
] as const
export type SenseKind = (typeof SENSE_KINDS)[number]

/** Type guard for any of the closed lists above: `isOneOf(DEFENSES, x)`. */
export function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value)
}

/** Experience for one standard monster of each level, 1-40 (DMG p.56). */
export const XP_BY_LEVEL: Readonly<Record<number, number>> = {
  1: 100, 2: 125, 3: 150, 4: 175, 5: 200, 6: 250, 7: 300, 8: 350, 9: 400, 10: 500,
  11: 600, 12: 700, 13: 800, 14: 1000, 15: 1200, 16: 1400, 17: 1600, 18: 2000, 19: 2400, 20: 2800,
  21: 3200, 22: 4150, 23: 5100, 24: 6050, 25: 7000, 26: 9000, 27: 11000, 28: 13000, 29: 15000, 30: 19000,
  31: 23000, 32: 27000, 33: 31000, 34: 39000, 35: 47000, 36: 55000, 37: 63000, 38: 79000, 39: 95000, 40: 111000,
}

/** Rank multipliers on XP_BY_LEVEL: elite x2, solo x5, minion x1/4. */
export const XP_RANK_MULTIPLIER: Readonly<Record<Rank, number>> = {
  standard: 1, elite: 2, solo: 5, minion: 0.25,
}

/** XP for a monster; levels are clamped to 1-40. */
export function monsterXp(level: number, rank: Rank): number {
  const base = XP_BY_LEVEL[Math.min(Math.max(level, 1), 40)] ?? 0
  return Math.round(base * XP_RANK_MULTIPLIER[rank])
}
