import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import {
  FolderOpen, Package, BarChart3, Settings,
  LogOut, ChevronLeft, ChevronRight, Users,
  FileText, SlidersHorizontal, Home, Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  icon: React.ReactNode
  to: string
  adminOnly?: boolean
  section?: string
}

export default function Sidebar() {
  const { t } = useTranslation()
  const { profile, signOut } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  const isAdmin = profile?.role === 'admin'

  const mainNav: NavItem[] = [
    { label: t('nav.projects'), icon: <FolderOpen size={18} />, to: '/projects' },
    { label: t('nav.resources'), icon: <Package size={18} />, to: '/resources' },
    { label: t('nav.analytics'), icon: <BarChart3 size={18} />, to: '/analytics' },
    { label: t('nav.settings'), icon: <Settings size={18} />, to: '/settings' },
  ]

  const adminNav: NavItem[] = [
    { label: t('nav.appSettings'), icon: <SlidersHorizontal size={18} />, to: '/admin/settings' },
    { label: t('nav.users'), icon: <Users size={18} />, to: '/admin/users' },
    { label: t('nav.projects'), icon: <FolderOpen size={18} />, to: '/admin/projects' },
    { label: t('nav.projectData'), icon: <SlidersHorizontal size={18} />, to: '/admin/project-data' },
    { label: t('nav.auditLogs'), icon: <FileText size={18} />, to: '/admin/audit-logs' },
  ]

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-surface-card border-e border-surface-border transition-all duration-300 ease-in-out flex-shrink-0',
        collapsed ? 'w-16' : 'w-16 md:w-72'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 h-14 border-b border-surface-border flex-shrink-0',
        'justify-center md:justify-start px-0 md:px-4',
        collapsed && 'md:justify-center md:px-0'
      )}>
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
          <Home size={16} className="text-white" />
        </div>
        {!collapsed && (
          <span className="hidden md:inline font-bold text-sm text-white leading-tight">
            Cost<br />Estimator
          </span>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {mainNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn('nav-item justify-center px-0 md:justify-start md:px-3', isActive && 'active', collapsed && 'md:justify-center md:px-0')
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="hidden md:inline">{item.label}</span>}
          </NavLink>
        ))}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className={cn('pt-4 pb-2 hidden md:block', collapsed && 'md:hidden')}>
              <div className="flex items-center gap-2 px-3 mb-1">
                <Shield size={12} className="text-surface-muted" />
                <span className="text-xs font-semibold text-surface-muted uppercase tracking-wider">
                  Admin Panel
                </span>
              </div>
            </div>
            <div className={cn('my-2 border-t border-surface-border mx-2 md:hidden', collapsed && 'md:block')} />
            {adminNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn('nav-item justify-center px-0 md:justify-start md:px-3', isActive && 'active', collapsed && 'md:justify-center md:px-0')
                }
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="hidden md:inline text-xs">{item.label}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer: logout + collapse */}
      <div className="border-t border-surface-border p-2 space-y-1">
        <button
          onClick={() => signOut()}
          className={cn('nav-item w-full justify-center px-0 md:justify-start md:px-3 hover:text-danger hover:bg-danger/10', collapsed && 'md:justify-center md:px-0')}
          title={collapsed ? t('nav.logout') : undefined}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span className="hidden md:inline">{t('nav.logout')}</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn('nav-item w-full hidden md:flex', collapsed && 'justify-center px-0')}
          title={t('nav.collapseSidebar')}
        >
          {collapsed
            ? <ChevronRight size={16} />
            : <><ChevronLeft size={16} /><span className="text-xs">{t('nav.collapseSidebar')}</span></>
          }
        </button>
      </div>
    </aside>
  )
}
