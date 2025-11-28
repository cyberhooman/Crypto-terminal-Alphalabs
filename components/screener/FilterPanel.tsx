'use client';

import { useState, useEffect, useRef } from 'react';
import { useMarketStore } from '@/stores/useMarketStore';
import { Filter, Search, X, Plus, Sparkles, TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
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
    <div
      className="border-b px-6 py-4"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)'
      }}
    >
      <div className="flex items-center gap-4 flex-wrap">
        {/* Enhanced Search */}
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <input
            type="text"
            placeholder="Search pairs... (BTC, ETH, SOL)"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: 'var(--surface-elevated)',
              border: `1px solid ${searchTerm ? 'var(--primary)' : 'var(--border)'}`,
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Advanced Filter Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all"
            style={{
              background: activeFilter ? 'var(--primary)' : 'var(--surface-elevated)',
              color: activeFilter ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${activeFilter ? 'var(--primary)' : 'var(--border)'}`,
            }}
          >
            <Filter className="w-4 h-4" />
            <span>
              {activeFilter ? activeFilter.name : 'Advanced Filters'}
            </span>
            {activeFilter && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFilter(null);
                }}
                className="ml-1 p-0.5 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </button>

          {/* Modern Dropdown */}
          {showFilterMenu && (
            <div
              className="absolute top-full mt-2 left-0 w-72 rounded-xl shadow-2xl z-20 animate-fade-in overflow-hidden"
              style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-light)'
              }}
            >
              <div className="p-3">
                <div
                  className="text-xs font-bold uppercase px-2 py-1.5 flex items-center gap-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Saved Filters
                </div>
                <div className="space-y-1 mt-2">
                  {savedFilters.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => handleFilterClick(filter)}
                      className="w-full text-left px-3 py-2.5 rounded-lg transition-all group"
                      style={{
                        background: activeFilter?.id === filter.id ? 'var(--primary)' : 'transparent',
                        color: activeFilter?.id === filter.id ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      <div className="font-semibold text-sm">{filter.name}</div>
                      <div className="text-xs mt-0.5 opacity-70">
                        {filter.conditions.length} condition{filter.conditions.length !== 1 ? 's' : ''}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="p-2"
                style={{
                  borderTop: '1px solid var(--border)',
                  background: 'var(--surface)'
                }}
              >
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-medium text-sm"
                  style={{ color: 'var(--primary)' }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Custom Filter</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-2 ml-auto">
          <QuickFilterChip
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            label="High Funding"
            active={activeFilter?.id === 'high-funding'}
            color="danger"
            onClick={() => {
              const filter = savedFilters.find((f) => f.id === 'high-funding');
              if (filter) handleFilterClick(filter);
            }}
          />
          <QuickFilterChip
            icon={<TrendingDown className="w-3.5 h-3.5" />}
            label="Negative FR"
            active={activeFilter?.id === 'negative-funding'}
            color="info"
            onClick={() => {
              const filter = savedFilters.find((f) => f.id === 'negative-funding');
              if (filter) handleFilterClick(filter);
            }}
          />
          <QuickFilterChip
            icon={<Activity className="w-3.5 h-3.5" />}
            label="High Volume"
            active={activeFilter?.id === 'high-volume'}
            color="warning"
            onClick={() => {
              const filter = savedFilters.find((f) => f.id === 'high-volume');
              if (filter) handleFilterClick(filter);
            }}
          />
          <QuickFilterChip
            icon={<DollarSign className="w-3.5 h-3.5" />}
            label="Positive CVD"
            active={activeFilter?.id === 'positive-cvd'}
            color="success"
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

function QuickFilterChip({
  icon,
  label,
  active,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  color: 'success' | 'danger' | 'warning' | 'info';
  onClick: () => void;
}) {
  const colorMap = {
    success: { bg: 'var(--success-light)', text: 'var(--success)', border: 'var(--success)' },
    danger: { bg: 'var(--danger-light)', text: 'var(--danger)', border: 'var(--danger)' },
    warning: { bg: 'var(--warning-light)', text: 'var(--warning)', border: 'var(--warning)' },
    info: { bg: 'var(--info-light)', text: 'var(--info)', border: 'var(--info)' },
  };

  const colors = colorMap[color];

  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
      style={{
        background: active ? colors.bg : 'var(--surface-elevated)',
        color: active ? colors.text : 'var(--text-tertiary)',
        border: `1px solid ${active ? colors.border : 'var(--border)'}`,
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
