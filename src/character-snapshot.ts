// An evaluated player character: final numbers, not build choices.
// 4ecb embeds one in its .4ecb export; 4e DM Dashboard imports it, and can
// produce one from a Character Builder .dnd4e save.

import type { Power } from './schema'
import type { Ability, Defense, Skill } from './vocab'

export const CHARACTER_SNAPSHOT_VERSION = 1

export interface CharacterSnapshot {
  version: typeof CHARACTER_SNAPSHOT_VERSION
  /** Stable id from the source app, so re-importing updates instead of duplicating. */
  sourceId: string
  source: { app: '4ecb' | 'character-builder'; appVersion?: string; exportedAt: string }

  name: string
  player?: string
  level: number
  race: string
  class: string
  paragonPath?: string
  epicDestiny?: string
  /** Defender class mark id ("hunter-quarry", "oath-of-enmity"), if any. */
  markType?: string

  hp: { max: number; bloodied: number; surgeValue: number; surgesPerDay: number }
  defenses: Record<Defense, number>
  initiative: number
  speed: number
  passivePerception: number
  passiveInsight: number
  /** Scores and modifiers as printed (modifier includes half level). */
  abilities: Record<Ability, { score: number; modifier: number }>
  skills: Record<Skill, { total: number; trained: boolean }>
  savingThrowBonus: number
  resist: { type: string; value: number }[]
  actionPoints: number

  /** Attack bonuses and damage are evaluated: AttackBonus 'fixed', clause 'damage' with dice. */
  powers: Power[]
  /** Names only; items stay in the character builder. */
  items: { name: string; equipped: boolean }[]
}
