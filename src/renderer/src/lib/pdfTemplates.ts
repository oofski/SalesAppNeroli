// HTML templates for PDF exports (§8.2). The renderer composes these with live data
// and hands the HTML to the main process, which converts it via Electron printToPDF.

import type { EmployeeMetric, ReviewRow } from '@shared/types'
import { money, percent, formatDate, rating } from './format'
import { locationName } from '@shared/locations'
import { generateCoachingTip, TIER_LABEL } from './insights'

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
}

const SPRIG = `<svg width="22" height="22" viewBox="0 0 32 32" fill="none"><path d="M16 28C16 28 6 22 6 13.5C6 8.8 9.6 5 16 5C22.4 5 26 8.8 26 13.5C26 22 16 28 16 28Z" stroke="#2C3E35" stroke-width="1.6"/><path d="M16 27V11" stroke="#2C3E35" stroke-width="1.6"/><circle cx="16" cy="8.5" r="1.6" fill="#8B7355"/></svg>`

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1A1A1A; font-size: 12px; }
  .page { padding: 4px 2px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #2C3E35; padding-bottom: 14px; margin-bottom: 18px; }
  .brand { display: flex; align-items: center; gap: 8px; }
  .brand .name { font-weight: 600; letter-spacing: 0.16em; font-size: 14px; color: #2C3E35; }
  .brand .sub { font-size: 8px; letter-spacing: 0.2em; text-transform: uppercase; color: #6B6864; }
  .meta { text-align: right; font-size: 10px; color: #6B6864; line-height: 1.5; }
  .meta .title { font-size: 16px; font-weight: 600; color: #2C3E35; }
  h2 { font-size: 13px; color: #2C3E35; margin: 18px 0 10px; }
  .grid { display: grid; gap: 10px; }
  .kpis { grid-template-columns: repeat(3, 1fr); }
  .kpi { border: 1px solid #D4CFC8; border-radius: 10px; padding: 12px 14px; }
  .kpi .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #6B6864; }
  .kpi .value { font-size: 18px; font-weight: 600; color: #2C3E35; margin-top: 4px; }
  .kpi .variance { font-size: 10px; margin-top: 2px; }
  .pos { color: #3A7A4A; } .neg { color: #C0392B; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #2C3E35; color: #fff; text-transform: uppercase; font-size: 9px; letter-spacing: 0.04em; text-align: left; padding: 7px 9px; }
  td { padding: 7px 9px; border-bottom: 1px solid #E8EDE6; }
  tr:nth-child(even) td { background: #F5F4F2; }
  .right { text-align: right; }
  .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 7px; }
  .bar-label { width: 130px; font-size: 11px; }
  .bar-track { flex: 1; height: 9px; background: #E8EDE6; border-radius: 5px; overflow: hidden; }
  .bar-fill { height: 100%; background: #4A6741; border-radius: 5px; }
  .bar-val { width: 90px; text-align: right; font-size: 10px; color: #6B6864; }
  .tier { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 10px; text-transform: uppercase; font-weight: 600; }
  .tier.performing { background: #E8F5E9; color: #3A7A4A; }
  .tier.on-track { background: #FFF8E1; color: #B8871A; }
  .tier.coaching { background: #FDECEA; color: #C0392B; }
  .footer { margin-top: 22px; padding-top: 10px; border-top: 1px solid #D4CFC8; font-size: 9px; color: #6B6864; display: flex; justify-content: space-between; }
  .card { border: 1px solid #D4CFC8; border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; page-break-inside: avoid; }
  .review-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .rating-badge { font-weight: 700; padding: 3px 9px; border-radius: 6px; color: #fff; font-size: 11px; }
  .pill { display: inline-block; background: #E8EDE6; color: #4A6741; padding: 2px 8px; border-radius: 10px; font-size: 9px; margin-right: 4px; }
  .note-box { border: 1px dashed #D4CFC8; border-radius: 8px; padding: 10px 12px; min-height: 46px; color: #6B6864; font-size: 10px; }
`

function shell(title: string, sub: string, body: string, footerRight: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body><div class="page">
    <div class="header">
      <div class="brand">${SPRIG}<div><div class="name">NEROLI</div><div class="sub">Salon &amp; Spa</div></div></div>
      <div class="meta"><div class="title">${esc(title)}</div><div>${esc(sub)}</div></div>
    </div>
    ${body}
    <div class="footer"><span>Confidential — Internal Use Only</span><span>${footerRight}</span></div>
  </div></body></html>`
}

function barRow(label: string, value: number, max: number, fmt: (n: number) => string): string {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return `<div class="bar-row"><div class="bar-label">${esc(label)}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><div class="bar-val">${fmt(value)}</div></div>`
}

// ---- Coaching Guide (§8.2) ----
export function coachingGuideHtml(
  emp: EmployeeMetric,
  meta: { location: string; period: string },
  goals: Record<string, number | null>,
  notes: string
): string {
  const tip = generateCoachingTip(emp)
  const avg = emp.peerAverages ?? {}
  const kpi = (label: string, value: string, variance?: string, pos?: boolean): string =>
    `<div class="kpi"><div class="label">${label}</div><div class="value">${value}</div>${
      variance ? `<div class="variance ${pos ? 'pos' : 'neg'}">${variance}</div>` : ''
    }</div>`

  const varianceLine = (actual: number, goal: number | null, fmt: (n: number) => string): string | undefined => {
    if (goal == null) return undefined
    const diff = actual - goal
    return `${diff >= 0 ? '+' : ''}${fmt(diff)} vs goal`
  }

  const revMax = Math.max(emp.serviceRevenue, emp.productSales, emp.giftCardSales, avg.serviceRevenue ?? 0, 1)
  const behaviorMax = 100

  const body = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px;">
      <div style="width:52px;height:52px;border-radius:50%;background:#2C3E35;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:600;">${Math.round(emp.score)}</div>
      <div><div style="font-size:18px;font-weight:600;color:#2C3E35;">${esc(emp.name)}</div>
      <div style="color:#6B6864;font-size:11px;">${esc(emp.job)} · ${esc(meta.location)} · ${emp.monthsEmployed} mo employed</div></div>
      <div style="margin-left:auto;"><span class="tier ${emp.tier}">${TIER_LABEL[emp.tier]}</span></div>
    </div>
    <div style="color:#6B6864;font-size:10px;margin-bottom:14px;">Ranked vs. ${emp.peerCount} ${esc(emp.job)}${emp.peerCount === 1 ? '' : 's'} at ${esc(meta.location)}</div>

    <h2>Performance Summary</h2>
    <div class="grid kpis">
      ${kpi('Service Revenue', money(emp.serviceRevenue), varianceLine(emp.serviceRevenue, goals.serviceRevenueGoal ?? null, money), emp.serviceRevenue >= (goals.serviceRevenueGoal ?? 0))}
      ${kpi('Product Sales', money(emp.productSales), varianceLine(emp.productSales, goals.productSalesGoal ?? null, money), emp.productSales >= (goals.productSalesGoal ?? 0))}
      ${kpi('Total Revenue', money(emp.totalRevenue))}
      ${kpi('Rebook Rate', percent(emp.rebookRate), varianceLine(emp.rebookRate, goals.rebookGoal ?? null, (n) => percent(n)), emp.rebookRate >= (goals.rebookGoal ?? 0))}
      ${kpi('Request Rate', percent(emp.requestRate), varianceLine(emp.requestRate, goals.requestGoal ?? null, (n) => percent(n)), emp.requestRate >= (goals.requestGoal ?? 0))}
      ${kpi('Product Attach', percent(emp.productAttachRate))}
    </div>

    <h2>Revenue vs Peer Group</h2>
    ${barRow('Service Revenue', emp.serviceRevenue, revMax, money)}
    ${barRow('Product Sales', emp.productSales, revMax, money)}
    ${barRow('Gift Cards', emp.giftCardSales, revMax, money)}

    <h2>Behavioral Metrics</h2>
    ${barRow('Rebook %', emp.rebookRate, behaviorMax, (n) => percent(n))}
    ${barRow('Request %', emp.requestRate, behaviorMax, (n) => percent(n))}
    ${barRow('Product Attach %', emp.productAttachRate, behaviorMax, (n) => percent(n))}
    ${barRow('Add-on %', emp.addonRate, behaviorMax, (n) => percent(n))}

    <h2>Coaching Notes</h2>
    <p style="font-size:11px;margin-bottom:6px;">${esc(tip.headline)}</p>
    ${tip.points.length ? `<ul style="margin:0 0 10px 16px;font-size:11px;color:#1A1A1A;">${tip.points.map((p) => `<li style="margin-bottom:3px;">${esc(p)}</li>`).join('')}</ul>` : ''}
    <div class="note-box">${notes ? esc(notes) : 'Manager notes: __________________________________________________'}</div>
  `
  return shell('Coaching Guide', `${meta.location} · ${meta.period}`, body, `Generated ${formatDate(new Date().toISOString().slice(0, 10))}`)
}

// ---- Sales Summary (§8.2) ----
export function salesSummaryHtml(
  meta: { location: string; period: string },
  kpis: { label: string; value: string }[],
  categories: { label: string; revenue: number }[],
  topProducts: { itemName: string; subcategory: string; units: number; revenue: number }[]
): string {
  const max = Math.max(1, ...categories.map((c) => c.revenue))
  const body = `
    <div class="grid kpis">${kpis.map((k) => `<div class="kpi"><div class="label">${esc(k.label)}</div><div class="value">${esc(k.value)}</div></div>`).join('')}</div>
    <h2>Revenue by Category</h2>
    ${categories.slice(0, 10).map((c) => barRow(c.label, c.revenue, max, money)).join('')}
    <h2>Top 10 Products</h2>
    <table><thead><tr><th>#</th><th>Item</th><th>Category</th><th class="right">Units</th><th class="right">Revenue</th></tr></thead><tbody>
      ${topProducts.slice(0, 10).map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.itemName)}</td><td>${esc(p.subcategory)}</td><td class="right">${p.units}</td><td class="right">${money(p.revenue)}</td></tr>`).join('')}
    </tbody></table>
  `
  return shell('Sales Summary', `${meta.location} · ${meta.period}`, body, 'Source: Zenoti')
}

// ---- Low-Rating Reviews (§8.2) ----
const RATING_COLOR: Record<number, string> = { 1: '#C0392B', 2: '#E67E22', 3: '#B8871A' }
export function lowRatingHtml(meta: { location: string; period: string }, reviews: ReviewRow[]): string {
  const body = `
    <p style="color:#6B6864;font-size:11px;margin-bottom:14px;">${reviews.length} review${reviews.length === 1 ? '' : 's'} rated 1–3 stars. Each is an action item.</p>
    ${reviews
      .map(
        (r) => `<div class="card">
        <div class="review-head">
          <span class="rating-badge" style="background:${RATING_COLOR[r.rating] ?? '#B8871A'};">${r.rating}★</span>
          <strong>${esc(r.serviceProvider || 'Unknown')}</strong>
          <span style="color:#6B6864;">${esc(r.service)}</span>
          <span style="margin-left:auto;color:#6B6864;font-size:10px;">${esc(locationName(r.locationId))} · ${formatDate(r.saleDate)}${r.firstVisit ? ' · First Visit' : ''}</span>
        </div>
        <div style="font-size:11px;margin:4px 0 8px;">${esc(r.comments || 'No comment provided')}</div>
        <div>${r.tags.map((t) => `<span class="pill">${esc(t)}</span>`).join('')}</div>
      </div>`
      )
      .join('')}
  `
  return shell('Low-Rating Reviews', `${meta.location} · ${meta.period} · ${reviews.length} flagged`, body, 'Source: Zenoti Feedback')
}

// ---- Star Performers (§8.2) ----
export function starPerformersHtml(
  meta: { location: string; period: string },
  leaders: { name: string; role: string; fiveStar: number; total: number; avg: number }[]
): string {
  const body = `
    <p style="color:#6B6864;font-size:11px;margin-bottom:14px;">Recognizing the team members who delighted the most guests this period.</p>
    <table><thead><tr><th>#</th><th>Team Member</th><th>Role</th><th class="right">5★ Reviews</th><th class="right">Total</th><th class="right">Avg</th></tr></thead><tbody>
      ${leaders.map((e, i) => `<tr><td>${i + 1}</td><td>${esc(e.name)}</td><td>${esc(e.role)}</td><td class="right">${e.fiveStar}</td><td class="right">${e.total}</td><td class="right">${rating(e.avg)} ★</td></tr>`).join('')}
    </tbody></table>
  `
  return shell('Star Performers', `${meta.location} · ${meta.period}`, body, 'Share with your team')
}
