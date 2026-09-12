import React, { useState } from 'react';
import { Input } from '@garden/ui/components/ui/input';
import { Search, Sparkles } from 'lucide-react';

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
    const [activeFilter, setActiveFilter] = useState(unreadsOnly ? 'Unread' : 'All');
    const filterOptions = ['All', 'Unread', 'Sent', 'In-draft'];

    const filterDescriptions: Record<string, string> = {
        All: 'All notifications',
        Unread: `${unreadCount} unread notifications`,
        Sent: 'Sent notifications',
        'In-draft': 'Draft notifications',
    };

    const handleFilterClick = (filter: string) => {
        setActiveFilter(filter);
        if (filter === 'All' || filter === 'Unread') {
            onUnreadsOnlyChange(filter === 'Unread');
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        onSearchChange(value);
    };

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
                    rightIcon={
                        <button
                            type="button"
                            className="flex items-center justify-center transition-opacity hover:opacity-80 focus:outline-none cursor-pointer"
                            aria-label="AI Search"
                        >
                            <svg width="0" height="0" className="absolute">
                                <defs>
                                    <linearGradient id="sparkles-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="rgba(138, 56, 245, 1)" />
                                        <stop offset="100%" stopColor="rgba(23, 124, 255, 1)" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <Sparkles
                                className="w-4 h-4"
                                stroke="url(#sparkles-gradient)"
                            />
                        </button>
                    }
                />
            </div>

            {/* Filter Tabs Bar */}
            <div className="flex items-center space-x-1 mx-3 p-1 bg-muted rounded-sm overflow-x-auto">
                {filterOptions.map((filter) => {
                    const isActive = activeFilter === filter;
                    return (
                        <button
                            key={filter}
                            onClick={() => handleFilterClick(filter)}
                            className={`px-4 cursor-pointer text-sm font-medium rounded-sm transition-all whitespace-nowrap 
                                ${isActive
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-foreground hover:text-gray-900 hover:bg-gray-200/50'
                                }`}
                        >
                            {filter}
                        </button>
                    );
                })}
            </div>

            {/* Banner */}
            <div className="px-2.5 text-xs py-1 bg-muted uppercase mt-3 rounded-sm text-muted-foreground font-medium">
                {filterDescriptions[activeFilter] ?? `${activeFilter} notifications`}
            </div>
        </div>
    );
};
