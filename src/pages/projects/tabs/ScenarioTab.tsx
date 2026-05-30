import { useState } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { calculateCostSummary, simulateScenario } from '@/lib/calculations'
import { DEFAULT_CURRENCY, formatCurrency } from '@/lib/utils'
import { Play, RefreshCw } from 'lucide-react'

interface Props { projectId: string }

const SCENARIOS = [
  { label: 'Materials price increase', category: 'materials' },
  { label: 'Labor cost increase', category: 'labor' },
  { label: 'Equipment cost increase', category: 'equipment' },
  { label: 'All costs increase', category: 'all' },
]

export default function ScenarioTab({ projectId }: Props) {
  const { costItems, risks, financialSettings } = useProjectStore()
  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0])
  const [percent, setPercent] = useState(10)
  const [simResult, setSimResult] = useState<ReturnType<typeof simulateScenario> | null>(null)
  const [simulating, setSimulating] = useState(false)

  const currency = financialSettings?.currency || DEFAULT_CURRENCY
  const baseSummary = calculateCostSummary(
    costItems,
    financialSettings || { id: '', project_id: projectId, overhead_pct: 10, contingency_pct: 5, markup_pct: 15, tax_pct: 5, currency: DEFAULT_CURRENCY },
    risks
  )

  const runSimulation = async () => {
    setSimulating(true)
    await new Promise(r => setTimeout(r, 500)) // Simulate async
    const result = simulateScenario(baseSummary, { category: selectedScenario.category, percent })
    setSimResult(result)
    setSimulating(false)
  }

  const deltaPercent = simResult
    ? ((simResult.grandTotal - baseSummary.grandTotal) / baseSummary.grandTotal) * 100
    : 0

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Scenario Analysis</h2>
        <p className="text-surface-muted text-sm mb-6">
          Simulate the impact of cost changes on the project's grand total.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Scenario selector */}
          <div>
            <label className="label">Scenario Type</label>
            <div className="space-y-2">
              {SCENARIOS.map(s => (
                <label key={s.category} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-surface-border hover:border-accent/30 transition-colors">
                  <input
                    type="radio"
                    name="scenario"
                    checked={selectedScenario.category === s.category}
                    onChange={() => { setSelectedScenario(s); setSimResult(null) }}
                    className="accent-accent"
                  />
                  <span className="text-sm text-white">{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Percent input */}
          <div>
            <label className="label">Percentage Change: <span className="text-accent">+{percent}%</span></label>
            <input
              type="range"
              min="1"
              max="100"
              value={percent}
              onChange={e => { setPercent(Number(e.target.value)); setSimResult(null) }}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-xs text-surface-muted mt-1">
              <span>1%</span><span>50%</span><span>100%</span>
            </div>
            <input
              type="number"
              value={percent}
              min="1"
              max="100"
              onChange={e => setPercent(Number(e.target.value))}
              className="input mt-3 w-24"
            />
          </div>
        </div>

        <button
          onClick={runSimulation}
          disabled={simulating}
          className="btn-primary mt-6"
        >
          {simulating ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
          {simulating ? 'Simulating...' : 'Run Simulation'}
        </button>
      </div>

      {/* Results */}
      {simResult && (
        <div className="card animate-in">
          <h3 className="font-semibold text-white mb-4">Simulation Results</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="stat-card">
              <p className="stat-label">Original Grand Total</p>
              <p className="stat-value">{formatCurrency(baseSummary.grandTotal, currency)}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Simulated Grand Total</p>
              <p className="text-2xl font-bold text-warning">{formatCurrency(simResult.grandTotal, currency)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
            <div className="text-warning text-2xl font-bold">+{deltaPercent.toFixed(1)}%</div>
            <div>
              <p className="text-white text-sm font-medium">Cost Increase</p>
              <p className="text-surface-muted text-xs">
                Additional {formatCurrency(simResult.grandTotal - baseSummary.grandTotal, currency)} due to {selectedScenario.label.toLowerCase()} of {percent}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
