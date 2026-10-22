/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Download, Copy, Check, FileSpreadsheet, Eye } from 'lucide-react';
import { DeltaDescriptors, OrcaCalculation } from '../types/orca';

interface DatasetMatrixProps {
  calculations: OrcaCalculation[];
  savedDeltas: DeltaDescriptors[];
  onSelectCalculation: (id: string) => void;
  onOpenExport: () => void;
}

export const DatasetMatrix: React.FC<DatasetMatrixProps> = ({
  calculations,
  savedDeltas,
  onSelectCalculation,
  onOpenExport,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    // Quick copy tab-delimited text
    const headers = ['Name', 'Type', 'HOMO(eV)', 'LUMO(eV)', 'Gap(eV)', 'NBO(Pd)', 'NBO(P)', 'NBO(O)', 'NBO(S)', '31P NMR', 'Pd-C(A)', 'P-Pd-O(deg)'];
    const rows = calculations.map((c) => [
      c.systemName,
      c.calcType,
      c.descriptors.homo ?? '',
      c.descriptors.lumo ?? '',
      c.descriptors.eta ?? '',
      c.descriptors.nbo_pd ?? '',
      c.descriptors.nbo_p ?? '',
      c.descriptors.nbo_o ?? '',
      c.descriptors.nbo_s ?? '',
      c.descriptors.nmr_31p ?? '',
      c.descriptors.pd_c ?? '',
      c.descriptors.p_pd_o ?? '',
    ]);

    const tsv = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Batch Dataset Matrix ({calculations.length} calculations)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Structured quantum chemistry table ready for ML training (Random Forest, LASSO, SVR)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied TSV' : 'Copy for Excel'}
          </button>
          <button
            onClick={onOpenExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Configure &amp; Download CSV
          </button>
        </div>
      </div>

      {calculations.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs font-medium">No calculations loaded yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 font-medium text-slate-600">
              <tr>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">System Name</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4 font-mono">homo (eV)</th>
                <th className="py-2.5 px-4 font-mono">lumo (eV)</th>
                <th className="py-2.5 px-4 font-mono">eta (eV)</th>
                <th className="py-2.5 px-4 font-mono">mu (eV)</th>
                <th className="py-2.5 px-4 font-mono">omega (eV)</th>
                <th className="py-2.5 px-4 font-mono">NBO(Pd)</th>
                <th className="py-2.5 px-4 font-mono">NBO(P)</th>
                <th className="py-2.5 px-4 font-mono">NBO(O)</th>
                <th className="py-2.5 px-4 font-mono">NBO(S)</th>
                <th className="py-2.5 px-4 font-mono">31P NMR</th>
                <th className="py-2.5 px-4 font-mono">Pd_dz2</th>
                <th className="py-2.5 px-4 font-mono">IR (C=C)</th>
                <th className="py-2.5 px-4 font-mono">Pd-C (Å)</th>
                <th className="py-2.5 px-4 font-mono">P-Pd-O (°)</th>
                <th className="py-2.5 px-4 font-mono">C=C (Å)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-slate-700">
              {calculations.map((calc) => {
                const d = calc.descriptors;
                return (
                  <tr key={calc.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-2 px-4">
                      <button
                        onClick={() => onSelectCalculation(calc.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-sans text-blue-600 hover:underline cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> Inspect
                      </button>
                    </td>
                    <td className="py-2 px-4 font-sans font-semibold text-slate-900">
                      {calc.systemName}
                    </td>
                    <td className="py-2 px-4 font-sans">
                      <span className={`text-[11px] ${calc.calcType === 'complex' ? 'text-blue-600 font-medium' : 'text-emerald-600 font-medium'}`}>
                        {calc.calcType === 'complex' ? 'Complex' : 'Free Ligand'}
                      </span>
                    </td>
                    <td className="py-2 px-4">{d.homo !== undefined ? d.homo.toFixed(3) : '—'}</td>
                    <td className="py-2 px-4">{d.lumo !== undefined ? d.lumo.toFixed(3) : '—'}</td>
                    <td className="py-2 px-4 font-bold text-blue-600">{d.eta !== undefined ? d.eta.toFixed(3) : '—'}</td>
                    <td className="py-2 px-4">{d.mu !== undefined ? d.mu.toFixed(3) : '—'}</td>
                    <td className="py-2 px-4">{d.omega !== undefined ? d.omega.toFixed(3) : '—'}</td>
                    <td className="py-2 px-4">{d.nbo_pd !== undefined ? d.nbo_pd.toFixed(4) : '—'}</td>
                    <td className="py-2 px-4">{d.nbo_p !== undefined ? d.nbo_p.toFixed(4) : '—'}</td>
                    <td className="py-2 px-4">{d.nbo_o !== undefined ? d.nbo_o.toFixed(4) : '—'}</td>
                    <td className="py-2 px-4">{d.nbo_s !== undefined ? d.nbo_s.toFixed(4) : '—'}</td>
                    <td className="py-2 px-4">{d.nmr_31p !== undefined ? d.nmr_31p.toFixed(2) : '—'}</td>
                    <td className="py-2 px-4">{d.pd_dz2 !== undefined ? d.pd_dz2.toFixed(4) : '—'}</td>
                    <td className="py-2 px-4">{d.ir_cc !== undefined ? d.ir_cc.toFixed(1) : '—'}</td>
                    <td className="py-2 px-4">{d.pd_c !== undefined ? d.pd_c.toFixed(3) : '—'}</td>
                    <td className="py-2 px-4">{d.p_pd_o !== undefined ? d.p_pd_o.toFixed(2) : '—'}</td>
                    <td className="py-2 px-4">{d.c_c !== undefined ? d.c_c.toFixed(3) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
