'use client';

import { useState } from 'react';
import { Calendar, Settings, Plus, User, ChevronDown, Menu, X } from 'lucide-react';

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Calendar className="text-white" size={20} />
          </div>
          <span className="font-semibold text-lg text-gray-800">Ad Flow</span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2">
        <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2">
          <Calendar size={18} />
          <span>Schedules</span>
        </button>
        <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2">
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus size={18} />
          <span className="hidden sm:inline">New Campaign</span>
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <User size={20} className="text-gray-600" />
        </button>
      </div>
    </nav>
  );
}
