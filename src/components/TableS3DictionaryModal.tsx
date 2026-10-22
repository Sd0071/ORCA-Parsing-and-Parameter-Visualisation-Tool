/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, BookOpen, ExternalLink, ShieldCheck } from 'lucide-react';

interface DictionaryEntry {
  symbol: string;
  name: string;
  unit: string;
  category: 'Frontier Orbitals' | 'Charges & NAO' | 'Spectroscopy' | 'Geometry & Sterics' | 'Deltas';
  paperRole: string;
  orcaExtraction: string;
}

export const TABLE_S3_DICTIONARY: DictionaryEntry[] = [
  {
    symbol: 'homo',
    name: 'Energy level of Highest Occupied Molecular Orbital',
    unit: 'eV / Hartree',
    category: 'Frontier Orbitals',
    paperRole: 'Governs nucleophilicity and ligand electron-donating power.',
    orcaExtraction: 'ORBITAL ENERGIES block (last orbital with occupancy 2.0000).',
  },
  {
    symbol: 'lumo',
    name: 'Energy level of Lowest Unoccupied Molecular Orbital',
    unit: 'eV / Hartree',
    category: 'Frontier Orbitals',
    paperRole: 'Dictates electron acceptance ability during olefin coordination.',
    orcaExtraction: 'ORBITAL ENERGIES block (first orbital with occupancy 0.0000).',
  },
  {
    symbol: 'eta',
    name: 'Chemical hardness (HOMO-LUMO gap)',
    unit: 'eV',
    category: 'Frontier Orbitals',
    paperRole: 'Resistance against electron transfer / chemical stability indicator.',
    orcaExtraction: 'Calculated: LUMO (eV) - HOMO (eV).',
  },
  {
    symbol: 'mu',
    name: 'Absolute chemical potential',
    unit: 'eV',
    category: 'Frontier Orbitals',
    paperRole: 'Correlates positively with molecular weight (MW) in copolymerization (Figure S5d).',
    orcaExtraction: 'Calculated: (HOMO + LUMO) / 2.',
  },
  {
    symbol: 'omega',
    name: 'Electrophilic index',
    unit: 'eV',
    category: 'Frontier Orbitals',
    paperRole: "Measures overall electrophilicity power according to Parr's conceptual DFT.",
    orcaExtraction: 'Calculated: mu^2 / (2 * eta).',
  },
  {
    symbol: 'NBO(Pd)',
    name: 'NBO partial charge on central Palladium',
    unit: 'e (electrons)',
    category: 'Charges & NAO',
    paperRole: 'Decreasing charge on Pd correlates to higher MW; higher charge increases polymerization activity (Figure S4a,d, S13).',
    orcaExtraction: 'Summary of Natural Population Analysis (NPA) or Loewdin atomic charge on Pd.',
  },
  {
    symbol: 'NBO(P)',
    name: 'NBO charge on coordinated Phosphorus',
    unit: 'e',
    category: 'Charges & NAO',
    paperRole: 'Captures phosphine donor capability and ligand backbonding.',
    orcaExtraction: 'NPA charge on coordinated P atom.',
  },
  {
    symbol: 'NBO(O)',
    name: 'NBO charge on sulfonate Oxygen',
    unit: 'e',
    category: 'Charges & NAO',
    paperRole: 'Monitors the electronic polarization of the sulfonate chelate oxygen atom.',
    orcaExtraction: 'NPA charge on coordinating sulfonate O.',
  },
  {
    symbol: 'NBO(S)',
    name: 'NBO charge on Sulfonate Sulfur',
    unit: 'e',
    category: 'Charges & NAO',
    paperRole: 'Ranked as 3rd strongest coefficient in LASSO regression for copolymerization (Table S4).',
    orcaExtraction: 'NPA charge on sulfonate S atom.',
  },
  {
    symbol: 'polar1, polar2',
    name: 'Dipole polarizability components',
    unit: 'Bohr³',
    category: 'Spectroscopy',
    paperRole: 'Reflects electronic cloud deformability under electric fields and non-covalent interactions.',
    orcaExtraction: 'THE POLARIZABILITY TENSOR block in ORCA.',
  },
  {
    symbol: '31P NMR',
    name: '31P NMR chemical shift / isotropic shielding',
    unit: 'ppm',
    category: 'Spectroscopy',
    paperRole: 'Shows maximum catalytic activity around -30 ppm (Figure S4c); highest LASSO coefficient for copolymerization (Table S5).',
    orcaExtraction: 'CHEMICAL SHIELDINGS / EPR/NMR block for P nucleus.',
  },
  {
    symbol: 'Pd_dz2',
    name: 'Occupancy of dz2 orbital in Pd',
    unit: 'e',
    category: 'Charges & NAO',
    paperRole: 'Decreasing dz2 occupancy increases both polymer MW and activity (Figure S4f,g).',
    orcaExtraction: 'NATURAL ATOMIC ORBITAL (NAO) 4d breakdown on Pd.',
  },
  {
    symbol: 'dxy, dxz, dyz, dx2y2',
    name: 'Occupancies of other d-orbitals in Pd',
    unit: 'e',
    category: 'Charges & NAO',
    paperRole: 'Fine-grained metal electronic state descriptors selected by LASSO and Random Forest (Table S5).',
    orcaExtraction: 'NAO 4d orbital breakdown for Pd.',
  },
  {
    symbol: 'IR (C=C)',
    name: 'Harmonic IR frequency of coordinated C=C',
    unit: 'cm⁻¹',
    category: 'Spectroscopy',
    paperRole: 'Direct spectroscopic measure of back-donation weakening the ethylene double bond.',
    orcaExtraction: 'VIBRATIONAL FREQUENCIES mode between 1500 - 1620 cm^-1.',
  },
  {
    symbol: 'Pd-C',
    name: 'Bond length of Pd–C in propyl group',
    unit: 'Å',
    category: 'Geometry & Sterics',
    paperRole: 'Ground-state bond length for chain propagation migratory insertion.',
    orcaExtraction: 'Euclidean distance d(Pd, C_alkyl) from optimized Cartesian coordinates.',
  },
  {
    symbol: 'P-Pd-O',
    name: 'Chelate bite angle',
    unit: '° (degrees)',
    category: 'Geometry & Sterics',
    paperRole: 'Larger bite angle increases catalytic activity by accelerating migratory insertion through steric repulsion (Figure S5f).',
    orcaExtraction: 'Vector angle between Pd-P and Pd-O bonds.',
  },
  {
    symbol: 'P-C2-S, P-C2-L',
    name: 'Shorter and longer Pd–C distances in coordinated ethylene',
    unit: 'Å',
    category: 'Geometry & Sterics',
    paperRole: 'Asymmetry of coordinated ethylene reflection of trans-influence (P vs O).',
    orcaExtraction: 'Sorted Pd-C distances for the two alkene carbon atoms.',
  },
  {
    symbol: 'C=C',
    name: 'Length of coordinated ethylene C=C bond',
    unit: 'Å',
    category: 'Geometry & Sterics',
    paperRole: 'Elongation reflects activation degree prior to insertion.',
    orcaExtraction: 'Distance between the two alkene carbons.',
  },
  {
    symbol: 'VBur',
    name: 'Buried volume (%Vbur) & Octants',
    unit: '%',
    category: 'Geometry & Sterics',
    paperRole: 'Higher %Vbur increases MW by retarding chelate formation (Figure S5b,h).',
    orcaExtraction: 'Steric profile of coordination sphere (radius 3.5 Å).',
  },
  {
    symbol: 'D_XXX',
    name: 'Coordination Delta Descriptors (Complex - Ligand)',
    unit: 'matching',
    category: 'Deltas',
    paperRole: 'D_31P NMR, D_NBO(P), D_NBO(O), D_homo directly capture the electronic reorganization upon binding.',
    orcaExtraction: 'Computed by taking (Descriptor in Complex) - (Descriptor in Free Ligand).',
  },
];

export const TableS3DictionaryModal: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');

  const filtered = TABLE_S3_DICTIONARY.filter((entry) => {
    const matchesSearch =
      entry.symbol.toLowerCase().includes(search.toLowerCase()) ||
      entry.name.toLowerCase().includes(search.toLowerCase()) ||
      entry.paperRole.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === 'all' || entry.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Table S3 Parameter Dictionary &amp; Physical Definitions
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reference definitions and machine learning insights from Akita et al. (<em>Organometallics</em> 2022 / Ethylene/MA Copolymerization Study).
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search descriptor or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
            <tr>
              <th className="py-2.5 px-3 font-mono">Symbol</th>
              <th className="py-2.5 px-3">Parameter Name &amp; Description</th>
              <th className="py-2.5 px-3">Unit</th>
              <th className="py-2.5 px-3">Catalytic Significance in Paper</th>
              <th className="py-2.5 px-3">ORCA Extraction Logic</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((entry) => (
              <tr key={entry.symbol} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-2.5 px-3 font-mono font-bold text-blue-600 whitespace-nowrap">
                  {entry.symbol}
                </td>
                <td className="py-2.5 px-3 text-slate-800 font-medium max-w-xs">
                  {entry.name}
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                  {entry.unit}
                </td>
                <td className="py-2.5 px-3 text-slate-600 leading-relaxed max-w-sm">
                  {entry.paperRole}
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px] max-w-xs leading-relaxed">
                  {entry.orcaExtraction}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
