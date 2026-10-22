/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Plus, Trash2, Sparkles } from 'lucide-react';
import { OrcaCalculation } from '../types/orca';
import { parseOrcaOutput } from '../utils/orcaParser';
import {
  SAMPLE_ORCA_COMPLEX_OAN,
  SAMPLE_ORCA_LIGAND_OAN,
  SAMPLE_ORCA_COMPLEX_BIAR,
} from '../utils/sampleData';

interface FileUploadZoneProps {
  calculations: OrcaCalculation[];
  activeId: string | null;
  onSelectCalculation: (id: string) => void;
  onAddCalculation: (calc: OrcaCalculation) => void;
  onDeleteCalculation: (id: string) => void;
  onToggleCalcType: (id: string) => void;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  calculations,
  activeId,
  onSelectCalculation,
  onAddCalculation,
  onDeleteCalculation,
  onToggleCalcType,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteName, setPasteName] = useState('');
  const [pasteContent, setPasteContent] = useState('');

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const parsed = parseOrcaOutput(file.name, text);
        onAddCalculation(parsed);
      }
    };
    reader.readAsText(file);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (
        file.name.endsWith('.out') ||
        file.name.endsWith('.log') ||
        file.name.endsWith('.txt') ||
        file.type.includes('text') ||
        file.size < 50 * 1024 * 1024
      ) {
        processFile(file);
      }
    });
  };

  const loadSample = (name: string, content: string) => {
    const parsed = parseOrcaOutput(name, content);
    onAddCalculation(parsed);
  };

  const handlePasteSubmit = () => {
    if (!pasteContent.trim()) return;
    const name = pasteName.trim() || `orca_paste_${Date.now()}.out`;
    const parsed = parseOrcaOutput(name, pasteContent);
    onAddCalculation(parsed);
    setPasteContent('');
    setPasteName('');
    setShowPasteModal(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
            ORCA Output Files &amp; Benchmark Runs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ingest raw `.out` or `.log` files to extract Table S3 quantum descriptors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Load Benchmarks:</span>
          <button
            onClick={() => loadSample('Pd_PS_oAn_complex.out', SAMPLE_ORCA_COMPLEX_OAN)}
            className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
          >
            Pd_PS_oAn (Complex)
          </button>
          <button
            onClick={() => loadSample('PS_oAn_ligand.out', SAMPLE_ORCA_LIGAND_OAN)}
            className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
          >
            PS_oAn (Free Ligand)
          </button>
          <button
            onClick={() => loadSample('Pd_PS_biAr_complex.out', SAMPLE_ORCA_COMPLEX_BIAR)}
            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
          >
            Pd_PS_biAr (Complex)
          </button>
          <button
            onClick={() => setShowPasteModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Paste Log Text
          </button>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`mt-4 border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".out,.log,.txt,text/plain"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center justify-center gap-1.5">
          <Upload className="w-6 h-6 text-slate-400" />
          <p className="text-xs font-medium text-slate-700">
            <span className="text-blue-600 hover:underline">Click to browse</span> or drag and drop raw ORCA output files (.out, .log, .txt)
          </p>
          <p className="text-[11px] text-slate-400">
            Supports ORCA 4.x, 5.x &amp; 6.x single point, optimization, NBO, NMR, and IR frequency calculations
          </p>
        </div>
      </div>

      {/* Loaded Calculations List */}
      {calculations.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600">
              Loaded Calculations ({calculations.length})
            </span>
            <span className="text-[11px] text-slate-400">
              Select calculation to view Table S3 parameters
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {calculations.map((calc) => {
              const isSelected = calc.id === activeId;
              return (
                <div
                  key={calc.id}
                  onClick={() => onSelectCalculation(calc.id)}
                  className={`group relative flex items-center justify-between p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 pr-6">
                    <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-900 truncate">
                        {calc.systemName}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleCalcType(calc.id);
                          }}
                          className={`hover:underline font-mono ${
                            calc.calcType === 'complex' ? 'text-blue-600' : 'text-emerald-600'
                          }`}
                          title="Click to toggle Complex / Free Ligand"
                        >
                          {calc.calcType === 'complex' ? 'Pd Complex' : 'Free Ligand'}
                        </button>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{calc.orcaVersion || 'ORCA'}</span>
                        <span aria-hidden="true">·</span>
                        {calc.isConverged ? (
                          <span className="text-emerald-600 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Conv.
                          </span>
                        ) : (
                          <span className="text-slate-400">Done</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCalculation(calc.id);
                    }}
                    title="Remove calculation"
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Paste Raw ORCA Log Output</h3>
            <p className="text-xs text-slate-500 mb-4">
              Paste your raw computation log text or excerpts containing orbital energies, NBO analysis, or coordinates.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Calculation / Catalyst Identifier
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pd_PS_oAnCF3_opt"
                  value={pasteName}
                  onChange={(e) => setPasteName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Log Contents
                </label>
                <textarea
                  rows={10}
                  placeholder="Paste ORCA output here (ORBITAL ENERGIES, NATURAL POPULATION ANALYSIS, etc.)..."
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  className="w-full p-3 font-mono text-[11px] border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handlePasteSubmit}
                disabled={!pasteContent.trim()}
                className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md"
              >
                Parse Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
