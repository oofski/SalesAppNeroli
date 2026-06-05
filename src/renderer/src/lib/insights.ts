import type { EmployeeMetric, PerformanceTier } from '@shared/types'
import { money, percent } from './format'

export const TIER_LABEL: Record<PerformanceTier, string> = {
  performing: 'Performing Well',
  'on-track': 'On Track',
  coaching: 'Needs Coaching',
  'no-activity': 'No Activity'
}

export const TIER_BADGE: Record<PerformanceTier, 'green' | 'amber' | 'red' | 'neutral'> = {
  performing: 'green',
  'on-track': 'amber',
  coaching: 'red',
  'no-activity': 'neutral'
}

interface BehavioralMetric {
  key: keyof EmployeeMetric
  label: string
}

const BEHAVIORAL: BehavioralMetric[] = [
  { key: 'rebookRate', label: 'Rebook rate' },
  { key: 'requestRate', label: 'Request rate' },
  { key: 'productAttachRate', label: 'Product attach' },
  { key: 'addonRate', label: 'Add-on rate' }
]

export interface CoachingTip {
  headline: string
  points: string[]
}

/** Auto-generated coaching tip from the employee's data pattern (§6.3). */
export function generateCoachingTip(emp: EmployeeMetric): CoachingTip {
  const avg = emp.peerAverages ?? {}
  const gaps = BEHAVIORAL.map((m) => ({
    ...m,
    value: emp[m.key] as number,
    peer: avg[m.key] ?? 0,
    delta: (emp[m.key] as number) - (avg[m.key] ?? 0)
  })).sort((a, b) => a.delta - b.delta)

  const job = emp.job
  const strongest = [...gaps].sort((a, b) => b.delta - a.delta)[0]
  const weakest = gaps[0]

  if (emp.tier === 'performing') {
    const headline =
      strongest && strongest.delta > 0
        ? `Top performer in ${strongest.label.toLowerCase()} among ${job}s — ${percent(strongest.value)} vs a ${percent(strongest.peer)} peer average.`
        : `Strong all-round performer among ${job}s this period.`
    return { headline, points: ['Recognize in your next team huddle.', 'Consider for peer mentorship of newer team members.'] }
  }

  if (emp.tier === 'on-track') {
    if (weakest && weakest.delta < 0) {
      return {
        headline: `${weakest.label} at ${percent(weakest.value)} — slightly below the ${percent(weakest.peer)} peer average. This is the highest-leverage area to work on.`,
        points: []
      }
    }
    return { headline: `Solid, consistent performance. Keep reinforcing current habits.`, points: [] }
  }

  if (emp.tier === 'coaching') {
    const points: string[] = []
    for (const g of gaps) {
      if (g.delta < -1 && points.length < 3) {
        points.push(
          `${g.label} is ${percent(g.value)} vs a ${percent(g.peer)} peer average (${percent(Math.abs(g.delta))} gap).`
        )
      }
    }
    if (emp.serviceRevenue < (avg.serviceRevenue ?? 0) && points.length < 3) {
      points.push(
        `Service revenue of ${money(emp.serviceRevenue)} trails the ${money(avg.serviceRevenue ?? 0)} peer average.`
      )
    }
    if (!points.length) points.push('Below peer group on the weighted composite — review the bars below together.')
    return {
      headline: `Bottom tier among ${job}s at this location — prioritize for a 1:1 this week.`,
      points: points.slice(0, 3)
    }
  }

  return { headline: 'No guest activity recorded for this period.', points: [] }
}

export function scoreColor(tier: PerformanceTier): string {
  switch (tier) {
    case 'performing':
      return '#3A7A4A'
    case 'on-track':
      return '#B8871A'
    case 'coaching':
      return '#C0392B'
    default:
      return '#6B6864'
  }
}
