/**
 * Helpers for reading unvalidated model output.
 *
 * Everything here assumes a field may be missing, or may be a string where a
 * number was asked for. `toNumber` mirrors `to_number()` in
 * backend/app/agents/base.py and the two must stay in step: when this parsed a
 * figure the server could not, the client reached a different verdict from the
 * server on identical data and rendered a green tick over an overage.
 */

import {
  Bed,
  Camera,
  Ticket,
  UtensilsCrossed,
  Plane,
  MapPin,
  type LucideIcon,
} from 'lucide-react'

import type { ActivityCategory, BudgetAssessment } from '@/types/api'

/** Coerce a model-supplied number that may be "£1,200" or 1200 or missing. */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null

  // Strip currency symbols, spaces and thousands separators.
  const cleaned = value.replace(/[^0-9.-]/g, '')
  if (!cleaned) return null

  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£',
  EUR: '€',
  USD: '$',
  INR: '₹',
  JPY: '¥',
}

export function formatMoney(value: unknown, currency = ''): string {
  const amount = toNumber(value)
  if (amount === null) return typeof value === 'string' && value ? value : '—'

  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()]
  const rendered = amount.toLocaleString(undefined, { maximumFractionDigits: 0 })

  return symbol ? `${symbol}${rendered}` : `${currency} ${rendered}`.trim()
}

// ------------------------------------------------------------- categories

const CATEGORIES: ActivityCategory[] = [
  'transport',
  'food',
  'sightseeing',
  'accommodation',
  'activity',
  'other',
]

export function normaliseCategory(value: unknown): ActivityCategory {
  const candidate = String(value ?? '').toLowerCase().trim()
  return (CATEGORIES as string[]).includes(candidate)
    ? (candidate as ActivityCategory)
    : 'other'
}

/**
 * Category to colour + icon. `text`/`bg` reference the tokens defined in
 * index.css, so light and dark are handled by the theme rather than here.
 */
export const CATEGORY_STYLE: Record<
  ActivityCategory,
  { label: string; icon: LucideIcon; text: string; bg: string; dot: string }
> = {
  transport: {
    label: 'Transport',
    icon: Plane,
    text: 'text-transport',
    bg: 'bg-transport/10',
    dot: 'bg-transport',
  },
  food: {
    label: 'Food',
    icon: UtensilsCrossed,
    text: 'text-food',
    bg: 'bg-food/10',
    dot: 'bg-food',
  },
  sightseeing: {
    label: 'Sightseeing',
    icon: Camera,
    text: 'text-sightseeing',
    bg: 'bg-sightseeing/10',
    dot: 'bg-sightseeing',
  },
  accommodation: {
    label: 'Stay',
    icon: Bed,
    text: 'text-accommodation',
    bg: 'bg-accommodation/10',
    dot: 'bg-accommodation',
  },
  activity: {
    label: 'Activity',
    icon: Ticket,
    text: 'text-activity',
    bg: 'bg-activity/10',
    dot: 'bg-activity',
  },
  other: {
    label: 'Other',
    icon: MapPin,
    text: 'text-muted-foreground',
    bg: 'bg-muted',
    dot: 'bg-muted-foreground',
  },
}

/** Budget lines use their own free-text categories; map them onto the palette. */
export function budgetLineCategory(category: unknown): ActivityCategory {
  const value = String(category ?? '').toLowerCase()
  if (value.includes('flight') || value.includes('transport')) return 'transport'
  if (value.includes('food') || value.includes('dining')) return 'food'
  if (value.includes('accommod') || value.includes('hotel')) return 'accommodation'
  if (value.includes('activit') || value.includes('attraction')) return 'activity'
  if (value.includes('sight')) return 'sightseeing'
  return 'other'
}

// ----------------------------------------------------------------- budget

/** Three states, so "we could not check" cannot be mistaken for "it is fine". */
export type BudgetVerdict = 'within' | 'over' | 'unverified'

export interface BudgetSummary {
  currency: string
  total: number | null
  budget: number | null
  verdict: BudgetVerdict
  /** Positive when over budget, else null. */
  overage: number | null
  /** Positive when under budget, else null. */
  headroom: number | null
  /** How far over, as a percentage of the budget. */
  overagePercent: number | null
  /** total/budget as a percentage, uncapped so an overage is visible. */
  usedPercent: number | null
}

export function summariseBudget(assessment: BudgetAssessment): BudgetSummary {
  const total = toNumber(assessment.estimated_total)
  const budget = toNumber(assessment.budget_amount)
  const difference = total !== null && budget !== null ? budget - total : null

  // Derive the verdict from the numbers whenever we have them. Deferring to the
  // flag was how a green tick ended up rendered above two numbers that plainly
  // contradicted it. The flag is only consulted when there is nothing to compare.
  let verdict: BudgetVerdict
  if (difference !== null) {
    verdict = difference >= 0 ? 'within' : 'over'
  } else if (assessment.within_budget === true) {
    verdict = 'within'
  } else if (assessment.within_budget === false) {
    verdict = 'over'
  } else {
    // Missing, null, or a non-boolean. Never assume this means fine.
    verdict = 'unverified'
  }

  return {
    currency: assessment.currency ?? '',
    total,
    budget,
    verdict,
    overage: difference !== null && difference < 0 ? Math.abs(difference) : null,
    headroom: difference !== null && difference >= 0 ? difference : null,
    overagePercent:
      difference !== null && difference < 0 && budget !== null && budget > 0
        ? Math.round((Math.abs(difference) / budget) * 100)
        : null,
    usedPercent:
      total !== null && budget !== null && budget > 0
        ? Math.round((total / budget) * 100)
        : null,
  }
}

// ------------------------------------------------------------------- hero

/**
 * A stable hue from the destination name, so the same trip always gets the same
 * banner. Cheap alternative to fetching a photo — it can't 404 and it can't show
 * a picture of the wrong city.
 */
export function hueFromText(text: string): number {
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash) % 360
}
