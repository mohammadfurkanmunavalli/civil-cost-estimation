import { useNavigate } from 'react-router-dom'
import { User } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Root, Trigger, Portal, Content, Item } from '@radix-ui/react-dropdown-menu'
import * as Avatar from '@radix-ui/react-avatar'

export default function Header() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <header className="h-14 bg-surface-card border-b border-surface-border flex items-center justify-end px-6 gap-3 flex-shrink-0">
      {/* User avatar */}
      <Root>
        <Trigger asChild>
          <button className="focus:outline-none">
            <Avatar.Root className="w-8 h-8 rounded-full border border-surface-border cursor-pointer hover:border-accent/50 transition-colors">
              {profile?.avatar_url ? (
                <Avatar.Image src={profile.avatar_url} alt={displayName} className="rounded-full" />
              ) : null}
              <Avatar.Fallback className="w-full h-full flex items-center justify-center bg-accent/20 text-accent text-xs font-semibold rounded-full">
                {initials}
              </Avatar.Fallback>
            </Avatar.Root>
          </button>
        </Trigger>

        <Portal>
          <Content
            className="bg-surface-card border border-surface-border rounded-xl shadow-xl p-1 z-50 min-w-48 animate-in"
            sideOffset={8}
            align="end"
          >
            <div className="px-3 py-2 border-b border-surface-border mb-1">
              <p className="text-sm font-medium text-white">{displayName}</p>
              <p className="text-xs text-surface-muted">{user?.email}</p>
            </div>
            <Item
              onSelect={() => navigate('/settings')}
              className="flex items-center gap-2 px-3 py-2 text-sm text-surface-muted hover:text-white hover:bg-white/5 rounded-lg cursor-pointer outline-none transition-colors"
            >
              <User size={14} />
              Profile
            </Item>
          </Content>
        </Portal>
      </Root>
    </header>
  )
}
