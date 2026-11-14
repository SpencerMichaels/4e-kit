import { describe, expect, it } from 'vitest'
import { ACTION_TYPES } from './vocab'
import { ACTION_TYPE_ICON, abbreviateDefense, groupLines, rechargeLabel, sustainLine, textAtLevel, usageChipLabel, usedChipLabel } from './power-card'

describe('power card labels', () => {
  it('labels usage for the header chip', () => {
    expect(usageChipLabel({ usage: 'at-will' })).toBe('At-Will')
    expect(usageChipLabel({ usage: 'encounter' })).toBe('Enc')
    expect(usageChipLabel({ usage: 'encounter', encounterUses: 2 })).toBe('2/Enc')
    expect(usageChipLabel({ usage: 'recharge', rechargeValue: 5 })).toBe('Rch 5+')
    expect(usageChipLabel({ usage: 'recharge', rechargeValue: 6 })).toBe('Rch 6')
    expect(usageChipLabel({ usage: 'recharge', rechargeCondition: 'when first bloodied' })).toBe('Rch when first bloodied')
    expect(usageChipLabel({ usage: 'aura', auraSize: '2' })).toBe('Aura 2')
    expect(usageChipLabel({ usage: 'trait' })).toBe('Trait')
  })

  it('says a spent power is used, in words', () => {
    expect(usedChipLabel({ usage: 'encounter' }, 1, 1)).toBe('USED')
    expect(usedChipLabel({ usage: 'encounter', encounterUses: 2 }, 1, 2)).toBe('1/2 Enc')
    expect(usedChipLabel({ usage: 'recharge', rechargeValue: 5 }, 1, 1)).toBe('Rch 5+ · USED')
    expect(usedChipLabel({ usage: 'at-will' }, 0, Infinity)).toBe('At-Will')
  })

  it('shortens defenses and recharges', () => {
    expect(['AC', 'Fortitude', 'reflex', 'Will', 'any'].map(abbreviateDefense)).toEqual(['AC', 'Fort', 'Ref', 'Will', 'any'])
    expect(rechargeLabel(4)).toBe('Rch 4+')
  })

  it('names the sustain action', () => {
    expect(sustainLine('minor: The zone persists.')).toEqual({ label: 'Sustain Minor', text: 'The zone persists.' })
    expect(sustainLine('Sustain Standard: the cloud moves 3 squares.')).toEqual({ label: 'Sustain Standard', text: 'the cloud moves 3 squares.' })
    expect(sustainLine('The zone persists.')).toEqual({ label: 'Sustain', text: 'The zone persists.' })
  })
})

describe('power card lines', () => {
  it('groups an attack power in book order', () => {
    const { groups, basic } = groupLines({
      attack: true, requirement: 'The dragon is bloodied.', hit: '3d10+8 fire damage.', miss: 'Half damage.', effect: 'The dragon shifts 2 squares.',
      sustain: 'minor: The blast persists.', special: 'Usable while flying.',
      text: 'Failed save 1: The target is stunned.\nMelee basic attack\nUses per encounter: 2\nsecondary attack (hit): melee 1; one creature; +12 vs Reflex.\nhit: The target is knocked prone.',
    })
    expect(basic).toBe('melee')
    expect(groups.map(g => g.map(l => l.label))).toEqual([
      ['Requirement'],
      ['Hit', 'Miss', 'Failed save 1'],
      ['Secondary attack (hit)', 'Hit'],
      ['Effect'],
      ['Sustain Minor'],
      ['Special'],
    ])
    expect(groups[1]?.[0]).toMatchObject({ field: 'hit' })
  })

  it('keeps a triggered power\'s effect with its trigger', () => {
    const { groups } = groupLines({ trigger: 'An enemy hits the dragon.', effect: 'The dragon shifts 3 squares.', special: 'Once per round.' })
    expect(groups.map(g => g.map(l => l.label))).toEqual([['Trigger', 'Effect'], ['Special']])
  })

  it('picks the text for a level', () => {
    const steps = [{ level: 11, text: '2d6' }, { level: 21, text: '3d6' }]
    expect(textAtLevel(steps, 15)?.text).toBe('2d6')
    expect(textAtLevel(steps, 5)).toBeUndefined()
  })
})

describe('action type icons', () => {
  it('names a kebab-case icon for every action type', () => {
    for (const a of ACTION_TYPES) expect(ACTION_TYPE_ICON[a]).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })
})
