import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { db } from '@/lib/supabase'
import { FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { AuditLog, Profile } from '@/types'

type AuditLogWithProfile = AuditLog & {
  profiles?: Pick<Profile, 'id' | 'full_name' | 'role'>
}

export default function AdminAuditLogsPage() {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<AuditLogWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data: logsData, error } = await db.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50)
      if (error || !logsData) {
        setLoading(false)
        return
      }

      const typedLogs = logsData as AuditLog[]
      const userIds = [...new Set(typedLogs.map((log) => log.user_id).filter(Boolean))]
      let profilesMap: Record<string, Pick<Profile, 'id' | 'full_name' | 'role'>> = {}

      if (userIds.length > 0) {
        const { data: profilesData } = await db.from('profiles').select('id, full_name, role').in('id', userIds)
        if (profilesData) {
          profilesMap = (profilesData as Pick<Profile, 'id' | 'full_name' | 'role'>[]).reduce<Record<string, Pick<Profile, 'id' | 'full_name' | 'role'>>>(
            (acc, profile) => {
              acc[profile.id] = profile
              return acc
            },
            {}
          )
        }
      }

      const merged = typedLogs.map((log) => ({
        ...log,
        profiles: log.user_id ? profilesMap[log.user_id] : undefined
      }))

      setLogs(merged)
      setLoading(false)
    }
    fetch()
  }, [])

  return (
    <div className="animate-in space-y-6">
      <div className="flex items-center gap-2">
        <FileText size={20} className="text-accent" />
        <h1 className="text-2xl font-bold text-white">{t('admin.auditLogsTitle')}</h1>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.user')}</th>
              <th>{t('admin.action')}</th>
              <th>{t('admin.entity')}</th>
              <th>{t('admin.date')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8 text-surface-muted">{t('common.loading')}</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-surface-muted">{t('admin.noLogs')}</td></tr>
            ) : logs.map(log => (
              <tr key={log.id}>
                <td>
                  <div className="flex flex-col">
                    <span className="text-white font-medium">{log.profiles?.full_name || t('common.systemUser')}</span>
                    <span className="text-xs text-surface-muted">{log.profiles?.id?.substring(0, 8)}...</span>
                  </div>
                </td>
                <td><span className="badge badge-blue">{log.action}</span></td>
                <td className="text-surface-muted">{log.entity_type}</td>
                <td className="text-surface-muted">{formatDate(log.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
