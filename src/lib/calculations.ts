import type { CostItem, FinancialSettings, Risk } from '@/types'

export interface CostSummary {
  materialsCost: number
  laborCost: number
  equipmentCost: number
  additionalCost: number
  directCost: number
  overhead: number
  contingency: number
  subtotal: number
  markup: number
  tax: number
  subtotalBeforeTax: number
  totalPrice: number
  grandTotal: number
  riskContingency: number
}

export function calculateMaterialCost(item: Partial<CostItem>): number {
  return (item.quantity || 0) * (item.unit_price || 0)
}

export function calculateLaborCost(item: Partial<CostItem>): number {
  return (item.workers || 0) * (item.daily_rate || 0) * (item.days || 0)
}

export function calculateEquipmentCost(item: Partial<CostItem>): number {
  return (item.rental_cost || 0) + (item.maintenance || 0) + (item.fuel || 0)
}

export function calculateItemCost(item: Partial<CostItem>): number {
  switch (item.category) {
    case 'materials': return calculateMaterialCost(item)
    case 'labor': return calculateLaborCost(item)
    case 'equipment': return calculateEquipmentCost(item)
    case 'additional': return item.unit_price || 0
    default: return item.unit_price || 0
  }
}

export function calculateRiskContingency(risks: Risk[]): number {
  return risks.reduce((acc, risk) => {
    return acc + (risk.impact || 0) * ((risk.probability || 0) / 100)
  }, 0)
}

export function calculateCostSummary(
  items: Partial<CostItem>[],
  settings: FinancialSettings,
  risks: Risk[] = []
): CostSummary {
  const materialsCost = items
    .filter(i => i.category === 'materials')
    .reduce((acc, i) => acc + calculateMaterialCost(i), 0)

  const laborCost = items
    .filter(i => i.category === 'labor')
    .reduce((acc, i) => acc + calculateLaborCost(i), 0)

  const equipmentCost = items
    .filter(i => i.category === 'equipment')
    .reduce((acc, i) => acc + calculateEquipmentCost(i), 0)

  const additionalCost = items
    .filter(i => i.category === 'additional')
    .reduce((acc, i) => acc + (i.unit_price || 0), 0)

  const directCost = materialsCost + laborCost + equipmentCost + additionalCost

  const overhead = directCost * ((settings.overhead_pct || 0) / 100)
  const riskContingency = calculateRiskContingency(risks)
  const contingency = directCost * ((settings.contingency_pct || 0) / 100) + riskContingency
  const subtotal = directCost + overhead + contingency
  const markup = subtotal * ((settings.markup_pct || 0) / 100)
  const tax = (subtotal + markup) * ((settings.tax_pct || 0) / 100)
  const grandTotal = subtotal + markup + tax

  return {
    materialsCost,
    laborCost,
    equipmentCost,
    additionalCost,
    directCost,
    overhead,
    contingency,
    subtotal,
    markup,
    subtotalBeforeTax: subtotal + markup,
    tax,
    totalPrice: subtotal + markup + tax,
    grandTotal: subtotal + markup + tax,
    riskContingency,
  }
}

export function simulateScenario(
  summary: CostSummary,
  scenario: { category: string; percent: number }
): CostSummary {
  const factor = 1 + (scenario.percent / 100)
  const updated = { ...summary }

  switch (scenario.category) {
    case 'materials': updated.materialsCost *= factor; break
    case 'labor': updated.laborCost *= factor; break
    case 'equipment': updated.equipmentCost *= factor; break
    case 'all': {
      updated.materialsCost *= factor
      updated.laborCost *= factor
      updated.equipmentCost *= factor
      updated.additionalCost *= factor
      break
    }
  }

  updated.directCost = updated.materialsCost + updated.laborCost + updated.equipmentCost + updated.additionalCost
  // Recalculate derived values
  const tempSubtotal = updated.directCost * 1.2 // simplified
  updated.grandTotal = tempSubtotal * 1.15
  return updated
}
