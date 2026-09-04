import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@garden/ui/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@garden/ui/components/ui/dropdown-menu'
import { cn } from '@garden/ui/lib/utils'
import {
  CaretUpDown,
  SignOut,
  ShieldCheck,
  UserCircleCheck,
} from '@phosphor-icons/react'

/**
 * User card pinned to the bottom of the new flat sidebar (design: 24px avatar
 * + name + chevron). Account-only menu (account, sessions & security, logout) —
 * workspace switching moved up to the sidebar header's WorkspaceSwitcher.
 */
export function UserCard({
  user,
  collapsed,
  onAccount,
  onLogout,
}: {
  user: { name: string; email: string; avatar?: string | null }
  collapsed?: boolean
  onAccount: () => void
  onLogout: () => void
}) {
  const initials = user.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex w-full items-center gap-2 rounded-sm p-1.5 text-left transition-colors hover:bg-background-main-secondary',
          collapsed && 'justify-center p-0',
        )}
        aria-label="Account"
      >
        <Avatar className="size-6 rounded-sm">
          <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
          <AvatarFallback className="rounded-sm text-[10px]">
            {initials}
          </AvatarFallback>
        </Avatar>
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-neutral-default">
              {user.name}
            </span>
            <CaretUpDown className="size-3.5 text-icon-neutral-tertiary" />
          </>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        side="right"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
              <Avatar>
                <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onAccount}>
            <UserCircleCheck />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAccount}>
            <ShieldCheck />
            Sessions & security
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>
          <SignOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
