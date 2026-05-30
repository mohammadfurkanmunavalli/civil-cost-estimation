import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useSystemStore } from '@/store/systemStore'
import { auditLogger } from '@/lib/auditLogger'

// Layout
import AppLayout from '@/components/layout/AppLayout'
import AuthLayout from '@/components/layout/AuthLayout'

// Auth pages
import LoginPage from '@/pages/auth/LoginPage'
import SignupPage from '@/pages/auth/SignupPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'

// App pages
import ProjectsPage from '@/pages/projects/ProjectsPage'
import ProjectDetailPage from '@/pages/projects/ProjectDetailPage'
import ResourcesPage from '@/pages/resources/ResourcesPage'
import AnalyticsPage from '@/pages/analytics/AnalyticsPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import ShareViewPage from '@/pages/share/ShareViewPage'

// Admin pages
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import AdminProjectsPage from '@/pages/admin/AdminProjectsPage'
import AdminProjectDataPage from '@/pages/admin/AdminProjectDataPage'
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage'
import AdminAuditLogsPage from '@/pages/admin/AdminAuditLogsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-surface-muted text-sm">Loading...</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  if (loading) return null
  if (user) return <Navigate to="/projects" replace />
  return <>{children}</>
}

export default function App() {
  const { setUser, setSession, setLoading, fetchProfile } = useAuthStore()
  const { fetchDictionaries } = useSystemStore()

  useEffect(() => {
    // Warm up the global state dictionaries
    fetchDictionaries()
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    // Listen for auth changes
    let lastUserId = ''

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        fetchProfile(session.user.id)
        
        if (event === 'SIGNED_IN' && session.user.id !== lastUserId) {
          lastUserId = session.user.id
          auditLogger.logLogin(session.user.id, session.user.app_metadata.provider || 'email')
        }
      } else {
        lastUserId = ''
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setSession, setLoading, fetchProfile])

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#fff',
          },
        }}
      />
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<AuthRoute><AuthLayout><LoginPage /></AuthLayout></AuthRoute>} />
        <Route path="/signup" element={<AuthRoute><AuthLayout><SignupPage /></AuthLayout></AuthRoute>} />
        <Route path="/reset-password" element={<AuthLayout><ResetPasswordPage /></AuthLayout>} />

        {/* Public share view */}
        <Route path="/share/:token" element={<ShareViewPage />} />

        {/* Protected app */}
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/projects" replace />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
          <Route path="admin/projects" element={<AdminProjectsPage />} />
          <Route path="admin/project-data" element={<AdminProjectDataPage />} />
          <Route path="admin/settings" element={<AdminSettingsPage />} />
          <Route path="admin/audit-logs" element={<AdminAuditLogsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
