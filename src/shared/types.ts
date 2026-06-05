// Shared domain types used across the Electron main process and the React renderer.

export type Role = 'admin' | 'gm'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  locations: string[] // canonical location ids the user may view
  active: boolean
  locked: boolean
  lastLogin: string | null
  mustChangePassword: boolean
}

export interface AuthResult {
  ok: boolean
  user?: User
  error?: string
  /** Minutes remaining on a temporary lockout, when ok === false. */
  lockMinutes?: number
}

export type ReportType = 'accrual' | 'service' | 'metrics' | 'feedback'

export interface DateRange {
  from: string | null // ISO date
  to: string | null
}

export interface ParseError {
  code:
    | 'wrong-type'
    | 'wrong-structure'
    | 'empty'
    | 'parse-failure'
    | 'too-large'
  message: string
  expectedColumns?: string[]
}

export interface ParseResult<T> {
  ok: boolean
  type: ReportType
  error?: ParseError
  data?: T
}

// ------- Sales: Product (Accrual) -------

export interface AccrualRow {
  saleDate: string | null
  invoiceNo: string
  clientCode: string
  clientName: string
  centerCode: string
  locationId: string
  itemCode: string
  itemName: string
  qty: number
  salesExcTax: number
  tax: number
  salesIncTax: number
  redeemed: number
  collected: number
  due: number
  invoiceDate: string | null
  invoiceClosedDate: string | null
  subcategory: string // normalized, title-cased
  subcategoryRaw: string
  invoiceNotes: string
  invoiceSource: string
  vendor: string
  brand: string
}

export interface AccrualReport {
  type: 'accrual'
  dateRange: DateRange
  locationIds: string[]
  rows: AccrualRow[]
}

// ------- Sales: Service -------

export interface ServiceRow {
  invoiceNo: string
  serviceName: string
  receiptNo: string
  category: string
  subCategory: string
  bookedDate: string | null
  saleDate: string | null
  guest: string
  guestCenter: string
  employeeCode: string
  servicedBy: string
  quantity: number
  promotion: string
  price: number // list / gross
  discount: number
  netPrice: number
  tax: number
  pricePaid: number
  saleValue: number // actual sale value
  paymentType: string
  status: string // "Open" flagged separately
  appointmentSource: string
  guestCode: string
  firstVisit: boolean
  requested: boolean
}

export interface ServiceReport {
  type: 'service'
  dateRange: DateRange
  locationId: string
  rows: ServiceRow[]
}

// ------- Coaching: Employee Metrics -------

export type PerformanceTier = 'performing' | 'on-track' | 'coaching' | 'no-activity'

export interface EmployeeMetric {
  code: string
  name: string
  job: string
  monthsEmployed: number
  guests: number
  serviceRevenue: number
  productSales: number
  giftCardSales: number
  membershipSales: number
  packageSales: number
  totalRevenue: number
  rebookRate: number // 0..100
  requestRate: number // 0..100
  productAttachRate: number // % bought products, 0..100
  addonRate: number // 0..100
  onlineBookingRate: number // 0..100
  newGuests: number
  campaignRedemptions: number
  // Computed during scoring:
  score: number // 0..100 composite, peer-relative
  tier: PerformanceTier
  peerCount: number
  peerGroup: string // "{job} @ {location}"
  peerAverages: Record<string, number>
}

export interface MetricsReport {
  type: 'metrics'
  locationId: string
  employees: EmployeeMetric[] // scored, excludes no-activity
  inactive: EmployeeMetric[] // 0 guests
}

export interface EmployeeGoals {
  code: string
  serviceRevenueGoal: number | null
  productSalesGoal: number | null
  rebookGoal: number | null
  requestGoal: number | null
  addonGoal: number | null
}

// ------- Reviews: Feedback -------

export interface ReviewRow {
  locationId: string
  centerName: string
  invoiceNo: string
  clientName: string
  saleDate: string | null
  rating: number // 1..5
  comments: string
  tags: string[]
  appointmentStatus: string
  serviceProvider: string
  service: string
  category: string
  subCategory: string
  firstVisit: boolean
  member: boolean
  source: string
}

export interface FeedbackReport {
  type: 'feedback'
  dateRange: DateRange
  locationIds: string[]
  rows: ReviewRow[]
}

// ------- Upload envelope -------

export interface UploadedReport {
  id: string
  type: ReportType
  label: string
  locationIds: string[]
  dateRange: DateRange
  uploadedAt: string
  fileName: string
}

// Settings / preferences
export interface AppPreferences {
  defaultLocationView: string | null
  dateFormat: 'us' | 'iso'
  theme: 'light'
}

export interface AboutInfo {
  version: string
  lastUpdateCheck: string | null
  releaseNotes: { version: string; notes: string }[]
}
