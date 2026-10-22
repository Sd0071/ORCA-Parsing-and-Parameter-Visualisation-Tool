/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeltaDescriptors, OrcaCalculation } from '../types/orca';

export interface CsvColumnDef {
  key: string;
  header: string;
  description: string;
  unit: string;
  enabled: boolean;
}

export const DEFAULT_TABLE_S3_COLUMNS: CsvColumnDef[] = [
  { key: 'systemName', header: 'Name', description: 'Catalyst / Complex Identifier', unit: '', enabled: true },
  { key: 'calcType', header: 'Type', description: 'Calculation species (Complex or Ligand)', unit: '', enabled: true },
  { key: 'homo', header: 'homo', description: 'Energy level of HOMO', unit: 'eV', enabled: true },
  { key: 'lumo', header: 'lumo', description: 'Energy level of LUMO', unit: 'eV', enabled: true },
  { key: 'eta', header: 'eta', description: 'Chemical hardness (LUMO - HOMO)', unit: 'eV', enabled: true },
  { key: 'mu', header: 'mu', description: 'Absolute chemical potential (HOMO+LUMO)/2', unit: 'eV', enabled: true },
  { key: 'omega', header: 'omega', description: 'Electrophilic index (mu^2 / 2*eta)', unit: 'eV', enabled: true },
  { key: 'nbo_pd', header: 'NBO(Pd)', description: 'NBO charge on Pd', unit: 'e', enabled: true },
  { key: 'nbo_p', header: 'NBO(P)', description: 'NBO charge on P', unit: 'e', enabled: true },
  { key: 'nbo_o', header: 'NBO(O)', description: 'NBO charge on O coordinated', unit: 'e', enabled: true },
  { key: 'nbo_s', header: 'NBO(S)', description: 'NBO charge on S', unit: 'e', enabled: true },
  { key: 'polar1', header: 'polar1', description: 'Polarizability eigenvalue 1', unit: 'Bohr^3', enabled: true },
  { key: 'polar2', header: 'polar2', description: 'Polarizability eigenvalue 2', unit: 'Bohr^3', enabled: true },
  { key: 'nmr_31p', header: '31P NMR', description: 'NMR chemical shift of P atom', unit: 'ppm', enabled: true },
  { key: 'pd_dz2', header: 'Pd_dz2', description: 'Occupancy of dz2 orbital in Pd', unit: 'e', enabled: true },
  { key: 'dxy', header: 'dxy', description: 'Occupancy of dxy orbital in Pd', unit: 'e', enabled: true },
  { key: 'dxz', header: 'dxz', description: 'Occupancy of dxz orbital in Pd', unit: 'e', enabled: true },
  { key: 'dyz', header: 'dyz', description: 'Occupancy of dyz orbital in Pd', unit: 'e', enabled: true },
  { key: 'dx2y2', header: 'dx2y2', description: 'Occupancy of d(x2-y2) orbital in Pd', unit: 'e', enabled: true },
  { key: 'ir_cc', header: 'IR (C=C)', description: 'IR frequency of C=C double bond', unit: 'cm^-1', enabled: true },
  { key: 'pd_c', header: 'Pd-C', description: 'Bond length of Pd-C in propyl group', unit: 'A', enabled: true },
  { key: 'p_pd_o', header: 'P-Pd-O', description: 'Angle of P-Pd-O', unit: 'deg', enabled: true },
  { key: 'p_c2_s', header: 'P-C2-S', description: 'Shorter length of Pd-C in ethylene', unit: 'A', enabled: true },
  { key: 'p_c2_l', header: 'P-C2-L', description: 'Longer length of Pd-C in ethylene', unit: 'A', enabled: true },
  { key: 'c_c', header: 'C=C', description: 'Length of C-C double bond in ethylene', unit: 'A', enabled: true },
  { key: 'vbur', header: 'VBur', description: 'Buried volume %Vbur', unit: '%', enabled: true },
  { key: 'totalEnergyHartree', header: 'Total_Energy', description: 'Final single point electronic energy', unit: 'Hartree', enabled: false },
  { key: 'dipoleMomentDebye', header: 'Dipole', description: 'Dipole moment magnitude', unit: 'Debye', enabled: false },
];

export function computeDelta(complex: OrcaCalculation, ligand: OrcaCalculation): DeltaDescriptors {
  const cDesc = complex.descriptors;
  const lDesc = ligand.descriptors;

  const diff = (a?: number, b?: number) => (a !== undefined && b !== undefined ? parseFloat((a - b).toFixed(4)) : undefined);

  return {
    complexId: complex.id,
    ligandId: ligand.id,
    complexName: complex.systemName,
    ligandName: ligand.systemName,
    d_homo: diff(cDesc.homo, lDesc.homo),
    d_lumo: diff(cDesc.lumo, lDesc.lumo),
    d_mu: diff(cDesc.mu, lDesc.mu),
    d_eta: diff(cDesc.eta, lDesc.eta),
    d_omega: diff(cDesc.omega, lDesc.omega),
    d_nbo_p: diff(cDesc.nbo_p, lDesc.nbo_p),
    d_nbo_o: diff(cDesc.nbo_o, lDesc.nbo_o),
    d_nbo_s: diff(cDesc.nbo_s, lDesc.nbo_s),
    d_polar1: diff(cDesc.polar1, lDesc.polar1),
    d_polar2: diff(cDesc.polar2, lDesc.polar2),
    d_nmr_31p: diff(cDesc.nmr_31p, lDesc.nmr_31p),
  };
}

export function generateTableS3Csv(
  calculations: OrcaCalculation[],
  columns: CsvColumnDef[] = DEFAULT_TABLE_S3_COLUMNS,
  deltaList?: DeltaDescriptors[]
): string {
  const activeCols = columns.filter((c) => c.enabled);

  // Determine if delta columns should be appended
  const hasDeltas = deltaList && deltaList.length > 0;
  const deltaHeaders = hasDeltas
    ? ['D_homo', 'D_lumo', 'D_mu', 'D_eta', 'D_omega', 'D_NBO(P)', 'D_NBO(O)', 'D_NBO(S)', 'D_polar1', 'D_polar2', 'D_31P NMR']
    : [];

  const headers = [...activeCols.map((c) => escapeCsv(c.header)), ...deltaHeaders];
  const rows: string[] = [headers.join(',')];

  for (const calc of calculations) {
    const d = calc.descriptors;
    const values: (string | number | undefined)[] = activeCols.map((c) => {
      switch (c.key) {
        case 'systemName':
          return calc.systemName;
        case 'calcType':
          return calc.calcType;
        case 'totalEnergyHartree':
          return calc.totalEnergyHartree;
        case 'dipoleMomentDebye':
          return calc.dipoleMomentDebye;
        default:
          return (d as Record<string, unknown>)[c.key] as number | string | undefined;
      }
    });

    // Check if this calc has a paired delta
    const delta = hasDeltas ? deltaList.find((dl) => dl.complexId === calc.id) : undefined;
    if (hasDeltas) {
      if (delta) {
        values.push(delta.d_homo);
        values.push(delta.d_lumo);
        values.push(delta.d_mu);
        values.push(delta.d_eta);
        values.push(delta.d_omega);
        values.push(delta.d_nbo_p);
        values.push(delta.d_nbo_o);
        values.push(delta.d_nbo_s);
        values.push(delta.d_polar1);
        values.push(delta.d_polar2);
        values.push(delta.d_nmr_31p);
      } else {
        // Empty fields for unpaired rows or ligand rows
        for (let i = 0; i < deltaHeaders.length; i++) values.push('');
      }
    }

    rows.push(values.map((v) => (v === undefined || v === null ? '' : escapeCsv(String(v)))).join(','));
  }

  return rows.join('\r\n');
}

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
