import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { CostItem, Project, Risk } from '@/types'
import { formatPdfCurrency } from '@/lib/utils'
import { calculateItemCost } from '@/lib/calculations'

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  header: { marginBottom: 20, textAlign: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#64748B' },
  
  sectionTitle: { fontSize: 12, fontWeight: 'bold', backgroundColor: '#F1F5F9', padding: 6, marginTop: 15, marginBottom: 5 },
  
  table: { width: 'auto', borderStyle: 'solid', borderWidth: 1, borderColor: '#E2E8F0', borderRightWidth: 0, borderBottomWidth: 0 },
  tableRow: { margin: 'auto', flexDirection: 'row' },
  tableHeaderRow: { margin: 'auto', flexDirection: 'row', backgroundColor: '#F8FAFC', fontWeight: 'bold' },
  tableCol: { width: '20%', borderStyle: 'solid', borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 0, borderTopWidth: 0 },
  tableColLarge: { width: '40%', borderStyle: 'solid', borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 0, borderTopWidth: 0 },
  tableCell: { margin: 5, fontSize: 9 },

  summaryBox: { marginTop: 20, marginLeft: '50%', backgroundColor: '#F8FAFC', padding: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryLabel: { color: '#475569' },
  summaryValue: { fontWeight: 'bold' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: '#2563EB', paddingTop: 6, marginTop: 4 },
  grandTotalLabel: { fontWeight: 'bold', color: '#1E3A8A', fontSize: 12 },
  grandTotalValue: { fontWeight: 'bold', color: '#1D4ED8', fontSize: 12 },

  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, textAlign: 'center', color: '#94A3B8', fontSize: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8 }
})

interface Props {
  project: Project
  costItems: CostItem[]
  risks: Risk[]
  summary: any
  currency: string
}

export default function CostBreakdownPDF({ project, costItems, summary, currency }: Props) {
  const materials = costItems.filter(i => i.category === 'materials')
  const labor = costItems.filter(i => i.category === 'labor')
  const equipment = costItems.filter(i => i.category === 'equipment')

  const renderTable = (items: CostItem[], type: string) => {
    if (items.length === 0) return <Text style={{ fontSize: 9, color: '#94A3B8', margin: 5 }}>No items in this category.</Text>

    return (
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <View style={styles.tableColLarge}><Text style={styles.tableCell}>Name</Text></View>
          <View style={styles.tableCol}><Text style={styles.tableCell}>Qty / Days</Text></View>
          <View style={styles.tableCol}><Text style={styles.tableCell}>Unit / Rate</Text></View>
          <View style={styles.tableCol}><Text style={styles.tableCell}>Total Cost</Text></View>
        </View>
        {items.map(item => (
          <View style={styles.tableRow} key={item.id}>
            <View style={styles.tableColLarge}><Text style={styles.tableCell}>{item.name}</Text></View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>
                {type === 'materials' ? `${item.quantity || 0} ${item.unit || ''}` : 
                 type === 'labor' ? `${item.workers || 1} x ${item.days || 1}d` : 
                 `${item.days || 0} days`}
              </Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>
                {type === 'materials' ? formatPdfCurrency(item.unit_price || 0, currency) :
                 type === 'labor' ? formatPdfCurrency(item.daily_rate || 0, currency) :
                 formatPdfCurrency(item.rental_cost || 0, currency)}
              </Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>{formatPdfCurrency(calculateItemCost(item), currency)}</Text>
            </View>
          </View>
        ))}
      </View>
    )
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        <View style={styles.header}>
          <Text style={styles.title}>COST BREAKDOWN REPORT</Text>
          <Text style={styles.subtitle}>{project.name} • {new Date().toLocaleDateString()}</Text>
        </View>

        <Text style={styles.sectionTitle}>1. Materials Allocation</Text>
        {renderTable(materials, 'materials')}

        <Text style={styles.sectionTitle}>2. Labor Allocation</Text>
        {renderTable(labor, 'labor')}

        <Text style={styles.sectionTitle}>3. Equipment Rentals</Text>
        {renderTable(equipment, 'equipment')}

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Base Direct Cost:</Text>
            <Text style={styles.summaryValue}>{formatPdfCurrency(summary.directCost, currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Overhead:</Text>
            <Text style={styles.summaryValue}>{formatPdfCurrency(summary.overhead, currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Contingency & Risk:</Text>
            <Text style={styles.summaryValue}>{formatPdfCurrency(summary.contingency, currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Markup Amount:</Text>
            <Text style={styles.summaryValue}>{formatPdfCurrency(summary.markup, currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax Amount:</Text>
            <Text style={styles.summaryValue}>{formatPdfCurrency(summary.tax, currency)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>GRAND TOTAL:</Text>
            <Text style={styles.grandTotalValue}>{formatPdfCurrency(summary.grandTotal, currency)}</Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          Generated by Construction Cost Estimator App • Detailed line-item breakdown
        </Text>

      </Page>
    </Document>
  )
}
