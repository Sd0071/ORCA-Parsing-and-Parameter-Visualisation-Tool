/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  FileCode,
  Check,
  Compass,
  Activity,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
  RefreshCw,
} from 'lucide-react';
import { CoordinationAssignment, OrcaCalculation, TableS3Descriptors } from '../types/orca';
import { distance, recalculateGeometryWithCustomAtoms } from '../utils/geometryCalc';

interface ParsingAuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  calculation: OrcaCalculation;
  activeParamKey: keyof TableS3Descriptors;
  onSelectParamKey: (key: keyof TableS3Descriptors) => void;
  onUpdateDescriptor: (key: keyof TableS3Descriptors, value: number | undefined) => void;
  onUpdateCoordination: (calcId: string, assignment: CoordinationAssignment) => void;
}

const DESCRIPTOR_LABELS: Record<keyof TableS3Descriptors, { name: string; symbol: string; unit: string }> = {
  homo: { name: 'Highest Occupied MO', symbol: 'homo', unit: 'eV' },
  homo_hartree: { name: 'HOMO (Hartrees)', symbol: 'homo (Eh)', unit: 'Eh' },
  lumo: { name: 'Lowest Unoccupied MO', symbol: 'lumo', unit: 'eV' },
  lumo_hartree: { name: 'LUMO (Hartrees)', symbol: 'lumo (Eh)', unit: 'Eh' },
  eta: { name: 'Chemical Hardness (Gap)', symbol: 'eta', unit: 'eV' },
  mu: { name: 'Chemical Potential', symbol: 'mu', unit: 'eV' },
  omega: { name: 'Electrophilicity Index', symbol: 'omega', unit: 'eV' },
  nbo_pd: { name: 'NBO Charge on Palladium', symbol: 'NBO(Pd)', unit: 'e' },
  nbo_p: { name: 'NBO Charge on Phosphorus', symbol: 'NBO(P)', unit: 'e' },
  nbo_o: { name: 'NBO Charge on Coordinated Oxygen', symbol: 'NBO(O)', unit: 'e' },
  nbo_s: { name: 'NBO Charge on Sulfonate Sulfur', symbol: 'NBO(S)', unit: 'e' },
  polar1: { name: 'Polarizability Component 1', symbol: 'polar1', unit: 'Bohr³' },
  polar2: { name: 'Polarizability Component 2', symbol: 'polar2', unit: 'Bohr³' },
  polar_iso: { name: 'Isotropic Polarizability', symbol: 'polar_iso', unit: 'Bohr³' },
  nmr_31p: { name: '31P NMR Chemical Shift', symbol: '31P NMR', unit: 'ppm' },
  ir_cc: { name: 'Coordinated C=C IR Frequency', symbol: 'IR (C=C)', unit: 'cm⁻¹' },
  pd_dz2: { name: 'Palladium dz2 Occupancy', symbol: 'Pd_dz2', unit: 'e' },
  dxy: { name: 'Palladium dxy Occupancy', symbol: 'dxy', unit: 'e' },
  dxz: { name: 'Palladium dxz Occupancy', symbol: 'dxz', unit: 'e' },
  dyz: { name: 'Palladium dyz Occupancy', symbol: 'dyz', unit: 'e' },
  dx2y2: { name: 'Palladium d(x2-y2) Occupancy', symbol: 'dx2y2', unit: 'e' },
  p_lp: { name: 'Phosphorus Lone Pair Energy', symbol: 'P_LP', unit: 'eV' },
  o_lp: { name: 'Oxygen Lone Pair Occupancy', symbol: 'O_LP', unit: 'e' },
  o_e: { name: 'Oxygen Lone Pair Energy', symbol: 'O_E', unit: 'eV' },
  pd_c: { name: 'Pd–C Bond Length in Propyl', symbol: 'Pd-C', unit: 'Å' },
  p_pd_o: { name: 'P–Pd–O Bite Angle', symbol: 'P-Pd-O', unit: '°' },
  p_c2_s: { name: 'Shorter Pd–C(alkene) Distance', symbol: 'P-C2-S', unit: 'Å' },
  p_c2_l: { name: 'Longer Pd–C(alkene) Distance', symbol: 'P-C2-L', unit: 'Å' },
  c_c: { name: 'Coordinated C=C Bond Length', symbol: 'C=C', unit: 'Å' },
  vbur: { name: 'Buried Volume (%Vbur)', symbol: 'VBur', unit: '%' },
  sterimol_l_av: { name: 'Sterimol L Average', symbol: 'L_av', unit: 'Å' },
  sterimol_b1_av: { name: 'Sterimol B1 Average', symbol: 'B1_av', unit: 'Å' },
  sterimol_b5_av: { name: 'Sterimol B5 Average', symbol: 'B5_av', unit: 'Å' },
  sterimol_l_diff: { name: 'Sterimol L Difference', symbol: 'L_diff', unit: 'Å' },
  sterimol_b1_diff: { name: 'Sterimol B1 Difference', symbol: 'B1_diff', unit: 'Å' },
  sterimol_b5_diff: { name: 'Sterimol B5 Difference', symbol: 'B5_diff', unit: 'Å' },
  vmin_1: { name: 'Electrostatic Potential Vmin', symbol: 'vmin_1', unit: 'V' },
  vmin_2: { name: 'Distance to Vmin', symbol: 'vmin_2', unit: 'Å' },
};

export const ParsingAuditDrawer: React.FC<ParsingAuditDrawerProps> = ({
  isOpen,
  onClose,
  calculation,
  activeParamKey,
  onSelectParamKey,
  onUpdateDescriptor,
  onUpdateCoordination,
}) => {
  const [activeTab, setActiveTab] = useState<'provenance' | 'geometry' | 'modes'>('provenance');
  const [editValue, setEditValue] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  // Local state for interactive atom assignment
  const [assign, setAssign] = useState<CoordinationAssignment>(calculation.coordination || {});

  if (!isOpen) return null;

  const meta = calculation.descriptorsMeta[activeParamKey];
  const value = calculation.descriptors[activeParamKey];
  const labelInfo = DESCRIPTOR_LABELS[activeParamKey] || {
    name: activeParamKey,
    symbol: activeParamKey,
    unit: '',
  };

  const handleSaveValue = () => {
    const val = editValue.trim() === '' ? undefined : parseFloat(editValue);
    onUpdateDescriptor(activeParamKey, isNaN(val as number) ? undefined : val);
    setIsEditing(false);
  };

  // Geometry atoms
  const coords = calculation.coordinates;
  const pdAtom = coords.find((a) => a.index === assign.pdIndex) || coords.find((a) => a.symbol.toUpperCase() === 'PD');
  const oxygenCandidates = pdAtom
    ? coords
        .filter((a) => a.symbol.toUpperCase() === 'O')
        .map((a) => ({ atom: a, dist: distance(pdAtom, a) }))
        .sort((a, b) => a.dist - b.dist)
    : [];
  const carbonCandidates = pdAtom
    ? coords
        .filter((a) => a.symbol.toUpperCase() === 'C')
        .map((a) => ({ atom: a, dist: distance(pdAtom, a) }))
        .sort((a, b) => a.dist - b.dist)
    : [];
  const phosphorusCandidates = pdAtom
    ? coords
        .filter((a) => a.symbol.toUpperCase() === 'P')
        .map((a) => ({ atom: a, dist: distance(pdAtom, a) }))
        .sort((a, b) => a.dist - b.dist)
    : [];

  const handleApplyCustomGeometry = () => {
    const newGeom = recalculateGeometryWithCustomAtoms(coords, assign);
    onUpdateCoordination(calculation.id, assign);
    if (newGeom.pd_c !== undefined) onUpdateDescriptor('pd_c', newGeom.pd_c);
    if (newGeom.p_pd_o !== undefined) onUpdateDescriptor('p_pd_o', newGeom.p_pd_o);
    if (newGeom.p_c2_s !== undefined) onUpdateDescriptor('p_c2_s', newGeom.p_c2_s);
    if (newGeom.p_c2_l !== undefined) onUpdateDescriptor('p_c2_l', newGeom.p_c2_l);
    if (newGeom.c_c !== undefined) onUpdateDescriptor('c_c', newGeom.c_c);
  };

  const isGeomParam = ['pd_c', 'p_pd_o', 'p_c2_s', 'p_c2_l', 'c_c'].includes(activeParamKey);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {labelInfo.symbol}
              </span>
              <h2 className="text-sm font-bold text-slate-900">{labelInfo.name}</h2>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              Calculation: {calculation.systemName} · {calculation.fileName}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Parameter Switcher Strip */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold text-slate-600">Inspect Parameter:</span>
          <select
            value={activeParamKey}
            onChange={(e) => onSelectParamKey(e.target.value as keyof TableS3Descriptors)}
            className="text-xs bg-white border border-slate-300 rounded px-2.5 py-1 font-mono focus:ring-1 focus:ring-blue-500 outline-none"
          >
            {Object.keys(DESCRIPTOR_LABELS).map((k) => (
              <option key={k} value={k}>
                {DESCRIPTOR_LABELS[k as keyof TableS3Descriptors]?.symbol} — {DESCRIPTOR_LABELS[k as keyof TableS3Descriptors]?.name}
              </option>
            ))}
          </select>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white">
          <button
            onClick={() => setActiveTab('provenance')}
            className={`py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer mr-5 ${
              activeTab === 'provenance'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Exact Source Lines
          </button>
          <button
            onClick={() => setActiveTab('geometry')}
            className={`py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer mr-5 ${
              activeTab === 'geometry'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Coordination Atoms {isGeomParam && '★'}
          </button>
          <button
            onClick={() => setActiveTab('modes')}
            className={`py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'modes'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Vibrational Modes ({calculation.vibrationalModes?.length || 0})
          </button>
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: Exact Source Provenance */}
          {activeTab === 'provenance' && (
            <div className="space-y-4">
              {/* Value Summary Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500 uppercase font-semibold tracking-wider">
                    Extracted Value
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5 tabular-nums">
                    {value !== undefined ? (
                      <>
                        {value} <span className="text-xs font-normal text-slate-500">{labelInfo.unit}</span>
                      </>
                    ) : (
                      <span className="text-slate-400 text-base">Not Detected in Log</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-mono text-slate-400">
                    Confidence: <span className="text-blue-600 font-semibold">{meta?.confidence || 'regex'}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    Source Line: <span className="font-bold text-slate-800">#{meta?.sourceLine || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Parsing Rule Description */}
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg text-xs text-blue-950 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Extraction Rule: </span>
                  {meta?.ruleDescription || 'Extracted via regex pattern matching on the primary ORCA log section.'}
                  {meta?.blockName && (
                    <span className="block text-[11px] font-mono text-blue-700 mt-0.5">
                      Target Block: [{meta.blockName}]
                    </span>
                  )}
                </div>
              </div>

              {/* Exact Surrounding Log Context */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-slate-500" />
                    Exact Log Snippet (Highlighted Match)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Target line #{meta?.sourceLine || '—'}
                  </span>
                </div>

                {meta?.contextLines && meta.contextLines.length > 0 ? (
                  <div className="p-3 bg-slate-950 text-slate-300 font-mono text-[11px] rounded-lg overflow-x-auto leading-relaxed border border-slate-800">
                    {meta.contextLines.map((cl) => (
                      <div
                        key={cl.lineNum}
                        className={`flex items-start gap-3 px-1 py-0.5 rounded ${
                          cl.isTarget ? 'bg-amber-500/20 text-amber-300 font-bold border-l-2 border-amber-400 pl-1.5' : ''
                        }`}
                      >
                        <span className="text-slate-600 select-none w-8 text-right shrink-0">
                          {cl.lineNum}
                        </span>
                        <span className="whitespace-pre-wrap">{cl.text || ' '}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-900 text-slate-300 font-mono text-xs rounded-lg">
                    {meta?.rawSnippet || 'No raw context lines captured for this calculated descriptor.'}
                  </div>
                )}
              </div>

              {/* Manual Adjustment */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-800">Manual Value Override</span>
                  {!isEditing && (
                    <button
                      onClick={() => {
                        setEditValue(value !== undefined ? String(value) : '');
                        setIsEditing(true);
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Override Value
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      placeholder={`Enter custom ${labelInfo.symbol}...`}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs font-mono border border-blue-400 rounded-lg outline-none"
                    />
                    <button
                      onClick={handleSaveValue}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    If this value differs from your expected manual reading, you can override it above.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Coordination Atoms & Geometry Selector */}
          {activeTab === 'geometry' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                <p className="font-semibold text-slate-900 mb-1">
                  Coordinating Sphere Validation (Final Converged Geometry):
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Calculated from the final Cartesian coordinate block ({calculation.coordinates.length} atoms).
                  If your catalyst has multiple oxygens (e.g. methoxy vs sulfonate) or carbons, pick the coordinating atoms below to recalculate Table S3 bond lengths and bite angle automatically.
                </p>
              </div>

              {/* Assignment Form */}
              <div className="space-y-3 bg-white border border-slate-200 rounded-xl p-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transition Metal Center (Pd)
                  </label>
                  <div className="font-mono text-xs text-slate-900 bg-slate-100 px-2.5 py-1.5 rounded">
                    {pdAtom ? `Atom #${pdAtom.index} (${pdAtom.symbol}) at [${pdAtom.x.toFixed(3)}, ${pdAtom.y.toFixed(3)}, ${pdAtom.z.toFixed(3)}]` : 'None detected'}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Coordinated Phosphorus (P) for Bite Angle
                  </label>
                  <select
                    value={assign.pIndex || ''}
                    onChange={(e) => setAssign({ ...assign, pIndex: parseInt(e.target.value, 10) })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                  >
                    {phosphorusCandidates.map((c) => (
                      <option key={c.atom.index} value={c.atom.index}>
                        P #{c.atom.index} — Distance to Pd: {c.dist.toFixed(3)} Å
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Coordinated Sulfonate Oxygen (O) for P–Pd–O Bite Angle
                  </label>
                  <select
                    value={assign.oIndex || ''}
                    onChange={(e) => setAssign({ ...assign, oIndex: parseInt(e.target.value, 10) })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                  >
                    {oxygenCandidates.map((c) => (
                      <option key={c.atom.index} value={c.atom.index}>
                        O #{c.atom.index} — Distance to Pd: {c.dist.toFixed(3)} Å {c.dist < 2.4 ? '(Directly Coordinated)' : '(Distal/Methoxy)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Propyl / Alkyl Carbon (for Pd–C bond length)
                  </label>
                  <select
                    value={assign.cAlkylIndex || ''}
                    onChange={(e) => setAssign({ ...assign, cAlkylIndex: parseInt(e.target.value, 10) })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                  >
                    {carbonCandidates.slice(0, 8).map((c) => (
                      <option key={c.atom.index} value={c.atom.index}>
                        C #{c.atom.index} — Distance to Pd: {c.dist.toFixed(3)} Å
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Alkene C₁ (Ethylene)
                    </label>
                    <select
                      value={assign.cAlkene1Index || ''}
                      onChange={(e) => setAssign({ ...assign, cAlkene1Index: parseInt(e.target.value, 10) })}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                    >
                      {carbonCandidates.slice(0, 8).map((c) => (
                        <option key={c.atom.index} value={c.atom.index}>
                          C #{c.atom.index} ({c.dist.toFixed(3)} Å)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Alkene C₂ (Ethylene)
                    </label>
                    <select
                      value={assign.cAlkene2Index || ''}
                      onChange={(e) => setAssign({ ...assign, cAlkene2Index: parseInt(e.target.value, 10) })}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                    >
                      {carbonCandidates.slice(0, 8).map((c) => (
                        <option key={c.atom.index} value={c.atom.index}>
                          C #{c.atom.index} ({c.dist.toFixed(3)} Å)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleApplyCustomGeometry}
                  className="w-full mt-3 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Recalculate Table S3 Geometric Descriptors
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Vibrational Normal Modes Selector */}
          {activeTab === 'modes' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                <p className="font-semibold text-slate-900 mb-1">
                  Vibrational Modes &amp; Coordinated C=C Stretch:
                </p>
                <p className="text-[11px] text-slate-600">
                  Ethylene coordinated to Pd exhibits a weakened ν(C=C) stretch between 1490 and 1640 cm⁻¹.
                  Select the exact mode corresponding to your coordinated alkene stretch below:
                </p>
              </div>

              {calculation.vibrationalModes && calculation.vibrationalModes.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="py-2 px-3">Mode #</th>
                        <th className="py-2 px-3">Frequency</th>
                        <th className="py-2 px-3">IR Intensity</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {calculation.vibrationalModes
                        .filter((m) => m.frequency >= 1300 && m.frequency <= 1800)
                        .map((m) => {
                          const isCurrent = calculation.descriptors.ir_cc === m.frequency;
                          return (
                            <tr
                              key={m.modeNumber}
                              className={`hover:bg-slate-50 ${isCurrent ? 'bg-blue-50/70 font-bold' : ''}`}
                            >
                              <td className="py-2 px-3">#{m.modeNumber}</td>
                              <td className="py-2 px-3 text-blue-700">
                                {m.frequency.toFixed(2)} cm⁻¹
                              </td>
                              <td className="py-2 px-3 text-slate-500">
                                {m.irIntensity !== undefined ? `${m.irIntensity.toFixed(2)} km/mol` : '—'}
                              </td>
                              <td className="py-2 px-3 text-right font-sans">
                                {isCurrent ? (
                                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center justify-end gap-1">
                                    <Check className="w-3.5 h-3.5" /> Selected
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => onUpdateDescriptor('ir_cc', m.frequency)}
                                    className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                                  >
                                    Set as Table S3 IR
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No vibrational frequencies detected in this calculation log (requires ! Freq run).
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Table S3 Audit Pipeline · Ready for Export
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
