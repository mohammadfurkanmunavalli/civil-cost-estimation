import { FileText, Download, FileCheck } from 'lucide-react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import type { Project } from '@/types'
import { useProjectStore } from '@/store/projectStore'
import { DEFAULT_CURRENCY } from '@/lib/utils'
import { calculateCostSummary } from '@/lib/calculations'
import CostProposalPDF from '@/components/reports/CostProposalPDF'
import CostBreakdownPDF from '@/components/reports/CostBreakdownPDF'

interface Props { project: Project }

export default function ReportsTab({ project }: Props) {
  const { costItems, risks, financialSettings } = useProjectStore()
  const currency = financialSettings?.currency || DEFAULT_CURRENCY

  const summary = calculateCostSummary(
    costItems,
    financialSettings || { id: '', project_id: project.id, overhead_pct: 10, contingency_pct: 5, markup_pct: 15, tax_pct: 5, currency: DEFAULT_CURRENCY },
    risks
  )

  const reports = [
    {
      type: 'proposal' as const,
      title: 'Proposal Report',
      description: 'Client-facing proposal with project overview and grand total strictly mapped onto a professional view.',
      icon: <FileText size={24} className="text-accent" />,
      document: <CostProposalPDF project={project} summary={summary} currency={currency} />,
      fileName: `${project.name.replace(/\s+/g, '_')}_Proposal.pdf`
    },
    {
      type: 'breakdown' as const,
      title: 'Cost Breakdown Report',
      description: 'Detailed itemized table breakdown of all structured cost categories, metrics, and totals.',
      icon: <FileCheck size={24} className="text-success" />,
      document: <CostBreakdownPDF project={project} costItems={costItems} risks={risks} summary={summary} currency={currency} />,
      fileName: `${project.name.replace(/\s+/g, '_')}_Breakdown.pdf`
    },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Reports</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reports.map(report => (
          <div key={report.type} className="card hover:border-accent/30 transition-all">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/5 rounded-xl">{report.icon}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">{report.title}</h3>
                <p className="text-surface-muted text-sm mt-1">{report.description}</p>
                
                <PDFDownloadLink 
                  document={report.document} 
                  fileName={report.fileName}
                  className="inline-block mt-4"
                >
                  {/* @ts-ignore : react-pdf passes object natively */}
                  {({ loading }) => (
                    <button
                      disabled={loading}
                      className={`btn-outline btn-sm gap-1.5 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Download size={13} /> {loading ? 'Compiling PDF...' : 'Download PDF'}
                    </button>
                  )}
                </PDFDownloadLink>

              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
