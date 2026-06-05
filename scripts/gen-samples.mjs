// Generates realistic, Zenoti-shaped sample exports so the app can be exercised
// without real guest data. Output lands in ./sample-data (git-ignored).
//
//   npm run samples
//
// Produces: sales-accrual.xlsx, service-brookfield.xlsx, service-eastside.xlsx,
// employee-metrics-brookfield.csv, feedback.xlsx

import * as XLSX from 'xlsx'
import { mkdirSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'sample-data')
mkdirSync(OUT, { recursive: true })

// Seeded RNG for reproducible data.
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(42)
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const between = (lo, hi) => lo + rnd() * (hi - lo)
const money2 = (n) => Math.round(n * 100) / 100

const LOCATIONS = ['Brookfield', 'Downtown', 'East Side', 'Mequon', 'North Shore']
const FIRST = ['Olivia', 'Emma', 'Ava', 'Sophia', 'Isabella', 'Mia', 'Noah', 'Liam', 'Ethan', 'James', 'Grace', 'Chloe', 'Maya', 'Ruby', 'Nora']
const LAST = ['Smith', 'Johnson', 'Lee', 'Brown', 'Garcia', 'Martinez', 'Davis', 'Lopez', 'Wilson', 'Anderson', 'Taylor', 'Thomas']
const name = () => `${pick(FIRST)} ${pick(LAST)}`

function aoaToXlsx(aoa, sheetName, file) {
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  writeFileSync(join(OUT, file), buf)
  console.log('wrote', file, `(${aoa.length - 4} rows)`)
}

// ---------- Sales Accrual (Product) ----------
function genAccrual() {
  const subcats = ['Style', 'Conditioner', 'Shampoo', 'Bodycare', 'Skin Care', 'Ultraceuticals', 'Accessories', 'Hair Treatment']
  const vendors = ['AVEDA', 'Ultraceuticals', 'Bellami', 'Vital Body', 'Wella']
  const items = {
    Style: ['Air Control Hairspray', 'Texture Tonic', 'Control Paste'],
    Conditioner: ['Damage Remedy Conditioner', 'Nutriplenish Conditioner'],
    Shampoo: ['Shampure Shampoo', 'Rosemary Mint Wash'],
    Bodycare: ['Hand Relief Cream', 'Stress-Fix Body Lotion'],
    'Skin Care': ['Botanical Kinetics Toner', 'Tulasara Serum'],
    Ultraceuticals: ['Ultra B2 Serum', 'Ultra UV Protective SPF50'],
    Accessories: ['Paddle Brush', 'Wide Tooth Comb'],
    'Hair Treatment': ['Bond Repair Mask', 'Botanical Repair Mask']
  }
  const header = ['Sale Date', 'Invoice No', 'Client Code', 'Client Name', 'Center Code', 'Center Name', 'Item Code', 'Item Name', 'Qty', 'Sales (Exc. Tax)', 'Tax', 'Sales(Inc. Tax)', 'Redeemed', 'Collected', 'Due', 'Invoice Date', 'Invoice Closed Date', 'Item Subcategory', 'Invoice Notes', 'Invoice Source', 'Vendor Name', 'Brand Name']
  const aoa = [['Neroli Salon and Spa'], ['From : 01 May 2026 To : 31 May 2026'], [], header]

  let totalExc = 0
  for (let i = 0; i < 420; i++) {
    const loc = pick(LOCATIONS)
    const sub = pick(subcats)
    const item = pick(items[sub])
    const qty = Math.ceil(between(1, 3))
    const unit = money2(between(14, 78))
    const exc = money2(unit * qty)
    const tax = money2(exc * 0.05)
    const redeemed = rnd() < 0.12 ? money2(exc * between(0.3, 1)) : 0
    const collected = money2(exc + tax - redeemed)
    const due = rnd() < 0.05 ? money2(between(5, 40)) : 0
    const day = String(Math.ceil(between(1, 28))).padStart(2, '0')
    const date = `2026-05-${day}`
    totalExc += exc
    aoa.push([date, `INV${10000 + i}`, `C${1000 + Math.floor(rnd() * 800)}`, name(), loc.slice(0, 2).toUpperCase(), loc, `IT${200 + subcats.indexOf(sub)}${items[sub].indexOf(item)}`, item, qty, exc, tax, money2(exc + tax), redeemed, collected, due, date, date, rnd() < 0.5 ? sub.toLowerCase() : sub, '', pick(['Zenoti', 'Mobile App', 'Web']), pick(vendors), pick(vendors)])
  }
  // Trailing Total: summary row (must be excluded by the parser).
  aoa.push(['Total:', '', '', '', '', '', '', '', '', money2(totalExc), '', '', '', '', '', '', '', '', '', '', '', ''])
  aoaToXlsx(aoa, 'Sales-Accrual', 'sales-accrual.xlsx')
}

// ---------- Service Sales ----------
function genService(center, file, hasSpa) {
  const cats = hasSpa
    ? ['Hair Color', 'Haircut & Styling', 'Nails', 'Facials', 'Massage', 'Waxing', 'Makeup/Lashes/Brows']
    : ['Hair Color', 'Haircut & Styling', 'Nails', 'Waxing', 'Makeup/Lashes/Brows']
  const employees = [name(), name(), name(), name(), name(), name()]
  const header = ['Invoice No', 'ServiceName', 'Receipt No', 'Category', 'Sub Category', 'Booked Date', 'Sale Date', 'Guest', 'GuestCenter', 'EmployeeCode', 'Serviced By', 'Quantity', 'Room', 'Room Category', 'Promotion', 'Price', 'Discount', 'LoyaltyPoint Redemption', 'Membership Redemption', 'Membership Service Redemption', 'Prepaidcard Redemption', 'Cashback Redemption', 'Net Price', 'Tax', 'Price Paid', 'Sale Value', 'Package Redemption', 'Payment Type', 'CreatedBy', 'Status', 'Closed On', 'AppointmentSource', 'GuestCode', 'FirstVisit', 'Member', 'ClosedBy', 'BusinessUnit', 'Requested', 'PackageDiscount', 'MembershipDiscount']
  const aoa = [['Neroli Salon and Spa'], [`Center : ${center}`], ['From : 01 Jun 2026 To : 05 Jun 2026'], [], header]

  for (let i = 0; i < 130; i++) {
    const cat = pick(cats)
    const emp = pick(employees)
    const price = money2(between(45, 240))
    const discount = rnd() < 0.25 ? money2(price * between(0.1, 0.3)) : 0
    const sale = money2(price - discount)
    const open = rnd() < 0.06
    const day = String(Math.ceil(between(1, 5))).padStart(2, '0')
    const date = `2026-06-${day}`
    aoa.push([`SV${20000 + i}`, `${cat} Service`, `R${i}`, cat.replace('&', '&amp;'), cat, date, date, name(), center, `E${100 + employees.indexOf(emp)}`, emp, 1, '', '', rnd() < 0.2 ? pick(['Spring20', 'NewGuest', 'Loyalty10']) : '', price, discount, 0, 0, 0, 0, 0, sale, money2(sale * 0.05), open ? 0 : sale, sale, 0, pick(['Visa', 'Mastercard', 'Amex', 'Discover', 'Cash', 'Gift Card']), 'Front Desk', open ? 'Open' : 'Closed', open ? '' : date, pick(['Zenoti', 'Mobile App', 'Web', 'External']), `G${500 + i}`, rnd() < 0.3 ? 'Yes' : 'No', rnd() < 0.4 ? 'Yes' : 'No', 'Front Desk', center, rnd() < 0.45 ? 'Yes' : 'No', 0, 0])
  }
  aoaToXlsx(aoa, 'Sales Report', file)
}

// ---------- Employee Metrics ----------
function genMetrics() {
  const jobs = [
    ['Hair Designer', 6],
    ['Senior Hair Designer', 3],
    ['Esthetician', 3],
    ['Nail Designer', 3],
    ['Massage Therapist', 2],
    ['Aveda Advisor', 2],
    ['Team Leader', 1]
  ]
  const header = ['Code', 'EmpName', 'Job', 'Months Employed', '# Guests', 'Service Sales', 'Product Sales', 'Gift Card Sales', 'Membership Sales', 'Package Sales', 'Rebook %', 'Request %', '% Bought Products', 'Addon %', 'Online Booking %', 'New Guests', 'Campaign Redemptions', 'GoalRequestsPercent', 'GoalServiceSalesNumber']
  const rows = [header]
  let code = 100
  for (const [job, n] of jobs) {
    for (let i = 0; i < n; i++) {
      const inactive = rnd() < 0.08
      const guests = inactive ? 0 : Math.ceil(between(40, 220))
      const isProduct = job === 'Aveda Advisor' || job === 'Team Leader'
      const serviceSales = isProduct ? 0 : money2(between(6000, 28000))
      const productSales = money2(between(isProduct ? 4000 : 500, isProduct ? 16000 : 6000))
      rows.push([
        `EMP${code++}`,
        name(),
        job,
        Math.ceil(between(2, 60)),
        guests,
        serviceSales,
        productSales,
        money2(between(0, 2500)),
        money2(between(0, 3000)),
        money2(between(0, 2000)),
        money2(between(20, 75)),
        money2(between(15, 70)),
        money2(between(18, 65)),
        money2(between(10, 50)),
        money2(between(20, 80)),
        Math.floor(between(0, 25)),
        Math.floor(between(0, 12)),
        0,
        0
      ])
    }
  }
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rows))
  writeFileSync(join(OUT, 'employee-metrics-brookfield.csv'), csv)
  console.log('wrote employee-metrics-brookfield.csv', `(${rows.length - 1} employees)`)
}

// ---------- Feedback ----------
function genFeedback() {
  const tags = ['Quality of Service', 'Cleanliness', 'Ambiance', 'Check-in', 'Check-out']
  const cats = ['Hair Color', 'Haircut & Styling', 'Nails', 'Facials', 'Massage', 'Waxing']
  const good = ['Absolutely loved my visit!', 'Best service in town.', 'My stylist was amazing.', 'Relaxing and professional.', 'Will definitely be back.']
  const bad = ['Waited far too long past my appointment time.', 'The room felt unclean.', 'Service was rushed and impersonal.', 'Not what I asked for.', 'Front desk was disorganized at check-out.']
  const header = ['Center Name', 'Invoice No', 'Client Name', 'Sale Date', 'Rating', 'Client Comments', 'Tags', 'Appointment Status', 'Service Provider', 'Service', 'Category', 'Sub-Category', 'First Visit', 'Member', 'Source']
  const aoa = [['Neroli Salon and Spa'], ['From : 01 May 2026 To : 31 May 2026'], [], header]

  for (let i = 0; i < 240; i++) {
    const loc = pick(LOCATIONS)
    const roll = rnd()
    const rating = roll < 0.82 ? 5 : roll < 0.9 ? 4 : roll < 0.95 ? 3 : roll < 0.98 ? 2 : 1
    const cat = pick(cats)
    const low = rating <= 3
    const tagSet = []
    const tagCount = low ? Math.ceil(between(1, 3)) : Math.ceil(between(0, 2))
    for (let t = 0; t < tagCount; t++) tagSet.push(pick(tags))
    const day = String(Math.ceil(between(1, 28))).padStart(2, '0')
    aoa.push([loc, `INV${30000 + i}`, name(), `2026-05-${day}`, rating, rnd() < 0.85 ? (low ? pick(bad) : pick(good)) : '', [...new Set(tagSet)].join(', '), 'Closed', name(), `${cat} Service`, cat.replace('&', '&amp;'), cat, rnd() < 0.25 ? 'Yes' : 'No', rnd() < 0.4 ? 'Yes' : 'No', pick(['Email', 'SMS', 'App'])])
  }
  aoaToXlsx(aoa, 'Feedback', 'feedback.xlsx')
}

genAccrual()
genService('Brookfield', 'service-brookfield.xlsx', true)
genService('East Side', 'service-eastside.xlsx', false)
genMetrics()
genFeedback()
console.log('\nSample data ready in ./sample-data')
