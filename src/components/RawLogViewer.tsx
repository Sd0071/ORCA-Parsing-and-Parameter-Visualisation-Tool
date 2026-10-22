/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Terminal, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface RawLogViewerProps {
  fileName: string;
  rawText: string;
}

export const RawLogViewer: React.FC<RawLogViewerProps> = ({ fileName, rawText }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const lines = rawText.split('\n');

  const filteredIndices = searchTerm.trim()
    ? lines
        .map((l, i) => (l.toLowerCase().includes(searchTerm.toLowerCase()) ? i : -1))
        .filter((i) => i !== -1)
    : [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-800">
            Raw Computation Log Viewer ({lines.length} lines)
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {fileName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-600 font-medium">
            {isOpen ? 'Collapse Log' : 'Inspect Raw Log Text'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-slate-200 bg-slate-950 text-slate-300 font-mono text-xs">
          {/* Quick Search */}
          <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search raw log (e.g. ORBITAL, NBO, OPT)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="text-[11px] text-slate-500">
              {searchTerm && `${filteredIndices.length} matches found`}
            </div>
          </div>

          {/* Terminal Box */}
          <div className="max-h-96 overflow-y-auto leading-relaxed select-text space-y-0.5 text-[11px]">
            {lines.map((line, idx) => {
              const isMatch = searchTerm && line.toLowerCase().includes(searchTerm.toLowerCase());
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-4 hover:bg-slate-900 px-1 py-0.5 rounded ${
                    isMatch ? 'bg-blue-950/80 text-yellow-300 font-bold' : ''
                  }`}
                >
                  <span className="text-slate-600 w-10 text-right select-none shrink-0 font-mono text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="whitespace-pre-wrap break-all">{line || ' '}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
