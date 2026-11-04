'use client';

import { useState } from 'react';
import { Filter, ChevronDown, ChevronRight, X, Plus } from 'lucide-react';
import { Campaign, Stage, Person } from '@/lib/types';

interface SidebarProps {
  campaigns: Campaign[];
  stages: Stage[];
  people: Person[];
}

export default function Sidebar({ campaigns, stages, people }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['campaigns', 'stages']);
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const toggleFilter = (filterId: string) => {
    setSelectedFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filterId)) {
        newSet.delete(filterId);
      } else {
        newSet.add(filterId);
      }
      return newSet;
    });
  };

  const clearAllFilters = () => {
    setSelectedFilters(new Set());
  };

  return (
    <aside className="w-72 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-600" />
            <h2 className="font-semibold text-gray-800">Filters</h2>
          </div>
          {selectedFilters.size > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search filters..."
            className="w-full px-3 py-2 pl-9 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Campaigns Section */}
        <div>
          <button
            onClick={() => toggleSection('campaigns')}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <div className="flex items-center gap-2">
              {expandedSections.includes('campaigns') ? (
                <ChevronDown size={16} className="text-gray-500" />
              ) : (
                <ChevronRight size={16} className="text-gray-500" />
              )}
              <span className="font-medium text-gray-700">Campaigns</span>
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {campaigns.length}
            </span>
          </button>
          {expandedSections.includes('campaigns') && (
            <div className="ml-4 space-y-1">
              {campaigns.map((campaign) => (
                <label
                  key={campaign.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFilters.has(`campaign-${campaign.id}`)}
                    onChange={() => toggleFilter(`campaign-${campaign.id}`)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: campaign.color }}
                  />
                  <span className="text-sm text-gray-700">{campaign.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Stages Section */}
        <div>
          <button
            onClick={() => toggleSection('stages')}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <div className="flex items-center gap-2">
              {expandedSections.includes('stages') ? (
                <ChevronDown size={16} className="text-gray-500" />
              ) : (
                <ChevronRight size={16} className="text-gray-500" />
              )}
              <span className="font-medium text-gray-700">Stages</span>
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {stages.length}
            </span>
          </button>
          {expandedSections.includes('stages') && (
            <div className="ml-4 space-y-1">
              {stages.map((stage) => (
                <label
                  key={stage.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFilters.has(`stage-${stage.id}`)}
                    onChange={() => toggleFilter(`stage-${stage.id}`)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-sm text-gray-700">{stage.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* People Section */}
        <div>
          <button
            onClick={() => toggleSection('people')}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <div className="flex items-center gap-2">
              {expandedSections.includes('people') ? (
                <ChevronDown size={16} className="text-gray-500" />
              ) : (
                <ChevronRight size={16} className="text-gray-500" />
              )}
              <span className="font-medium text-gray-700">People</span>
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {people.length}
            </span>
          </button>
          {expandedSections.includes('people') && (
            <div className="ml-4 space-y-1">
              {people.map((person) => (
                <label
                  key={person.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFilters.has(`person-${person.id}`)}
                    onChange={() => toggleFilter(`person-${person.id}`)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                    {person.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-700 block">{person.name}</span>
                    <span className="text-xs text-gray-500">{person.role}</span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200">
        <button className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
          <Plus size={16} />
          <span>Add Filter</span>
        </button>
      </div>
    </aside>
  );
}
