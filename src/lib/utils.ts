import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const DEFAULT_CURRENCY = 'INR'

export function formatCurrency(amount: number, currency = DEFAULT_CURRENCY, locale = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch (error) {
    // If the Admin entered a custom string (e.g. 'Rupees') instead of an ISO code (e.g. 'INR')
    // Fallback gracefully without destroying the React rendering tree
    return `${currency} ${amount.toLocaleString(locale, { maximumFractionDigits: 0 })}`
  }
}

export function formatPdfCurrency(amount: number, currency = DEFAULT_CURRENCY, locale = 'en-US'): string {
  const formatted = formatCurrency(amount, currency, locale)
  // The built-in PDF Helvetica font does not support the '₹' glyph and renders it as '1' or '?'
  return formatted.replace('₹', 'Rs. ')
}

export function formatNumber(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(value)
}

export function formatDate(dateString: string, locale = 'en-US'): string {
  return new Date(dateString).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function generateShareToken(): string {
  const array = new Uint8Array(24)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

export async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export const PROJECT_TYPES = [
  'Residential', 'Commercial', 'Industrial', 'Infrastructure',
  'Renovation', 'Landscaping', 'Institutional', 'Mixed-Use'
]

export const SIZE_UNITS = ['Square Meters', 'Square Feet', 'Hectares', 'Acres']
export const DURATION_UNITS = ['Days', 'Weeks', 'Months', 'Years']
export const COST_CATEGORIES = ['materials', 'labor', 'equipment', 'additional'] as const
export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'EGP', 'YER', 'KWD', 'QAR']

export const CURRENCY_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, SAR: 3.75, AED: 3.67,
  EGP: 48.5, YER: 250, KWD: 0.31, QAR: 3.64, INR: 83.5
}

export function convertCurrency(amount: number, from: string, to: string): number {
  if (from === to) return amount
  const fromRate = CURRENCY_RATES[from] || 1
  const toRate = CURRENCY_RATES[to] || 1
  return (amount / fromRate) * toRate
}

type RateResult = {
  rate: number
  date: string
  source: 'Frankfurter' | 'fallback'
}

const rateCache = new Map<string, RateResult>()

export async function getCurrencyRate(from: string, to: string): Promise<RateResult> {
  if (from === to) {
    return { rate: 1, date: new Date().toISOString().slice(0, 10), source: 'fallback' }
  }

  const cacheKey = `${from}:${to}`
  const cached = rateCache.get(cacheKey)
  if (cached) return cached

  try {
    const response = await fetch(`https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(from)}&symbols=${encodeURIComponent(to)}`)
    if (!response.ok) throw new Error(`Exchange rate request failed: ${response.status}`)

    const data = await response.json() as { date?: string; rates?: Record<string, number> }
    const rate = data.rates?.[to]
    if (!rate || !Number.isFinite(rate)) throw new Error(`Missing ${from} to ${to} exchange rate`)

    const result: RateResult = {
      rate,
      date: data.date || new Date().toISOString().slice(0, 10),
      source: 'Frankfurter',
    }
    rateCache.set(cacheKey, result)
    return result
  } catch (error) {
    console.warn('Live currency conversion failed; using fallback rate.', error)
    const fallback: RateResult = {
      rate: convertCurrency(1, from, to),
      date: new Date().toISOString().slice(0, 10),
      source: 'fallback',
    }
    rateCache.set(cacheKey, fallback)
    return fallback
  }
}

export async function convertCurrencyLive(amount: number, from: string, to: string): Promise<number> {
  const { rate } = await getCurrencyRate(from, to)
  return amount * rate
}
