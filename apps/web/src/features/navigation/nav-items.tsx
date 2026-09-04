import {
  BookOpen,
  ChatsCircle,
  Folder,
  House,
  Lightning,
  ListChecks,
  Plugs,
  Robot,
  Tray,
  Users,
} from '@phosphor-icons/react'
import type { ComponentType } from 'react'

/**
 * Primary nav config for the redesigned shell (Penpot "Garden" file, 2026-09).
 * Single source of truth for sidebar labels/icons/routes — the product renames
 * agreed with design matching the Penpot sidebar exactly (Home, Chats, Tasks, Files & Folders,
 * Inbox, Workflows, Agents, Skills, Connectors, Teams). Icons are Phosphor
 * (the design's icon set).
 */
export type NavItem = {
  id: string
  label: string
  /** Route base path; used for active-state matching and navigation. */
  to: string
  icon: ComponentType<{ className?: string }>
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', to: '/home', icon: House },
  { id: 'chats', label: 'Chats', to: '/chats', icon: ChatsCircle },
  { id: 'tasks', label: 'Tasks', to: '/tasks', icon: ListChecks },
  {
    id: 'files',
    label: 'Files & Folders',
    to: '/files',
    // Design spec: office/regular/folder
    icon: (props) => <Folder weight="regular" {...props} />,
  },
  { id: 'inbox', label: 'Inbox', to: '/inbox', icon: Tray },
  { id: 'automations', label: 'Workflows', to: '/workflows', icon: Lightning },
  { id: 'agents', label: 'Agents', to: '/agents', icon: Robot },
  { id: 'skills', label: 'Skills', to: '/skills', icon: BookOpen },
  { id: 'connections', label: 'Connectors', to: '/connectors', icon: Plugs },
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
