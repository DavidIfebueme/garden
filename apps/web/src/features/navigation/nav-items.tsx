import { Icon as IconifyIcon } from '@iconify/react'
import { Users, Zap } from 'lucide-react'
import type { ComponentType } from 'react'

/**
 * Primary nav config for the redesigned shell (Penpot "Garden" file, 2026-09).
 * Single source of truth for sidebar labels/icons/routes — the product renames
 * agreed with design (Issues→Tasks, Automations→Workflows, Connections→Connectors)
 * land per page as each redesign ships, so flipping a label here is a one-line
 * change. Order matches the design's sidebar.
 */
export type NavItem = {
  id: string
  label: string
  /** Route base path; used for active-state matching and navigation. */
  to: string
  icon: ComponentType<{ className?: string }>
}

function HomeIcon({ className }: { className?: string }) {
  return <IconifyIcon icon="hugeicons:home-05" className={className} />
}

function ChatsIcon({ className }: { className?: string }) {
  return <IconifyIcon icon="hugeicons:bubble-chat" className={className} />
}

function TasksIcon({ className }: { className?: string }) {
  return <IconifyIcon icon="ic:sharp-checklist" className={className} />
}

function FilesIcon({ className }: { className?: string }) {
  return <IconifyIcon icon="hugeicons:folder-01" className={className} />
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <IconifyIcon
      icon="material-symbols:inbox-outline-sharp"
      className={className}
    />
  )
}

function AgentsIcon({ className }: { className?: string }) {
  return <IconifyIcon icon="hugeicons:robot-01" className={className} />
}

function SkillsIcon({ className }: { className?: string }) {
  return <IconifyIcon icon="hugeicons:book-open-01" className={className} />
}

function ConnectionsIcon({ className }: { className?: string }) {
  return <IconifyIcon icon="hugeicons:plug-socket" className={className} />
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', to: '/home', icon: HomeIcon },
  { id: 'chats', label: 'Chats', to: '/chats', icon: ChatsIcon },
  { id: 'tasks', label: 'Tasks', to: '/tasks', icon: TasksIcon },
  { id: 'files', label: 'Files & Folders', to: '/files', icon: FilesIcon },
  { id: 'inbox', label: 'Inbox', to: '/inbox', icon: InboxIcon },
  { id: 'automations', label: 'Automations', to: '/automations', icon: Zap },
  { id: 'agents', label: 'Agents', to: '/agents', icon: AgentsIcon },
  { id: 'skills', label: 'Skills', to: '/skills', icon: SkillsIcon },
  {
    id: 'connections',
    label: 'Connections',
    to: '/connections',
    icon: ConnectionsIcon,
  },
  { id: 'teams', label: 'Teams', to: '/teams', icon: Users },
]

/** Resolves the nav item that owns a pathname (longest route-base match). */
export function navItemForPathname(pathname: string): NavItem | null {
  let best: NavItem | null = null
  for (const item of NAV_ITEMS) {
    if (pathname === item.to || pathname.startsWith(`${item.to}/`)) {
      if (!best || item.to.length > best.to.length) best = item
    }
  }
  return best
}
