import React from 'react'
import { Input } from '@garden/ui/components/ui/input'
import { cn } from '@garden/ui/lib/utils'
import { Search } from 'lucide-react'

type InboxListHeaderV2Props = {
  search: string
  onSearchChange: (value: string) => void
  unreadsOnly: boolean
  onUnreadsOnlyChange: (value: boolean) => void
  unreadCount: number
}

export const InboxListHeaderV2 = ({
  search,
  onSearchChange,
  unreadsOnly,
  onUnreadsOnlyChange,
  unreadCount,
}: InboxListHeaderV2Props) => {
  const activeFilter = unreadsOnly ? 'Unread' : 'All'
  const filterOptions = ['All', 'Unread'] as const

  const filterDescriptions: Record<string, string> = {
    All: 'All notifications',
    Unread: `${unreadCount} unread notifications`,
  }

  const handleFilterClick = (filter: string) => {
    onUnreadsOnlyChange(filter === 'Unread')
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    onSearchChange(value)
  }

  return (
    <div className="w-full max-w-md space-y-1 rounded-lg">
      {/* Search */}
      <div className="p-3">
        <Input
          value={search}
          onChange={handleSearchChange}
          placeholder="Search"
          className="h-10 bg-background shadow-none"
          leftIcon={<Search className="w-4 h-4 text-muted-foreground" />}
        />
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex items-center space-x-1 mx-3 p-1 bg-muted rounded-sm overflow-x-auto">
        {filterOptions.map((filter) => {
          const isActive = activeFilter === filter
          return (
            <button
              key={filter}
              type="button"
              onClick={() => handleFilterClick(filter)}
              className={cn(
                'cursor-pointer whitespace-nowrap rounded-sm px-4 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-foreground hover:bg-gray-200/50 hover:text-gray-900',
              )}
            >
              {filter}
            </button>
          )
        })}
      </div>

      {/* Banner */}
      <div className="px-2.5 text-xs py-1 bg-muted uppercase my-3 rounded-sm text-muted-foreground font-medium">
        {filterDescriptions[activeFilter] ?? `${activeFilter} notifications`}
      </div>
    </div>
  )
}
