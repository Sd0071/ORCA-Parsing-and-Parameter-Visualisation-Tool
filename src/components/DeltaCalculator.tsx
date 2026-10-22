/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowRight, Layers, Check, Calculator, Info } from 'lucide-react';
import { DeltaDescriptors, OrcaCalculation } from '../types/orca';
import { computeDelta } from '../utils/csvExport';

interface DeltaCalculatorProps {
  calculations: OrcaCalculation[];
  onSaveDelta: (delta: DeltaDescriptors) => void;
  savedDeltas: DeltaDescriptors[];
}

export const DeltaCalculator: React.FC<DeltaCalculatorProps> = ({
  calculations,
  onSaveDelta,
  savedDeltas,
}) => {
  const complexes = calculations.filter((c) => c.calcType === 'complex');
  const ligands = calculations.filter((c) => c.calcType === 'ligand');

  const [selectedComplexId, setSelectedComplexId] = useState<string>(
    complexes[0]?.id || calculations[0]?.id || ''
  );
  const [selectedLigandId, setSelectedLigandId] = useState<string>(
    ligands[0]?.id || calculations[1]?.id || ''
  );

  const selectedComplex = calculations.find((c) => c.id === selectedComplexId);
  const selectedLigand = calculations.find((c) => c.id === selectedLigandId);

  const currentDelta: DeltaDescriptors | null =
    selectedComplex && selectedLigand
      ? computeDelta(selectedComplex, selectedLigand)
      : null;

  const deltaRows = [
    {
      name: 'D_homo',
      desc: 'HOMO Shift upon Coordination',
      unit: 'eV',
      complexVal: selectedComplex?.descriptors.homo,
      ligandVal: selectedLigand?.descriptors.homo,
      deltaVal: currentDelta?.d_homo,
    },
    {
      name: 'D_lumo',
      desc: 'LUMO Shift upon Coordination',
      unit: 'eV',
      complexVal: selectedComplex?.descriptors.lumo,
      ligandVal: selectedLigand?.descriptors.lumo,
      deltaVal: currentDelta?.d_lumo,
    },
    {
      name: 'D_eta',
      desc: 'Hardness / Gap Change (Δη)',
      unit: 'eV',
      complexVal: selectedComplex?.descriptors.eta,
      ligandVal: selectedLigand?.descriptors.eta,
      deltaVal: currentDelta?.d_eta,
    },
    {
      name: 'D_mu',
      desc: 'Chemical Potential Change (Δμ)',
      unit: 'eV',
      complexVal: selectedComplex?.descriptors.mu,
      ligandVal: selectedLigand?.descriptors.mu,
      deltaVal: currentDelta?.d_mu,
    },
    {
      name: 'D_omega',
      desc: 'Electrophilicity Change (Δω)',
      unit: 'eV',
      complexVal: selectedComplex?.descriptors.omega,
      ligandVal: selectedLigand?.descriptors.omega,
      deltaVal: currentDelta?.d_omega,
    },
    {
      name: 'D_NBO(P)',
      desc: 'NBO Charge Difference on Phosphorus',
      unit: 'e',
      complexVal: selectedComplex?.descriptors.nbo_p,
      ligandVal: selectedLigand?.descriptors.nbo_p,
      deltaVal: currentDelta?.d_nbo_p,
    },
    {
      name: 'D_NBO(O)',
      desc: 'NBO Charge Difference on Coordinated Oxygen',
      unit: 'e',
      complexVal: selectedComplex?.descriptors.nbo_o,
      ligandVal: selectedLigand?.descriptors.nbo_o,
      deltaVal: currentDelta?.d_nbo_o,
    },
    {
      name: 'D_NBO(S)',
      desc: 'NBO Charge Difference on Sulfonate Sulfur',
      unit: 'e',
      complexVal: selectedComplex?.descriptors.nbo_s,
      ligandVal: selectedLigand?.descriptors.nbo_s,
      deltaVal: currentDelta?.d_nbo_s,
    },
    {
      name: 'D_polar1',
      desc: 'Polarizability Component 1 Change',
      unit: 'Bohr³',
      complexVal: selectedComplex?.descriptors.polar1,
      ligandVal: selectedLigand?.descriptors.polar1,
      deltaVal: currentDelta?.d_polar1,
    },
    {
      name: 'D_polar2',
      desc: 'Polarizability Component 2 Change',
      unit: 'Bohr³',
      complexVal: selectedComplex?.descriptors.polar2,
      ligandVal: selectedLigand?.descriptors.polar2,
      deltaVal: currentDelta?.d_polar2,
    },
    {
      name: 'D_31P NMR',
      desc: '31P NMR Chemical Shift Change',
      unit: 'ppm',
      complexVal: selectedComplex?.descriptors.nmr_31p,
      ligandVal: selectedLigand?.descriptors.nmr_31p,
      deltaVal: currentDelta?.d_nmr_31p,
    },
  ];

  const handlePairSave = () => {
    if (currentDelta) {
      onSaveDelta(currentDelta);
    }
  };

  const isAlreadySaved = Boolean(
    currentDelta &&
      savedDeltas.some(
        (s) => s.complexId === currentDelta.complexId && s.ligandId === currentDelta.ligandId
      )
  );

  return (
    <div className="space-y-6">
      {/* Intro Box */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Table S3 Delta (Δ) Parameter Pair Calculator
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              As described in the paper, all <span className="font-mono font-medium text-slate-700">D_XXX</span> descriptors represent the coordination perturbation:
              <br />
              <code className="text-[11px] font-mono text-blue-700 font-semibold">
                D_XXX = (XXX in Complex) - (XXX in Free Ligand)
              </code>
            </p>
          </div>
        </div>

        {/* Pair Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              1. Select Metal Complex Calculation (Catalyst)
            </label>
            <select
              value={selectedComplexId}
              onChange={(e) => setSelectedComplexId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none"
            >
              {calculations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.systemName} ({c.calcType === 'complex' ? 'Complex' : 'Ligand'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              2. Select Free Ligand Calculation
            </label>
            <select
              value={selectedLigandId}
              onChange={(e) => setSelectedLigandId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none"
            >
              {calculations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.systemName} ({c.calcType === 'ligand' ? 'Ligand' : 'Complex'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            {selectedComplex && selectedLigand
              ? `Pair: ${selectedComplex.systemName} ⇄ ${selectedLigand.systemName}`
              : 'Select two calculations to pair'}
          </span>
          <button
            onClick={handlePairSave}
            disabled={!currentDelta || isAlreadySaved}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            {isAlreadySaved ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Pair Saved to CSV Dataset
              </>
            ) : (
              'Save Pair to CSV Dataset'
            )}
          </button>
        </div>
      </div>

      {/* Delta Table */}
      {selectedComplex && selectedLigand && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">
              Comparative Parameter Delta Matrix
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Δ = Complex − Ligand
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="py-2.5 px-4 font-mono">Descriptor</th>
                  <th className="py-2.5 px-4">Physical Meaning</th>
                  <th className="py-2.5 px-4 text-right">Complex ({selectedComplex.systemName})</th>
                  <th className="py-2.5 px-4 text-right">Ligand ({selectedLigand.systemName})</th>
                  <th className="py-2.5 px-4 text-right font-bold text-blue-700">Delta (Δ)</th>
                  <th className="py-2.5 px-4">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {deltaRows.map((row) => (
                  <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-blue-600">
                      {row.name}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-700">
                      {row.desc}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600">
                      {row.complexVal !== undefined ? row.complexVal.toFixed(4) : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600">
                      {row.ligandVal !== undefined ? row.ligandVal.toFixed(4) : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                      {row.deltaVal !== undefined ? (
                        <span className={row.deltaVal > 0 ? 'text-emerald-600' : row.deltaVal < 0 ? 'text-amber-600' : 'text-slate-900'}>
                          {row.deltaVal > 0 ? `+${row.deltaVal.toFixed(4)}` : row.deltaVal.toFixed(4)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 font-sans text-[11px]">
                      {row.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
