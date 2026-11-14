// What a power card shows, independent of how it is drawn: icon names for action types, the
// usage chip's label, the attack line's short defense names, and the body's lines in book order,
// grouped. Pure data and functions; each app draws icons with its own component (4ecb imports the
// icons it uses, the DM dashboard looks them up by name), so the kit holds the names, not React.

import type { ActionType } from './vocab'

/**
 * Icon names (Lucide, kebab-case) per action type: the ones 4ecb's power cards draw (its ActionTypeIcon),
 * the kit's symbols as icons. Standard is free's circle, filled; minor's pie has its slice filled (the
 * `.action-type-icon` CSS). Triggered shares the reaction's icon, as it shares its symbol.
 */
export const ACTION_TYPE_ICON: Readonly<Record<ActionType, string>> = {
  standard: 'circle',
  move: 'chevrons-right',
  minor: 'chart-pie',
  free: 'circle',
  'immediate-interrupt': 'trending-up',
  'immediate-reaction': 'redo-2',
  opportunity: 'redo-dot',
  'no-action': 'minus',
  triggered: 'redo-2',
}

const DEFENSE_SHORT: Record<string, string> = { ac: 'AC', fortitude: 'Fort', reflex: 'Ref', will: 'Will' }
/** "Fortitude" -> "Fort", "AC" stays; anything else is returned as printed. */
export const abbreviateDefense = (d: string) => DEFENSE_SHORT[d.trim().toLowerCase()] ?? d

/** "Rch 5+", "Rch 6", or the printed condition ("Rch when first bloodied"). */
export function rechargeLabel(min?: number, condition?: string): string {
  if (min) return `Rch ${min}${min < 6 ? '+' : ''}`
  return condition ? `Rch ${condition}` : 'Rch'
}

export interface UsageInput {
  usage?: string
  rechargeValue?: number
  rechargeCondition?: string
  /** Uses per encounter when more than one. */
  encounterUses?: number
  /** Aura size, for aura entries. */
  auraSize?: string
}

/** The usage chip's label: "At-Will", "Enc", "2/Enc", "Daily", "Rch 5+", "Trait", "Aura 2". */
export function usageChipLabel(u: UsageInput): string {
  const usage = (u.usage ?? '').toLowerCase()
  if (usage === 'trait') return 'Trait'
  if (usage === 'aura') return u.auraSize ? `Aura ${u.auraSize}` : 'Aura'
  if (usage.startsWith('recharge') || u.rechargeValue) return rechargeLabel(u.rechargeValue, u.rechargeCondition)
  if (u.encounterUses && u.encounterUses > 1) return `${u.encounterUses}/Enc`
  if (usage === 'encounter') return 'Enc'
  if (usage === 'daily') return 'Daily'
  if (usage === 'at-will') return 'At-Will'
  if (usage === 'consumable') return 'Consumable'
  return usage ? usage.charAt(0).toUpperCase() + usage.slice(1) : ''
}

/** The chip while a power is spent: "USED", "1/2 Enc", "Rch 5+ · USED". */
export function usedChipLabel(u: UsageInput, timesUsed: number, maxUses: number): string {
  if (!timesUsed) return usageChipLabel(u)
  if (maxUses > 1 && timesUsed < maxUses) return `${timesUsed}/${maxUses} Enc`
  const usage = (u.usage ?? '').toLowerCase()
  return usage.startsWith('recharge') || u.rechargeValue ? `${rechargeLabel(u.rechargeValue, u.rechargeCondition)} · USED` : 'USED'
}

/** "minor: The zone persists." -> { action: 'Minor', text }: the sustain line's label names its action. */
export function sustainLine(sustain: string): { label: string; text: string } {
  const m = sustain.match(/^\s*(?:sustain\s+)?(standard|move|minor|free)\b\s*[:.]?\s*([\s\S]*)$/i)
  return m ? { label: `Sustain ${m[1]!.charAt(0).toUpperCase()}${m[1]!.slice(1).toLowerCase()}`, text: m[2]!.trim() } : { label: 'Sustain', text: sustain }
}

export interface CardLine {
  /** Bold label before the text ("Hit", "Sustain Minor", "Failed save 1"); empty for unlabelled text. */
  label: string
  text: string
  /** The entry field it came from, for click-to-apply highlighting. */
  field?: 'hit' | 'miss' | 'effect'
}

export interface CardLines {
  /** Lines in book order, in groups drawn with a small gap between them. */
  groups: CardLine[][]
  /** "Melee basic attack" / "Ranged basic attack" lines become a header marker. */
  basic?: 'melee' | 'ranged'
}

export interface LineInput {
  requirement?: string
  trigger?: string
  critical?: string
  hit?: string
  secondary?: string
  aftereffect?: string
  miss?: string
  effect?: string
  sustain?: string
  special?: string
  /** Extra labelled lines, one per line: "Failed save 1: ...", "secondary attack (hit): ...". */
  text?: string
  /** True for powers with an attack roll. */
  attack?: boolean
}

/** The order the book prints a power's lines in (labels as printed). */
export const POWER_LINE_ORDER = ['Requirement', 'Trigger', 'Effect (triggered)', 'Hit', 'Critical', 'Miss', 'Aftereffect', 'Failed saves', 'Secondary', 'Effect', 'Sustain', 'Special', 'Other lines'] as const

/**
 * A power's lines, grouped: the requirement; the trigger with its effect (a triggered power with no
 * attack); the attack's outcome (Hit, Critical, Miss, Aftereffect, failed saves); secondary attacks;
 * the effect; the sustain; Special; other printed lines.
 */
export function groupLines(e: LineInput): CardLines {
  const groups: CardLine[][] = []
  const push = (...lines: (CardLine | false | undefined | '')[]) => { const g = lines.filter((l): l is CardLine => !!l && !!l.text.trim()); if (g.length) groups.push(g) }
  const extra = (e.text ?? '').split('\n').map(s => s.trim()).filter(Boolean)
  let basic: CardLines['basic']
  const failedSaves: CardLine[] = [], secondary: CardLine[] = [], other: CardLine[] = []
  for (const line of extra) {
    const b = line.match(/^(?:(melee|ranged) basic|basic (melee|ranged)) attack$/i)
    if (b) { basic = (b[1] ?? b[2] ?? '').toLowerCase() as 'melee' | 'ranged'; continue }
    // The usage chip shows uses per encounter and round.
    if (/^uses per (encounter|round):/i.test(line)) continue
    const labelled = line.match(/^([^:]{1,40}):\s*([\s\S]*)$/)
    const entry: CardLine = labelled ? { label: cap(labelled[1]!), text: labelled[2]! } : { label: '', text: line }
    if (/^failed save/i.test(entry.label)) failedSaves.push(entry)
    else if (/^(secondary|tertiary) attack/i.test(entry.label) || /^(hit|miss|critical|aftereffect)$/i.test(entry.label) && secondary.length) secondary.push(entry)
    else other.push(entry)
  }
  const triggered = !!e.trigger && !e.attack
  push(e.requirement && { label: 'Requirement', text: e.requirement })
  push(e.trigger && { label: 'Trigger', text: e.trigger }, triggered && e.effect && { label: 'Effect', text: e.effect, field: 'effect' })
  push(e.hit && { label: 'Hit', text: e.hit, field: 'hit' }, e.critical && { label: 'Critical', text: e.critical },
    e.miss && { label: 'Miss', text: e.miss, field: 'miss' }, e.aftereffect && { label: 'Aftereffect', text: e.aftereffect }, ...failedSaves)
  push(e.secondary && { label: 'Secondary', text: e.secondary }, ...secondary)
  push(!triggered && e.effect && { label: 'Effect', text: e.effect, field: 'effect' })
  push(e.sustain && sustainLine(e.sustain))
  push(e.special && { label: 'Special', text: e.special })
  push(...other)
  return { groups, ...(basic ? { basic } : {}) }
}

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s

/** The text for a level from "Level 11: ..." steps: the highest step at or below the level. */
export function textAtLevel(steps: { level: number; text: string }[], level: number): { level: number; text: string } | undefined {
  return steps.filter(s => s.level <= level).sort((a, b) => b.level - a.level)[0]
}
