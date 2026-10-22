/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Download, BookOpen, Layers } from 'lucide-react';

interface HeaderProps {
  activeTab: 'inspect' | 'delta' | 'dataset' | 'dictionary';
  setActiveTab: (tab: 'inspect' | 'delta' | 'dataset' | 'dictionary') => void;
  onOpenExport: () => void;
  onOpenOpi: () => void;
  totalCalculations: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenExport,
  onOpenOpi,
  totalCalculations,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('inspect');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
        >
          ORCA Table S3 Agent
        </a>
      </div>

      {/* Zone 2: 4-5 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
        <button
          onClick={() => setActiveTab('inspect')}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'inspect'
              ? 'text-blue-600 font-semibold'
              : 'hover:text-slate-900'
          }`}
        >
          Parameter Inspector
        </button>
        <button
          onClick={() => setActiveTab('delta')}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'delta'
              ? 'text-blue-600 font-semibold'
              : 'hover:text-slate-900'
          }`}
        >
          Delta (Δ) Calculator
        </button>
        <button
          onClick={() => setActiveTab('dataset')}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'dataset'
              ? 'text-blue-600 font-semibold'
              : 'hover:text-slate-900'
          }`}
        >
          Batch Dataset Matrix
        </button>
        <button
          onClick={() => setActiveTab('dictionary')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'dictionary'
              ? 'text-blue-600 font-semibold'
              : 'hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4 text-slate-400" />
          Table S3 Definitions
        </button>
        <button
          onClick={onOpenOpi}
          className="text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Python OPI
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenExport}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Export Table S3 CSV
        </button>
      </div>
    </header>
  );
};
