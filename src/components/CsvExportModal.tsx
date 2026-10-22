/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Download, Copy, Check, FileSpreadsheet, Settings2 } from 'lucide-react';
import { DeltaDescriptors, OrcaCalculation } from '../types/orca';
import { CsvColumnDef, DEFAULT_TABLE_S3_COLUMNS, generateTableS3Csv } from '../utils/csvExport';

interface CsvExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculations: OrcaCalculation[];
  savedDeltas: DeltaDescriptors[];
}

export const CsvExportModal: React.FC<CsvExportModalProps> = ({
  isOpen,
  onClose,
  calculations,
  savedDeltas,
}) => {
  const [columns, setColumns] = useState<CsvColumnDef[]>(DEFAULT_TABLE_S3_COLUMNS);
  const [includeDeltas, setIncludeDeltas] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'complex' | 'ligand'>('all');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const filteredCalculations =
    filterType === 'all'
      ? calculations
      : calculations.filter((c) => c.calcType === filterType);

  const csvString = generateTableS3Csv(
    filteredCalculations,
    columns,
    includeDeltas ? savedDeltas : undefined
  );

  const toggleColumn = (key: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setColumns((prev) => prev.map((c) => ({ ...c, enabled: select })));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(csvString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsv = () => {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `table_s3_quantum_descriptors_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        totalCalculations: filteredCalculations.length,
        calculations: filteredCalculations.map((c) => ({
          systemName: c.systemName,
          type: c.calcType,
          descriptors: c.descriptors,
          isConverged: c.isConverged,
          totalEnergyHartree: c.totalEnergyHartree,
        })),
        deltas: savedDeltas,
      },
      null,
      2
    );
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `table_s3_quantum_descriptors_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Export Table S3 Quantum Descriptors
              </h2>
              <p className="text-xs text-slate-500">
                Standard RFC 4180 CSV with {filteredCalculations.length} entries ready for ML / Pandas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Controls Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700">Filter Species:</span>
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded ${
                    filterType === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({calculations.length})
                </button>
                <button
                  onClick={() => setFilterType('complex')}
                  className={`px-2.5 py-1 text-xs font-medium rounded ${
                    filterType === 'complex' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Complexes Only
                </button>
                <button
                  onClick={() => setFilterType('ligand')}
                  className={`px-2.5 py-1 text-xs font-medium rounded ${
                    filterType === 'ligand' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ligands Only
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDeltas}
                onChange={(e) => setIncludeDeltas(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300"
              />
              <span>Include Delta Columns (D_XXX)</span>
            </label>
          </div>

          {/* Column Toggle Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">
                Select Columns to Include ({columns.filter((c) => c.enabled).length}/{columns.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSelectAll(true)}
                  className="text-[11px] text-blue-600 hover:underline"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() => handleSelectAll(false)}
                  className="text-[11px] text-slate-500 hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-2.5 border border-slate-200 rounded-lg bg-slate-50/50">
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={col.enabled}
                    onChange={() => toggleColumn(col.key)}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
                  />
                  <span className="font-mono text-[11px] truncate" title={col.description}>
                    {col.header}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Live Preview Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-700">CSV Output Preview</span>
              <span className="text-[11px] font-mono text-slate-400">
                {csvString.split('\r\n').length} lines
              </span>
            </div>
            <textarea
              readOnly
              rows={8}
              value={csvString}
              className="w-full p-3 font-mono text-[11px] leading-relaxed bg-slate-900 text-slate-200 rounded-lg outline-none select-all overflow-x-auto"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleDownloadJson}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Export JSON Metadata
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard' : 'Copy CSV Text'}
            </button>
            <button
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV (.csv)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
