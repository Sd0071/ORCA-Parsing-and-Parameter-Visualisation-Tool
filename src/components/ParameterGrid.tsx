/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Edit2,
  Atom,
  Activity,
  Layers,
  Compass,
  FileCode,
  Info,
} from 'lucide-react';
import { OrcaCalculation, TableS3Descriptors } from '../types/orca';

interface ParameterGridProps {
  calculation: OrcaCalculation;
  onUpdateDescriptor: (key: keyof TableS3Descriptors, value: number | undefined) => void;
  onAiExtract: () => void;
  isAiLoading: boolean;
  onOpenAudit: (key: keyof TableS3Descriptors) => void;
}

interface ParameterCardItem {
  key: keyof TableS3Descriptors;
  label: string;
  tableS3Name: string;
  unit: string;
  value?: number;
  description: string;
  formula?: string;
  category: 'orbitals' | 'charges' | 'spectroscopy' | 'geometry';
}

export const ParameterGrid: React.FC<ParameterGridProps> = ({
  calculation,
  onUpdateDescriptor,
  onAiExtract,
  isAiLoading,
  onOpenAudit,
}) => {
  const [editingKey, setEditingKey] = useState<keyof TableS3Descriptors | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'orbitals' | 'charges' | 'spectroscopy' | 'geometry'>('all');

  const d = calculation.descriptors;
  const meta = calculation.descriptorsMeta;

  const allParameters: ParameterCardItem[] = [
    // Frontier Orbitals & Conceptual DFT
    {
      key: 'homo',
      label: 'Highest Occupied MO',
      tableS3Name: 'homo',
      unit: 'eV',
      value: d.homo,
      description: 'Energy level of HOMO',
      category: 'orbitals',
    },
    {
      key: 'lumo',
      label: 'Lowest Unoccupied MO',
      tableS3Name: 'lumo',
      unit: 'eV',
      value: d.lumo,
      description: 'Energy level of LUMO',
      category: 'orbitals',
    },
    {
      key: 'eta',
      label: 'Chemical Hardness (Gap)',
      tableS3Name: 'eta',
      unit: 'eV',
      value: d.eta,
      formula: 'LUMO - HOMO',
      description: 'Bandgap / absolute hardness',
      category: 'orbitals',
    },
    {
      key: 'mu',
      label: 'Chemical Potential',
      tableS3Name: 'mu',
      unit: 'eV',
      value: d.mu,
      formula: '(HOMO + LUMO) / 2',
      description: 'Absolute electronic chemical potential',
      category: 'orbitals',
    },
    {
      key: 'omega',
      label: 'Electrophilicity Index',
      tableS3Name: 'omega',
      unit: 'eV',
      value: d.omega,
      formula: 'mu^2 / (2 * eta)',
      description: "Parr's electrophilic index",
      category: 'orbitals',
    },

    // Charges & d-Orbitals
    {
      key: 'nbo_pd',
      label: 'NBO Charge (Pd)',
      tableS3Name: 'NBO(Pd)',
      unit: 'e',
      value: d.nbo_pd,
      description: 'Natural partial atomic charge on central Palladium',
      category: 'charges',
    },
    {
      key: 'nbo_p',
      label: 'NBO Charge (P)',
      tableS3Name: 'NBO(P)',
      unit: 'e',
      value: d.nbo_p,
      description: 'NBO charge on coordinated Phosphorus',
      category: 'charges',
    },
    {
      key: 'nbo_o',
      label: 'NBO Charge (O)',
      tableS3Name: 'NBO(O)',
      unit: 'e',
      value: d.nbo_o,
      description: 'NBO charge on sulfonate Oxygen coordinated to Pd',
      category: 'charges',
    },
    {
      key: 'nbo_s',
      label: 'NBO Charge (S)',
      tableS3Name: 'NBO(S)',
      unit: 'e',
      value: d.nbo_s,
      description: 'NBO charge on sulfonate Sulfur atom',
      category: 'charges',
    },
    {
      key: 'pd_dz2',
      label: 'Pd dz2 Occupancy',
      tableS3Name: 'Pd_dz2',
      unit: 'e',
      value: d.pd_dz2,
      description: 'Electron occupancy of dz2 orbital on Pd (NAO analysis)',
      category: 'charges',
    },
    {
      key: 'dxy',
      label: 'Pd dxy Occupancy',
      tableS3Name: 'dxy',
      unit: 'e',
      value: d.dxy,
      description: 'Electron occupancy of dxy orbital on Pd',
      category: 'charges',
    },
    {
      key: 'dxz',
      label: 'Pd dxz Occupancy',
      tableS3Name: 'dxz',
      unit: 'e',
      value: d.dxz,
      description: 'Electron occupancy of dxz orbital on Pd',
      category: 'charges',
    },
    {
      key: 'dyz',
      label: 'Pd dyz Occupancy',
      tableS3Name: 'dyz',
      unit: 'e',
      value: d.dyz,
      description: 'Electron occupancy of dyz orbital on Pd',
      category: 'charges',
    },
    {
      key: 'dx2y2',
      label: 'Pd d(x2-y2) Occupancy',
      tableS3Name: 'dx2y2',
      unit: 'e',
      value: d.dx2y2,
      description: 'Electron occupancy of d(x2-y2) orbital on Pd',
      category: 'charges',
    },

    // Spectroscopy & Polarizability
    {
      key: 'nmr_31p',
      label: '31P NMR Chemical Shift',
      tableS3Name: '31P NMR',
      unit: 'ppm',
      value: d.nmr_31p,
      description: 'NMR chemical shift of phosphorus coordinated to Pd',
      category: 'spectroscopy',
    },
    {
      key: 'ir_cc',
      label: 'IR C=C Frequency',
      tableS3Name: 'IR (C=C)',
      unit: 'cm⁻¹',
      value: d.ir_cc,
      description: 'Harmonic IR frequency of C=C double bond in ethylene',
      category: 'spectroscopy',
    },
    {
      key: 'polar1',
      label: 'Polarizability (α₁)',
      tableS3Name: 'polar1',
      unit: 'Bohr³',
      value: d.polar1,
      description: 'Dipole polarizability component 1',
      category: 'spectroscopy',
    },
    {
      key: 'polar2',
      label: 'Polarizability (α₂)',
      tableS3Name: 'polar2',
      unit: 'Bohr³',
      value: d.polar2,
      description: 'Dipole polarizability component 2',
      category: 'spectroscopy',
    },

    // Geometric Parameters
    {
      key: 'pd_c',
      label: 'Pd–C Bond Length',
      tableS3Name: 'Pd-C',
      unit: 'Å',
      value: d.pd_c,
      description: 'Bond length of Pd–C in propyl / alkyl group',
      category: 'geometry',
    },
    {
      key: 'p_pd_o',
      label: 'P–Pd–O Bite Angle',
      tableS3Name: 'P-Pd-O',
      unit: '°',
      value: d.p_pd_o,
      description: 'Chelate bite angle of P–Pd–O',
      category: 'geometry',
    },
    {
      key: 'p_c2_s',
      label: 'Pd–C(alkene) Shorter',
      tableS3Name: 'P-C2-S',
      unit: 'Å',
      value: d.p_c2_s,
      description: 'Shorter distance of Pd–C in coordinated ethylene',
      category: 'geometry',
    },
    {
      key: 'p_c2_l',
      label: 'Pd–C(alkene) Longer',
      tableS3Name: 'P-C2-L',
      unit: 'Å',
      value: d.p_c2_l,
      description: 'Longer distance of Pd–C in coordinated ethylene',
      category: 'geometry',
    },
    {
      key: 'c_c',
      label: 'C=C Bond Length',
      tableS3Name: 'C=C',
      unit: 'Å',
      value: d.c_c,
      description: 'Length of C–C double bond in coordinated ethylene',
      category: 'geometry',
    },
    {
      key: 'vbur',
      label: 'Buried Volume (%Vbur)',
      tableS3Name: 'VBur',
      unit: '%',
      value: d.vbur,
      description: 'Steric bulkiness (%Vbur in 3.5 Å sphere)',
      category: 'geometry',
    },
  ];

  const filtered =
    activeCategory === 'all'
      ? allParameters
      : allParameters.filter((p) => p.category === activeCategory);

  const startEdit = (param: ParameterCardItem) => {
    setEditingKey(param.key);
    setEditValue(param.value !== undefined ? String(param.value) : '');
  };

  const saveEdit = (key: keyof TableS3Descriptors) => {
    const val = editValue.trim() === '' ? undefined : parseFloat(editValue);
    onUpdateDescriptor(key, isNaN(val as number) ? undefined : val);
    setEditingKey(null);
  };

  return (
    <div className="space-y-6">
      {/* Overview Telemetry Ribbon */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {calculation.systemName}
              </h2>
              <span className="text-xs font-mono text-slate-500">
                ({calculation.calcType === 'complex' ? 'Catalyst Complex' : 'Free Ligand'})
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-mono">
              <span>{calculation.fileName}</span>
              <span aria-hidden="true">·</span>
              <span>{calculation.functionalBasis || 'DFT/ORCA'}</span>
              <span aria-hidden="true">·</span>
              <span>{calculation.coordinates.length} Atoms</span>
              <span aria-hidden="true">·</span>
              <span>{calculation.isConverged ? 'Opt Converged' : 'Single Point'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onOpenAudit('pd_c')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-600" />
              Audit Parsing Matches
            </button>
            <button
              onClick={onAiExtract}
              disabled={isAiLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
              {isAiLoading ? 'AI Validating...' : 'AI Verify & Fill Gaps'}
            </button>
          </div>
        </div>

        {/* Conceptual DFT & Thermochemistry KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100">
          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">HOMO (eV)</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {d.homo !== undefined ? d.homo.toFixed(3) : '—'}
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">LUMO (eV)</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {d.lumo !== undefined ? d.lumo.toFixed(3) : '—'}
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Gap η (eV)</div>
            <div className="text-lg font-bold font-mono tabular-nums text-blue-600 mt-0.5">
              {d.eta !== undefined ? d.eta.toFixed(3) : '—'}
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Potential μ (eV)</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {d.mu !== undefined ? d.mu.toFixed(3) : '—'}
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Electrophilicity ω</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {d.omega !== undefined ? d.omega.toFixed(3) : '—'}
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Energy</div>
            <div className="text-sm font-semibold font-mono tabular-nums text-slate-800 mt-1 truncate" title={`${calculation.totalEnergyHartree || 0} Eh`}>
              {calculation.totalEnergyHartree ? `${calculation.totalEnergyHartree.toFixed(4)} Eh` : '—'}
            </div>
          </div>
        </div>

        {calculation.aiNotes && (
          <div className="mt-3 p-2.5 bg-blue-50/60 border border-blue-100 rounded-lg text-xs text-blue-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">AI Validation Audit: </span>
              {calculation.aiNotes}
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Parameters ({allParameters.length})
          </button>
          <button
            onClick={() => setActiveCategory('orbitals')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeCategory === 'orbitals'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Frontier Orbitals (5)
          </button>
          <button
            onClick={() => setActiveCategory('charges')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeCategory === 'charges'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            NBO &amp; d-Orbitals (9)
          </button>
          <button
            onClick={() => setActiveCategory('spectroscopy')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeCategory === 'spectroscopy'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Spectroscopy &amp; Polar. (4)
          </button>
          <button
            onClick={() => setActiveCategory('geometry')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeCategory === 'geometry'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3D Geometry &amp; Bite Angle (6)
          </button>
        </div>

        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
          Exact Table S3 field names &amp; units
        </span>
      </div>

      {/* Parameter Cards Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((param) => {
          const itemMeta = meta[param.key];
          const hasValue = param.value !== undefined;
          const isEditing = editingKey === param.key;

          return (
            <div
              key={param.key}
              className={`bg-white border rounded-xl p-4 transition-all hover:border-slate-300 shadow-xs flex flex-col justify-between ${
                hasValue ? 'border-slate-200' : 'border-dashed border-slate-300 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50/70 px-1.5 py-0.5 rounded">
                    {param.tableS3Name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {itemMeta?.method && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {itemMeta.method}
                      </span>
                    )}
                    <button
                      onClick={() => (isEditing ? saveEdit(param.key) : startEdit(param))}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                      title={isEditing ? 'Save' : 'Edit parameter'}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="text-xs font-medium text-slate-800">
                  {param.label}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {param.description}
                  {param.formula && (
                    <span className="block font-mono text-[10px] text-slate-400 mt-0.5">
                      Formula: {param.formula}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                {isEditing ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      type="number"
                      step="any"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(param.key);
                        if (e.key === 'Escape') setEditingKey(null);
                      }}
                      className="w-full px-2 py-1 font-mono text-sm border border-blue-400 rounded outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => saveEdit(param.key)}
                      className="px-2 py-1 text-xs text-white bg-blue-600 rounded"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                      {hasValue ? param.value : <span className="text-slate-300 text-lg">Not in log</span>}
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-400 ml-1.5">
                      {param.unit}
                    </span>
                  </>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => onOpenAudit(param.key)}
                  className="font-mono text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Click to view exact line numbers and surrounding raw text context"
                >
                  <FileCode className="w-3 h-3 text-blue-500" />
                  {itemMeta?.sourceLine ? `Line #${itemMeta.sourceLine}` : 'Audit Source'}
                </button>

                {itemMeta?.ruleDescription ? (
                  <span className="text-[10px] text-slate-400 font-sans truncate max-w-[150px]" title={itemMeta.ruleDescription}>
                    {itemMeta.ruleDescription}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {itemMeta?.method || 'auto'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
