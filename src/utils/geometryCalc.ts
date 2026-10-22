/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AtomCoord, CoordinationAssignment, NeighborAtomCandidate } from '../types/orca';

export function distance(a: AtomCoord, b: AtomCoord): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function angleDegrees(a: AtomCoord, center: AtomCoord, c: AtomCoord): number {
  const v1 = { x: a.x - center.x, y: a.y - center.y, z: a.z - center.z };
  const v2 = { x: c.x - center.x, y: c.y - center.y, z: c.z - center.z };

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

  if (mag1 === 0 || mag2 === 0) return 0;
  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

export interface GeometricAnalysisResult {
  pdAtom?: AtomCoord;
  pAtom?: AtomCoord;
  oAtom?: AtomCoord;
  alkylCAtom?: AtomCoord;
  alkeneC1?: AtomCoord;
  alkeneC2?: AtomCoord;

  coordination: CoordinationAssignment;
  neighborCandidates: NeighborAtomCandidate[];

  pd_c?: number; // Pd-C in propyl
  p_pd_o?: number; // P-Pd-O bite angle
  p_c2_s?: number; // Shorter Pd-C in ethylene
  p_c2_l?: number; // Longer Pd-C in ethylene
  c_c?: number; // C=C double bond in ethylene
  vbur_estimate?: number; // Steric buried volume estimate
}

/**
 * Automatically inspects optimized Cartesian coordinates to detect the coordination sphere:
 * - Transition Metal (Pd, or Ni/Pt)
 * - Coordinated P (nearest Phosphorus)
 * - Coordinated O (nearest Oxygen from sulfonate group)
 * - Alkene carbons (two adjacent carbons coordinated to Pd at ~2.0 - 2.5 A)
 * - Alkyl carbon (other coordinated carbon at ~2.0 - 2.3 A)
 */
export function analyzeGeometry(coords: AtomCoord[]): GeometricAnalysisResult {
  const result: GeometricAnalysisResult = {
    coordination: {},
    neighborCandidates: [],
  };
  if (!coords || coords.length === 0) return result;

  // 1. Find Transition Metal (prefer Pd, then Ni, Pt)
  const pd = coords.find((a) => a.symbol.toUpperCase() === 'PD') ||
             coords.find((a) => a.symbol.toUpperCase() === 'NI') ||
             coords.find((a) => a.symbol.toUpperCase() === 'PT');

  if (!pd) {
    return result;
  }
  result.pdAtom = pd;
  result.coordination.pdIndex = pd.index;

  // Collect all neighboring atoms within 3.5 A of Pd
  const allNeighbors = coords
    .filter((a) => a.index !== pd.index)
    .map((a) => ({
      atom: a,
      distanceToPd: parseFloat(distance(pd, a).toFixed(4)),
    }))
    .filter((n) => n.distanceToPd <= 3.4)
    .sort((a, b) => a.distanceToPd - b.distanceToPd);

  // 2. Find closest Phosphorus (< 2.8 A)
  const pCandidates = coords
    .filter((a) => a.symbol.toUpperCase() === 'P')
    .map((a) => ({ atom: a, dist: distance(pd, a) }))
    .filter((x) => x.dist < 3.0)
    .sort((a, b) => a.dist - b.dist);

  if (pCandidates.length > 0) {
    result.pAtom = pCandidates[0].atom;
    result.coordination.pIndex = pCandidates[0].atom.index;
  }

  // 3. Find closest Oxygen (< 2.5 A)
  const oCandidates = coords
    .filter((a) => a.symbol.toUpperCase() === 'O')
    .map((a) => ({ atom: a, dist: distance(pd, a) }))
    .filter((x) => x.dist < 2.5)
    .sort((a, b) => a.dist - b.dist);

  if (oCandidates.length > 0) {
    result.oAtom = oCandidates[0].atom;
    result.coordination.oIndex = oCandidates[0].atom.index;
  }

  // 4. Calculate P-Pd-O bite angle
  if (result.pAtom && result.oAtom) {
    result.p_pd_o = parseFloat(angleDegrees(result.pAtom, pd, result.oAtom).toFixed(2));
  }

  // 5. Detect Coordinated Carbons (matching user Python script)
  // alkene_c = sorted([i for i in c_indices if 1.9 <= dists_to_pd[i] <= 2.6], key=lambda i: dists_to_pd[i])
  const cCandidates = coords
    .filter((a) => a.symbol.toUpperCase() === 'C')
    .map((a) => ({ atom: a, dist: distance(pd, a) }))
    .sort((a, b) => a.dist - b.dist);

  const alkeneCandidates = cCandidates.filter((c) => c.dist >= 1.9 && c.dist <= 2.6);

  if (alkeneCandidates.length >= 2) {
    const c1 = alkeneCandidates[0].atom;
    const c2 = alkeneCandidates[1].atom;
    result.alkeneC1 = c1;
    result.alkeneC2 = c2;
    result.coordination.cAlkene1Index = c1.index;
    result.coordination.cAlkene2Index = c2.index;

    result.p_c2_s = parseFloat(alkeneCandidates[0].dist.toFixed(4));
    result.p_c2_l = parseFloat(alkeneCandidates[1].dist.toFixed(4));
    result.c_c = parseFloat(distance(c1, c2).toFixed(4));

    // alkyl_candidates = [i for i in c_indices if dists_to_pd[i] < 2.2 and i not in (c1_idx, c2_idx)]
    const alkylCandidates = cCandidates.filter(
      (c) => c.dist < 2.2 && c.atom.index !== c1.index && c.atom.index !== c2.index
    );
    if (alkylCandidates.length > 0) {
      result.alkylCAtom = alkylCandidates[0].atom;
      result.coordination.cAlkylIndex = alkylCandidates[0].atom.index;
      result.pd_c = parseFloat(alkylCandidates[0].dist.toFixed(4));
    }
  } else if (cCandidates.length > 0) {
    const bondedC = cCandidates.filter((c) => c.dist < 2.3);
    if (bondedC.length > 0) {
      result.alkylCAtom = bondedC[0].atom;
      result.coordination.cAlkylIndex = bondedC[0].atom.index;
      result.pd_c = parseFloat(bondedC[0].dist.toFixed(4));
    }
  }

  // Mark roles on candidates
  result.neighborCandidates = allNeighbors.map((n) => {
    let role: string | undefined;
    if (result.pAtom && n.atom.index === result.pAtom.index) role = 'Coordinated P';
    else if (result.oAtom && n.atom.index === result.oAtom.index) role = 'Coordinated O (Sulfonate)';
    else if (result.alkylCAtom && n.atom.index === result.alkylCAtom.index) role = 'Pd–C Alkyl Carbon';
    else if (result.alkeneC1 && n.atom.index === result.alkeneC1.index) role = 'Alkene C₁';
    else if (result.alkeneC2 && n.atom.index === result.alkeneC2.index) role = 'Alkene C₂';
    return {
      ...n,
      assignedRole: role,
    };
  });

  // 6. Rough estimate of Buried Volume %Vbur around Pd (3.5 A radius sphere)
  const R_sphere = 3.5;
  const atomsInSphere = coords.filter(
    (a) => a.index !== pd.index && distance(pd, a) <= R_sphere
  );
  if (atomsInSphere.length > 0) {
    const count = atomsInSphere.length;
    const estimate = Math.min(68, Math.max(38, 30 + count * 1.45));
    result.vbur_estimate = parseFloat(estimate.toFixed(1));
  }

  return result;
}

/**
 * Recalculates geometric parameters when the user explicitly chooses or overrides atom assignments
 */
export function recalculateGeometryWithCustomAtoms(
  coords: AtomCoord[],
  assignment: CoordinationAssignment
): {
  pd_c?: number;
  p_pd_o?: number;
  p_c2_s?: number;
  p_c2_l?: number;
  c_c?: number;
} {
  const result: {
    pd_c?: number;
    p_pd_o?: number;
    p_c2_s?: number;
    p_c2_l?: number;
    c_c?: number;
  } = {};

  const findAtom = (idx?: number) => (idx !== undefined ? coords.find((a) => a.index === idx) : undefined);

  const pd = findAtom(assignment.pdIndex);
  const p = findAtom(assignment.pIndex);
  const o = findAtom(assignment.oIndex);
  const cAlkyl = findAtom(assignment.cAlkylIndex);
  const cAlk1 = findAtom(assignment.cAlkene1Index);
  const cAlk2 = findAtom(assignment.cAlkene2Index);

  if (pd && p && o) {
    result.p_pd_o = parseFloat(angleDegrees(p, pd, o).toFixed(2));
  }

  if (pd && cAlkyl) {
    result.pd_c = parseFloat(distance(pd, cAlkyl).toFixed(4));
  }

  if (pd && cAlk1 && cAlk2) {
    const d1 = distance(pd, cAlk1);
    const d2 = distance(pd, cAlk2);
    result.p_c2_s = parseFloat(Math.min(d1, d2).toFixed(4));
    result.p_c2_l = parseFloat(Math.max(d1, d2).toFixed(4));
    result.c_c = parseFloat(distance(cAlk1, cAlk2).toFixed(4));
  }

  return result;
}
