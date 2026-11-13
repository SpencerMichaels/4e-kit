import { describe, expect, it } from 'vitest'
import {
  ACTION_TYPES, ACTION_TYPE_LABELS, ACTION_TYPE_SYMBOLS, CONDITION_IDS, DAMAGE_TYPES,
  DEFENSES, DEFENSE_LABELS, STATUS_IDS, USAGES, USAGE_LABELS, isOneOf, monsterXp,
} from './vocab'

const kebab = /^[a-z]+(-[a-z]+)*$/

describe('vocabularies', () => {
  it('uses lowercase kebab-case ids with no duplicates', () => {
    for (const list of [ACTION_TYPES, USAGES, DEFENSES, DAMAGE_TYPES, CONDITION_IDS, STATUS_IDS]) {
      for (const id of list) expect(id).toMatch(kebab)
      expect(new Set(list).size).toBe(list.length)
    }
  })

  it('has a label for every id', () => {
    expect(Object.keys(ACTION_TYPE_LABELS).sort()).toEqual([...ACTION_TYPES].sort())
    expect(Object.keys(ACTION_TYPE_SYMBOLS).sort()).toEqual([...ACTION_TYPES].sort())
    expect(Object.keys(USAGE_LABELS).sort()).toEqual([...USAGES].sort())
    expect(Object.keys(DEFENSE_LABELS).sort()).toEqual([...DEFENSES].sort())
  })

  it('keeps the action glyph set both apps print', () => {
    expect(new Set(Object.values(ACTION_TYPE_SYMBOLS))).toEqual(new Set(['●', '≫', '◔', '○', '↯', '↻', '–']))
    // Traps' "Triggered Action" reuses the reaction glyph.
    expect(ACTION_TYPE_LABELS.triggered).toBe('Triggered Action')
    expect(ACTION_TYPE_SYMBOLS.triggered).toBe('↻')
  })

  it('isOneOf narrows only list members', () => {
    expect(isOneOf(DEFENSES, 'reflex')).toBe(true)
    expect(isOneOf(DEFENSES, 'Reflex')).toBe(false)
    expect(isOneOf(DEFENSES, 3)).toBe(false)
  })
})

describe('monsterXp', () => {
  it('applies rank multipliers', () => {
    expect(monsterXp(5, 'standard')).toBe(200)
    expect(monsterXp(5, 'elite')).toBe(400)
    expect(monsterXp(5, 'solo')).toBe(1000)
    expect(monsterXp(5, 'minion')).toBe(50)
    expect(monsterXp(34, 'standard')).toBe(39000)
    expect(monsterXp(45, 'standard')).toBe(111000)
  })
})
