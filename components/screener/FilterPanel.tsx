'use client';

import { useState, useEffect, useRef } from 'react';
import { useMarketStore } from '@/stores/useMarketStore';
import { Filter, Search, X, Plus } from 'lucide-react';
import type { Filter as FilterType } from '@/lib/types';

interface FilterPanelProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export default function FilterPanel({ searchTerm, onSearchChange }: FilterPanelProps) {
  const { activeFilter, savedFilters, setActiveFilter } = useMarketStore();
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleFilterClick = (filter: FilterType) => {
    if (activeFilter?.id === filter.id) {
      setActiveFilter(null);
    } else {
      setActiveFilter(filter);
    }
    setShowFilterMenu(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    };

    if (showFilterMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterMenu]);

  return (
    <div className="bg-gray-900 border-b border-gray-800 p-4">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search symbols... (e.g. BTC, ETH)"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeFilter
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="font-medium text-sm">
              {activeFilter ? activeFilter.name : 'Filters'}
            </span>
            {activeFilter && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFilter(null);
                }}
                className="ml-2 hover:bg-blue-700 rounded p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </button>

          {/* Filter Dropdown */}
          {showFilterMenu && (
            <div className="absolute top-full mt-2 left-0 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-20 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-2">
                <div className="text-xs font-semibold text-gray-400 uppercase px-2 py-1">
                  Saved Filters
                </div>
                <div className="space-y-1">
                  {savedFilters.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => handleFilterClick(filter)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        activeFilter?.id === filter.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <div className="font-medium text-sm">{filter.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {filter.conditions.length} condition
                        {filter.conditions.length !== 1 ? 's' : ''}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-700 p-2">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-blue-400 hover:bg-gray-700 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />
                  <span className="font-medium text-sm">Create New Filter</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2">
          <QuickFilterButton
            label="High Funding"
            active={activeFilter?.id === 'high-funding'}
            onClick={() => {
              const filter = savedFilters.find((f) => f.id === 'high-funding');
              if (filter) handleFilterClick(filter);
            }}
          />
          <QuickFilterButton
            label="Negative FR"
            active={activeFilter?.id === 'negative-funding'}
            onClick={() => {
              const filter = savedFilters.find((f) => f.id === 'negative-funding');
              if (filter) handleFilterClick(filter);
            }}
          />
          <QuickFilterButton
            label="High Volume"
            active={activeFilter?.id === 'high-volume'}
            onClick={() => {
              const filter = savedFilters.find((f) => f.id === 'high-volume');
              if (filter) handleFilterClick(filter);
            }}
          />
          <QuickFilterButton
            label="Positive CVD"
            active={activeFilter?.id === 'positive-cvd'}
            onClick={() => {
              const filter = savedFilters.find((f) => f.id === 'positive-cvd');
              if (filter) handleFilterClick(filter);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function QuickFilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
        active
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}
