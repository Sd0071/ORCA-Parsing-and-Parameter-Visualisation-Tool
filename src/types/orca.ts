/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AtomCoord {
  index: number;
  symbol: string;
  x: number;
  y: number;
  z: number;
}

export interface OrbitalEntry {
  number: number;
  occupancy: number;
  energyHartree: number;
  energyEv: number;
}

export interface AtomicChargeEntry {
  atomIndex: number;
  symbol: string;
  charge: number;
  type: 'NBO' | 'Loewdin' | 'Mulliken';
}

export interface VibrationalModeEntry {
  modeNumber: number;
  frequency: number; // cm^-1
  irIntensity?: number; // km/mol
  t2?: number;
  isAlkeneCandidate?: boolean;
}

export interface CoordinationAssignment {
  pdIndex?: number;
  pIndex?: number;
  oIndex?: number;
  cAlkylIndex?: number;
  cAlkene1Index?: number;
  cAlkene2Index?: number;
}

export interface NeighborAtomCandidate {
  atom: AtomCoord;
  distanceToPd: number;
  assignedRole?: string;
}

export interface DOccupancies {
  dz2?: number;
  dxy?: number;
  dxz?: number;
  dyz?: number;
  dx2y2?: number;
}

export interface TableS3Descriptors {
  // Frontier Orbitals & Conceptual DFT
  homo?: number; // eV
  homo_hartree?: number;
  lumo?: number; // eV
  lumo_hartree?: number;
  eta?: number; // gap = LUMO - HOMO (eV)
  mu?: number; // chemical potential = (HOMO + LUMO)/2 (eV)
  omega?: number; // electrophilicity index = mu^2 / (2*eta) (eV)

  // Atomic Charges
  nbo_pd?: number; // e
  nbo_p?: number; // e
  nbo_o?: number; // e (coordinated oxygen)
  nbo_s?: number; // e (sulfonate sulfur)

  // Polarizability
  polar1?: number; // Bohr^3 or Angstrom^3
  polar2?: number;
  polar_iso?: number;

  // Spectroscopy
  nmr_31p?: number; // ppm
  ir_cc?: number; // cm^-1 (C=C stretch frequency)

  // Metal d-orbital occupancies
  pd_dz2?: number; // occupancy of dz2
  dxy?: number;
  dxz?: number;
  dyz?: number;
  dx2y2?: number;

  // Lone pair properties
  p_lp?: number; // energy level of P lone pair (eV or a.u.)
  o_lp?: number; // occupancy of O lone pair
  o_e?: number; // energy level of O lone pair (eV or a.u.)

  // Geometric parameters (extracted from 3D coordinates)
  pd_c?: number; // Pd-C bond length in propyl/alkyl group (Angstrom)
  p_pd_o?: number; // P-Pd-O angle (degrees)
  p_c2_s?: number; // shorter Pd-C in ethylene (Angstrom)
  p_c2_l?: number; // longer Pd-C in ethylene (Angstrom)
  c_c?: number; // C=C bond length in coordinated ethylene (Angstrom)

  // Steric descriptors
  vbur?: number; // %Vbur
  sterimol_l_av?: number;
  sterimol_b1_av?: number;
  sterimol_b5_av?: number;
  sterimol_l_diff?: number;
  sterimol_b1_diff?: number;
  sterimol_b5_diff?: number;

  // Electrostatic potential
  vmin_1?: number; // V
  vmin_2?: number; // distance from coordinated oxygen to Vmin (Angstrom)
}

export interface ContextLine {
  lineNum: number;
  text: string;
  isTarget: boolean;
}

export interface ParameterSourceMeta {
  sourceLine?: number;
  rawSnippet?: string;
  method: 'regex' | 'ai' | 'calculated' | 'manual';
  confidence: 'high' | 'medium' | 'estimated';
  ruleDescription?: string;
  blockName?: string;
  contextLines?: ContextLine[];
  notes?: string;
}

export type ParameterMetaMap = Partial<Record<keyof TableS3Descriptors, ParameterSourceMeta>>;

export interface OrcaCalculation {
  id: string;
  fileName: string;
  fileSize: number;
  systemName: string;
  calcType: 'complex' | 'ligand' | 'other';
  rawText: string;
  parsedAt: string;

  // Calculation metadata
  orcaVersion?: string;
  functionalBasis?: string;
  isConverged?: boolean;
  totalEnergyHartree?: number;
  dipoleMomentDebye?: number;
  optimizationCyclesFound?: number;

  // Extracted raw tables
  orbitals: OrbitalEntry[];
  charges: AtomicChargeEntry[];
  coordinates: AtomCoord[];
  frequencies: number[];
  vibrationalModes: VibrationalModeEntry[];
  coordination: CoordinationAssignment;

  // Table S3 Parameters
  descriptors: TableS3Descriptors;
  descriptorsMeta: ParameterMetaMap;

  // AI Extraction Status
  aiProcessed?: boolean;
  aiNotes?: string;
}

export interface DeltaDescriptors {
  complexId: string;
  ligandId: string;
  complexName: string;
  ligandName: string;

  d_homo?: number;
  d_lumo?: number;
  d_mu?: number;
  d_eta?: number;
  d_omega?: number;
  d_nbo_p?: number;
  d_nbo_o?: number;
  d_nbo_s?: number;
  d_polar1?: number;
  d_polar2?: number;
  d_nmr_31p?: number;
}
