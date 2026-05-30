import ReactECharts from 'echarts-for-react'
import { useProjectStore } from '@/store/projectStore'
import { calculateCostSummary } from '@/lib/calculations'
import { DEFAULT_CURRENCY, formatCurrency } from '@/lib/utils'

interface Props { projectId: string }

export default function AnalyticsProjectTab({ projectId }: Props) {
  const { costItems, risks, financialSettings } = useProjectStore()
  const currency = financialSettings?.currency || DEFAULT_CURRENCY
  
  let currencySymbol = '$'
  try {
    currencySymbol = new Intl.NumberFormat('en-US', { style: 'currency', currency }).formatToParts(0).find(p => p.type === 'currency')?.value || '$'
  } catch (e) {
    currencySymbol = currency // Fallback if custom text was used instead of ISO string
  }

  const summary = calculateCostSummary(
    costItems,
    financialSettings || { id: '', project_id: projectId, overhead_pct: 10, contingency_pct: 5, markup_pct: 15, tax_pct: 5, currency: DEFAULT_CURRENCY },
    risks
  )

  const pieData = [
    { value: summary.materialsCost, name: 'Materials' },
    { value: summary.laborCost, name: 'Labor' },
    { value: summary.equipmentCost, name: 'Equipment' },
    { value: summary.additionalCost, name: 'Additional' },
  ].filter(d => d.value > 0)

  const barData = {
    categories: ['Materials', 'Labor', 'Equipment', 'Additional', 'Overhead', 'Contingency', 'Markup', 'Tax'],
    values: [
      summary.materialsCost, summary.laborCost, summary.equipmentCost,
      summary.additionalCost, summary.overhead, summary.contingency, summary.markup, summary.tax
    ]
  }

  const pieOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (p: { name: string; value: number; percent: number }) =>
        `${p.name}: ${formatCurrency(p.value, currency)} (${p.percent}%)`
    },
    legend: { orient: 'vertical', left: 'left', textStyle: { color: '#94a3b8' } },
    series: [{
      name: 'Cost Distribution',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      data: pieData,
      label: { show: true, color: '#94a3b8', fontSize: 11 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
    }],
    color: ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'],
  }

  const barOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (p: { name: string; value: number }[]) =>
        p[0].name + ': ' + formatCurrency(p[0].value, currency)
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: barData.categories,
      axisLabel: {
        color: '#94a3b8',
        fontSize: 11,
        interval: 0,
        hideOverlap: false,
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#94a3b8',
        formatter: (v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}K`
      }
    },
    series: [{
      type: 'bar',
      data: barData.values,
      itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
      emphasis: { itemStyle: { color: '#60a5fa' } },
    }],
  }

  const hasData = summary.directCost > 0

  return (
    <div className="space-y-6">
      {!hasData ? (
        <div className="card text-center py-12 text-surface-muted">
          <p className="text-sm">Add cost items to see analytics.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Direct Cost', value: summary.directCost },
              { label: 'Markup Applied', value: summary.markup },
              { label: 'Tax Amount', value: summary.tax },
              { label: 'Grand Total', value: summary.grandTotal },
            ].map(({ label, value }) => (
              <div key={label} className="stat-card">
                <p className="stat-label">{label}</p>
                <p className="stat-value text-xl">{formatCurrency(value, currency)}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-white mb-4">Cost Distribution</h3>
              <ReactECharts option={pieOption} style={{ height: 280 }} theme="dark" />
            </div>
            <div className="card">
              <h3 className="font-semibold text-white mb-4">Cost Breakdown</h3>
              <ReactECharts option={barOption} style={{ height: 280 }} theme="dark" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
