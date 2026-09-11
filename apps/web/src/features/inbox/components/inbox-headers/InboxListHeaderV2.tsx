import React, { useState } from 'react';
import { Input } from '@garden/ui/components/ui/input';

export const InboxListHeaderV2 = () => {
    const [searchValue, setSearchValue] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');

    const filterOptions = ['All', 'Unread', 'Sent', 'In-draft'];

    const filterDescriptions: Record<string, string> = {
        All: 'All notifications',
        Unread: 'Unread notifications',
        Sent: 'Sent notifications',
        'In-draft': 'Draft notifications',
    };

    const handleFilterClick = (filter: string) => {
        setActiveFilter(filter);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchValue(value);
    };

    return (
        <div className="w-full max-w-md space-y-1 rounded-lg">
            {/* Search */}
            <div className="p-3">
                <Input
                    value={searchValue}
                    onChange={handleSearchChange}
                    placeholder="Search"
                    className="h-10 bg-background shadow-none"
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

            {/* Dynamic Banner */}
            <div className="px-2.5 text-xs py-1 bg-muted uppercase mt-3 rounded-sm text-muted-foreground font-medium">
                {filterDescriptions[activeFilter] ?? `${activeFilter} notifications`}
            </div>
        </div>
    );
};