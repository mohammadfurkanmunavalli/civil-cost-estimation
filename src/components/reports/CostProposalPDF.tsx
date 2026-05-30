import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Project } from '@/types'
import { formatPdfCurrency } from '@/lib/utils'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, color: '#333' },
  header: { marginBottom: 30, borderBottomWidth: 2, borderBottomColor: '#2563EB', paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A8A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 5 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 4 },
  row: { flexDirection: 'row', marginBottom: 6 },
  colLabel: { width: 120, fontWeight: 'bold', color: '#475569' },
  colValue: { flex: 1, color: '#0F172A' },
  descriptionBox: { padding: 10, backgroundColor: '#F8FAFC', borderRadius: 4, minHeight: 60, marginTop: 5 },
  grandTotalBox: { marginTop: 40, padding: 20, backgroundColor: '#EFF6FF', borderRadius: 8, alignItems: 'center' },
  grandTotalLabel: { fontSize: 14, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: 1 },
  grandTotalValue: { fontSize: 28, fontWeight: 'bold', color: '#1E3A8A', marginTop: 8 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', color: '#94A3B8', fontSize: 9, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 10 }
})

interface Props {
  project: Project
  summary: any
  currency: string
}

export default function CostProposalPDF({ project, summary, currency }: Props) {
  const now = new Date().toLocaleDateString()

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>CONSTRUCTION COST PROPOSAL</Text>
          <Text style={styles.subtitle}>Generated on {now}</Text>
        </View>

        {/* Project Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Overview</Text>
          <View style={styles.row}>
            <Text style={styles.colLabel}>Project Name:</Text>
            <Text style={styles.colValue}>{project.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.colLabel}>Location:</Text>
            <Text style={styles.colValue}>{project.location || 'Not Specified'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.colLabel}>Type:</Text>
            <Text style={styles.colValue}>{project.type || 'Not Specified'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.colLabel}>Size:</Text>
            <Text style={styles.colValue}>{project.size ? `${project.size} ${project.size_unit}` : 'Not Specified'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.colLabel}>Duration:</Text>
            <Text style={styles.colValue}>{project.duration ? `${project.duration} ${project.duration_unit}` : 'Not Specified'}</Text>
          </View>
        </View>

        {/* Client Requirements  */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Requirements</Text>
          <View style={styles.descriptionBox}>
            <Text>{project.client_requirements || 'No specific requirements outlined.'}</Text>
          </View>
        </View>

        {/* Scope / Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scope of Work</Text>
          <View style={styles.descriptionBox}>
            <Text>{project.description || 'Standard construction scope.'}</Text>
          </View>
        </View>

        {/* Grand Total */}
        <View style={styles.grandTotalBox}>
          <Text style={styles.grandTotalLabel}>Estimated Grand Total</Text>
          <Text style={styles.grandTotalValue}>{formatPdfCurrency(summary.grandTotal, currency)}</Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer} fixed>
          This document is an estimate based on current market rates and provided requirements. 
          Prices are subject to variation due to unforeseen site conditions or material inflation.
        </Text>

      </Page>
    </Document>
  )
}
