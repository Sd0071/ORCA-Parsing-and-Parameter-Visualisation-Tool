/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AtomCoord,
  AtomicChargeEntry,
  ContextLine,
  CoordinationAssignment,
  OrbitalEntry,
  OrcaCalculation,
  ParameterMetaMap,
  TableS3Descriptors,
  VibrationalModeEntry,
} from '../types/orca';
import { analyzeGeometry } from './geometryCalc';

function extractContext(lines: string[], targetLine: number, window = 4): ContextLine[] {
  const start = Math.max(0, targetLine - window);
  const end = Math.min(lines.length - 1, targetLine + window);
  const result: ContextLine[] = [];
  for (let i = start; i <= end; i++) {
    result.push({
      lineNum: i + 1,
      text: lines[i],
      isTarget: i === targetLine,
    });
  }
  return result;
}

export function parseOrcaOutput(fileName: string, rawText: string): OrcaCalculation {
  const lines = rawText.split(/\r?\n/);
  const descriptors: TableS3Descriptors = {};
  const meta: ParameterMetaMap = {};

  let orcaVersion: string | undefined;
  let functionalBasis: string | undefined;
  let isConverged = false;
  let totalEnergyHartree: number | undefined;
  let dipoleMomentDebye: number | undefined;
  let optimizationCyclesFound = 0;

  const orbitals: OrbitalEntry[] = [];
  const charges: AtomicChargeEntry[] = [];
  const coordinates: AtomCoord[] = [];
  const frequencies: number[] = [];
  const vibrationalModes: VibrationalModeEntry[] = [];
  let coordination: CoordinationAssignment = {};

  // 1. Scan for ORCA version and functional/basis
  for (let i = 0; i < Math.min(lines.length, 300); i++) {
    const line = lines[i];
    if (line.includes('Program Version') || line.includes('ORCA Version') || line.includes('* O   R   C   A *')) {
      const match = line.match(/Version\s+([\d.]+)/i);
      if (match) orcaVersion = `ORCA ${match[1]}`;
    }
    if (line.trim().startsWith('| 1>') || line.trim().startsWith('!')) {
      functionalBasis = (functionalBasis ? functionalBasis + ' ' : '') + line.replace(/^[|!>\s0-9]+/, '').trim();
    }
    if (line.includes('B3LYP') || line.includes('def2-') || line.includes('6-31G') || line.includes('D3BJ')) {
      if (!functionalBasis) functionalBasis = line.trim();
    }
  }

  // Count optimization cycles
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('GEOMETRY OPTIMIZATION CYCLE') || lines[i].includes('CARTESIAN COORDINATES (ANGSTROEM)')) {
      optimizationCyclesFound++;
    }
  }

  // 2. Scan for Convergence and Final Energy
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (
      line.includes('OPTIMIZATION HAS CONVERGED') ||
      line.includes('THE OPTIMIZATION HAS CONVERGED') ||
      line.includes('SUCCESS') ||
      line.includes('ORCA TERMINATED NORMALLY')
    ) {
      isConverged = true;
    }
    if (totalEnergyHartree === undefined && line.includes('FINAL SINGLE POINT ENERGY')) {
      const match = line.match(/FINAL SINGLE POINT ENERGY\s+([-+]?\d+\.\d+)/);
      if (match) {
        totalEnergyHartree = parseFloat(match[1]);
      }
    }
    if (dipoleMomentDebye === undefined && line.includes('Magnitude (Debye)')) {
      const match = line.match(/Magnitude\s*\(Debye\)\s*:\s*([-+]?\d+\.\d+)/);
      if (match) {
        dipoleMomentDebye = parseFloat(match[1]);
      }
    }
  }

  // 3. Parse ORBITAL ENERGIES (scan backwards to find the final converged cycle)
  let orbitalBlockStart = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('ORBITAL ENERGIES')) {
      orbitalBlockStart = i;
      break;
    }
  }

  if (orbitalBlockStart !== -1) {
    let readingOrbitals = false;
    let homoLineIdx = -1;
    let lumoLineIdx = -1;

    for (let i = orbitalBlockStart; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes('NO') && line.includes('OCC') && line.includes('E(eV)')) {
        readingOrbitals = true;
        continue;
      }
      if (readingOrbitals) {
        if (line === '' || line.startsWith('---') || line.includes('TOTAL') || line.includes('MOLECULAR')) {
          if (orbitals.length > 0) break;
          continue;
        }
        const parts = line.split(/\s+/);
        if (parts.length >= 4 && !isNaN(parseInt(parts[0], 10))) {
          const num = parseInt(parts[0], 10);
          const occ = parseFloat(parts[1]);
          const eHartree = parseFloat(parts[2]);
          const eEv = parseFloat(parts[3]);
          if (!isNaN(occ) && !isNaN(eHartree) && !isNaN(eEv)) {
            orbitals.push({
              number: num,
              occupancy: occ,
              energyHartree: eHartree,
              energyEv: eEv,
            });
            if (occ > 0.5) homoLineIdx = i;
            if (occ < 0.5 && lumoLineIdx === -1 && homoLineIdx !== -1) lumoLineIdx = i;
          }
        } else if (orbitals.length > 5) {
          break;
        }
      }
    }

    if (orbitals.length > 0) {
      let homoOrbital: OrbitalEntry | undefined;
      let lumoOrbital: OrbitalEntry | undefined;

      for (let i = 0; i < orbitals.length; i++) {
        if (orbitals[i].occupancy > 0.5) {
          homoOrbital = orbitals[i];
        } else if (homoOrbital && orbitals[i].occupancy < 0.5) {
          lumoOrbital = orbitals[i];
          break;
        }
      }

      if (homoOrbital) {
        descriptors.homo = homoOrbital.energyEv;
        descriptors.homo_hartree = homoOrbital.energyHartree;
        meta.homo = {
          sourceLine: (homoLineIdx !== -1 ? homoLineIdx : orbitalBlockStart) + 1,
          rawSnippet: lines[homoLineIdx] || `MO #${homoOrbital.number} (Occ: ${homoOrbital.occupancy}) = ${homoOrbital.energyEv} eV`,
          method: 'regex',
          confidence: 'high',
          ruleDescription: 'Final SCF Orbital Energies table: last occupied orbital (occupancy > 0.5)',
          blockName: 'ORBITAL ENERGIES',
          contextLines: extractContext(lines, homoLineIdx !== -1 ? homoLineIdx : orbitalBlockStart),
        };
      }

      if (lumoOrbital) {
        descriptors.lumo = lumoOrbital.energyEv;
        descriptors.lumo_hartree = lumoOrbital.energyHartree;
        meta.lumo = {
          sourceLine: (lumoLineIdx !== -1 ? lumoLineIdx : orbitalBlockStart) + 1,
          rawSnippet: lines[lumoLineIdx] || `MO #${lumoOrbital.number} (Occ: ${lumoOrbital.occupancy}) = ${lumoOrbital.energyEv} eV`,
          method: 'regex',
          confidence: 'high',
          ruleDescription: 'Final SCF Orbital Energies table: first virtual orbital (occupancy < 0.5)',
          blockName: 'ORBITAL ENERGIES',
          contextLines: extractContext(lines, lumoLineIdx !== -1 ? lumoLineIdx : orbitalBlockStart),
        };
      }

      if (descriptors.homo !== undefined && descriptors.lumo !== undefined) {
        const eta = parseFloat((descriptors.lumo - descriptors.homo).toFixed(4));
        const mu = parseFloat(((descriptors.homo + descriptors.lumo) / 2).toFixed(4));
        const omega = eta !== 0 ? parseFloat(((mu * mu) / (2 * eta)).toFixed(4)) : undefined;

        descriptors.eta = eta;
        descriptors.mu = mu;
        descriptors.omega = omega;

        meta.eta = {
          sourceLine: meta.lumo?.sourceLine,
          rawSnippet: `eta = LUMO (${descriptors.lumo}) - HOMO (${descriptors.homo}) = ${eta} eV`,
          method: 'calculated',
          confidence: 'high',
          ruleDescription: 'Chemical hardness / gap: LUMO - HOMO in eV',
        };
        meta.mu = {
          sourceLine: meta.homo?.sourceLine,
          rawSnippet: `mu = (HOMO + LUMO)/2 = ${mu} eV`,
          method: 'calculated',
          confidence: 'high',
          ruleDescription: 'Absolute chemical potential: (HOMO + LUMO)/2 in eV',
        };
        meta.omega = {
          sourceLine: meta.homo?.sourceLine,
          rawSnippet: `omega = mu^2 / (2 * eta) = ${omega} eV`,
          method: 'calculated',
          confidence: 'high',
          ruleDescription: "Parr's electrophilicity index: mu^2 / (2 * eta) in eV",
        };
      }
    }
  }

  // 4. Parse ATOMIC CHARGES (NBO / Loewdin / Mulliken)
  let nboBlockStart = -1;
  let chargeType: 'NBO' | 'Loewdin' | 'Mulliken' = 'NBO';

  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('Summary of Natural Population Analysis:')) {
      nboBlockStart = i;
      chargeType = 'NBO';
      break;
    }
  }

  if (nboBlockStart === -1) {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].includes('LOEWDIN ATOMIC CHARGES') || lines[i].includes('Loewdin Atomic Charges')) {
        nboBlockStart = i;
        chargeType = 'Loewdin';
        break;
      }
    }
  }

  if (nboBlockStart === -1) {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].includes('MULLIKEN ATOMIC CHARGES') || lines[i].includes('Mulliken Atomic Charges')) {
        nboBlockStart = i;
        chargeType = 'Mulliken';
        break;
      }
    }
  }

  if (nboBlockStart !== -1) {
    let readingCharges = false;
    const chargeLineIndices: Record<number, number> = {};

    for (let i = nboBlockStart; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes('Atom  No') || line.includes('Charge') || line.startsWith('---')) {
        readingCharges = true;
        continue;
      }
      if (readingCharges) {
        if (line === '' || line.startsWith('====') || line.includes('Total') || line.includes('Natural')) {
          if (charges.length > 0) break;
          continue;
        }

        let sym = '';
        let idx = 0;
        let chg = 0;
        let matched = false;

        const nboMatch = line.match(/^([A-Za-z]{1,2})\s+(\d+)\s+([-+]?\d+\.\d+)/);
        if (nboMatch) {
          sym = nboMatch[1];
          idx = parseInt(nboMatch[2], 10);
          chg = parseFloat(nboMatch[3]);
          matched = true;
        } else {
          const loewMatch = line.match(/^(\d+)\s+([A-Za-z]{1,2})\s*:\s*([-+]?\d+\.\d+)/);
          if (loewMatch) {
            idx = parseInt(loewMatch[1], 10);
            sym = loewMatch[2];
            chg = parseFloat(loewMatch[3]);
            matched = true;
          }
        }

        if (matched && !isNaN(chg)) {
          charges.push({
            atomIndex: idx,
            symbol: sym,
            charge: chg,
            type: chargeType,
          });
          chargeLineIndices[idx] = i;
        } else if (charges.length > 5) {
          break;
        }
      }
    }

    const pdAtom = charges.find((c) => c.symbol.toUpperCase() === 'PD');
    if (pdAtom) {
      descriptors.nbo_pd = pdAtom.charge;
      const lIdx = chargeLineIndices[pdAtom.atomIndex] || nboBlockStart;
      meta.nbo_pd = {
        sourceLine: lIdx + 1,
        rawSnippet: lines[lIdx] || `${chargeType} charge on Pd (#${pdAtom.atomIndex}): ${pdAtom.charge}`,
        method: 'regex',
        confidence: chargeType === 'NBO' ? 'high' : 'medium',
        ruleDescription: `${chargeType} Population Analysis: central Pd atom #${pdAtom.atomIndex}`,
        blockName: chargeType === 'NBO' ? 'Natural Population Analysis' : `${chargeType} Charges`,
        contextLines: extractContext(lines, lIdx),
      };
    }

    const pAtom = charges.find((c) => c.symbol.toUpperCase() === 'P');
    if (pAtom) {
      descriptors.nbo_p = pAtom.charge;
      const lIdx = chargeLineIndices[pAtom.atomIndex] || nboBlockStart;
      meta.nbo_p = {
        sourceLine: lIdx + 1,
        rawSnippet: lines[lIdx] || `${chargeType} charge on P (#${pAtom.atomIndex}): ${pAtom.charge}`,
        method: 'regex',
        confidence: chargeType === 'NBO' ? 'high' : 'medium',
        ruleDescription: `${chargeType} Population Analysis: coordinated P atom #${pAtom.atomIndex}`,
        blockName: 'Natural Population Analysis',
        contextLines: extractContext(lines, lIdx),
      };
    }

    const sAtom = charges.find((c) => c.symbol.toUpperCase() === 'S');
    if (sAtom) {
      descriptors.nbo_s = sAtom.charge;
      const lIdx = chargeLineIndices[sAtom.atomIndex] || nboBlockStart;
      meta.nbo_s = {
        sourceLine: lIdx + 1,
        rawSnippet: lines[lIdx] || `${chargeType} charge on S (#${sAtom.atomIndex}): ${sAtom.charge}`,
        method: 'regex',
        confidence: chargeType === 'NBO' ? 'high' : 'medium',
        ruleDescription: `${chargeType} Population Analysis: sulfonate S atom #${sAtom.atomIndex}`,
        blockName: 'Natural Population Analysis',
        contextLines: extractContext(lines, lIdx),
      };
    }

    const oAtoms = charges.filter((c) => c.symbol.toUpperCase() === 'O');
    if (oAtoms.length > 0) {
      const coordO = oAtoms.reduce((prev, curr) => (curr.charge < prev.charge ? curr : prev));
      descriptors.nbo_o = coordO.charge;
      const lIdx = chargeLineIndices[coordO.atomIndex] || nboBlockStart;
      meta.nbo_o = {
        sourceLine: lIdx + 1,
        rawSnippet: lines[lIdx] || `${chargeType} charge on coordinated O (#${coordO.atomIndex}): ${coordO.charge}`,
        method: 'regex',
        confidence: chargeType === 'NBO' ? 'high' : 'medium',
        ruleDescription: `${chargeType} Population Analysis: coordinated sulfonate O #${coordO.atomIndex} (most polarized O atom)`,
        blockName: 'Natural Population Analysis',
        contextLines: extractContext(lines, lIdx),
      };
    }
  }

  // 5. Parse POLARIZABILITY TENSOR
  // 5a. First check for ORCA's "Diagonalized polarizability tensor" (as in user Python script)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.includes('Diagonalized polarizability tensor')) {
      for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
        const sub = lines[j].trim();
        const polMatch = sub.match(/^([-+]?\d+\.\d+)\s+([-+]?\d+\.\d+)\s+([-+]?\d+\.\d+)/);
        if (polMatch) {
          descriptors.polar1 = parseFloat(polMatch[1]);
          descriptors.polar2 = parseFloat(polMatch[2]);
          meta.polar1 = {
            sourceLine: j + 1,
            rawSnippet: sub,
            method: 'regex',
            confidence: 'high',
            ruleDescription: 'Diagonalized polarizability tensor eigenvalue 1',
            blockName: 'Diagonalized polarizability tensor',
            contextLines: extractContext(lines, j),
          };
          meta.polar2 = {
            sourceLine: j + 1,
            rawSnippet: sub,
            method: 'regex',
            confidence: 'high',
            ruleDescription: 'Diagonalized polarizability tensor eigenvalue 2',
            blockName: 'Diagonalized polarizability tensor',
            contextLines: extractContext(lines, j),
          };
          break;
        }
      }
      break;
    }
  }

  // 5b. Check general THE POLARIZABILITY TENSOR if not already captured
  if (descriptors.polar1 === undefined) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line.includes('THE POLARIZABILITY TENSOR') || line.includes('THE ISOTROPIC POLARIZABILITY')) {
        for (let j = i; j < Math.min(lines.length, i + 30); j++) {
          const sub = lines[j];
          if (sub.includes('Isotropic polarizability') || sub.includes('isotropic polarizability')) {
            const match = sub.match(/:\s*([-+]?\d+\.\d+)/);
            if (match) {
              descriptors.polar_iso = parseFloat(match[1]);
            }
          }
          const eigMatch = sub.match(/eigenvalues\s*:\s*([-+]?\d+\.\d+)\s+([-+]?\d+\.\d+)\s+([-+]?\d+\.\d+)/i);
          if (eigMatch) {
            descriptors.polar1 = parseFloat(eigMatch[1]);
            descriptors.polar2 = parseFloat(eigMatch[2]);
            meta.polar1 = {
              sourceLine: j + 1,
              rawSnippet: sub.trim(),
              method: 'regex',
              confidence: 'high',
              ruleDescription: 'Polarizability tensor eigenvalue 1',
              blockName: 'THE POLARIZABILITY TENSOR',
              contextLines: extractContext(lines, j),
            };
            meta.polar2 = {
              sourceLine: j + 1,
              rawSnippet: sub.trim(),
              method: 'regex',
              confidence: 'high',
              ruleDescription: 'Polarizability tensor eigenvalue 2',
              blockName: 'THE POLARIZABILITY TENSOR',
              contextLines: extractContext(lines, j),
            };
            break;
          }
          const diagMatch = sub.match(/([-+]?\d+\.\d+)\s+([-+]?\d+\.\d+)\s+([-+]?\d+\.\d+)/);
          if (diagMatch && (sub.includes('alpha') || sub.includes('XX') || descriptors.polar1 === undefined)) {
            if (!descriptors.polar1) {
              descriptors.polar1 = parseFloat(diagMatch[1]);
              descriptors.polar2 = parseFloat(diagMatch[2]);
              meta.polar1 = {
                sourceLine: j + 1,
                rawSnippet: sub.trim(),
                method: 'regex',
                confidence: 'medium',
                ruleDescription: 'Alpha tensor diagonal element xx',
                contextLines: extractContext(lines, j),
              };
              meta.polar2 = {
                sourceLine: j + 1,
                rawSnippet: sub.trim(),
                method: 'regex',
                confidence: 'medium',
                ruleDescription: 'Alpha tensor diagonal element yy',
                contextLines: extractContext(lines, j),
              };
            }
          }
        }
        break;
      }
    }
  }

  // 6. Parse Palladium d-orbital occupancies
  // 6a. Preferred: NAO Palladium valence 4d occupancies
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('NATURAL ATOMIC ORBITAL AND POPULATION ANALYSIS') || line.includes('Natural Atomic Orbital')) {
      for (let j = i; j < Math.min(lines.length, i + 450); j++) {
        const sub = lines[j];
        if (sub.includes('Pd') && (sub.includes('4d') || sub.includes('3d0') || sub.includes('3d1') || sub.includes('3d-1') || sub.includes('3d2') || sub.includes('3d-2'))) {
          const parts = sub.trim().split(/\s+/);
          if (parts.length >= 7) {
            const aoType = parts[5].toLowerCase();
            const occ = parseFloat(parts[6]);
            if (!isNaN(occ)) {
              if ((aoType.includes('dz2') || aoType.includes('3d0')) && descriptors.pd_dz2 === undefined) {
                descriptors.pd_dz2 = occ;
                meta.pd_dz2 = {
                  sourceLine: j + 1,
                  rawSnippet: sub.trim(),
                  method: 'regex',
                  confidence: 'high',
                  ruleDescription: 'Valence 4d(z2) occupancy from Natural Atomic Orbital (NAO) on Pd',
                  blockName: 'Natural Atomic Orbital Analysis',
                  contextLines: extractContext(lines, j),
                };
              } else if ((aoType.includes('dxy') || aoType.includes('3d-2')) && descriptors.dxy === undefined) {
                descriptors.dxy = occ;
                meta.dxy = {
                  sourceLine: j + 1,
                  rawSnippet: sub.trim(),
                  method: 'regex',
                  confidence: 'high',
                  ruleDescription: 'Valence 4d(xy) occupancy on Pd',
                  contextLines: extractContext(lines, j),
                };
              } else if ((aoType.includes('dxz') || aoType.includes('3d1')) && descriptors.dxz === undefined) {
                descriptors.dxz = occ;
                meta.dxz = {
                  sourceLine: j + 1,
                  rawSnippet: sub.trim(),
                  method: 'regex',
                  confidence: 'high',
                  ruleDescription: 'Valence 4d(xz) occupancy on Pd',
                  contextLines: extractContext(lines, j),
                };
              } else if ((aoType.includes('dyz') || aoType.includes('3d-1')) && descriptors.dyz === undefined) {
                descriptors.dyz = occ;
                meta.dyz = {
                  sourceLine: j + 1,
                  rawSnippet: sub.trim(),
                  method: 'regex',
                  confidence: 'high',
                  ruleDescription: 'Valence 4d(yz) occupancy on Pd',
                  contextLines: extractContext(lines, j),
                };
              } else if ((aoType.includes('dx2y2') || aoType.includes('3d2')) && descriptors.dx2y2 === undefined) {
                descriptors.dx2y2 = occ;
                meta.dx2y2 = {
                  sourceLine: j + 1,
                  rawSnippet: sub.trim(),
                  method: 'regex',
                  confidence: 'high',
                  ruleDescription: 'Valence 4d(x2-y2) occupancy on Pd',
                  contextLines: extractContext(lines, j),
                };
              }
            }
          }
        }
        if (sub.includes('Summary of Natural Population Analysis')) break;
      }
      break;
    }
  }

  // 6b. Fallback: LOEWDIN REDUCED ORBITAL CHARGES on Pd (as implemented in user's Python script)
  if (descriptors.pd_dz2 === undefined && descriptors.dxy === undefined) {
    let loewBlockStart = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].includes('LOEWDIN REDUCED ORBITAL CHARGES') || lines[i].includes('Loewdin Reduced Orbital Charges')) {
        loewBlockStart = i;
        break;
      }
    }

    if (loewBlockStart !== -1) {
      for (let i = loewBlockStart; i < Math.min(lines.length, loewBlockStart + 150); i++) {
        const line = lines[i];
        if (/\bPd\b/i.test(line)) {
          for (let j = i; j < Math.min(lines.length, i + 14); j++) {
            const sub = lines[j].toLowerCase();
            const parts = lines[j].trim().split(/\s+/);
            if (parts.length === 0) continue;
            const val = parseFloat(parts[parts.length - 1]);
            if (isNaN(val)) continue;

            if ((sub.includes('dz2') || sub.includes('d 0') || sub.includes('d0')) && descriptors.pd_dz2 === undefined) {
              descriptors.pd_dz2 = val;
              meta.pd_dz2 = {
                sourceLine: j + 1,
                rawSnippet: lines[j].trim(),
                method: 'regex',
                confidence: 'medium',
                ruleDescription: 'Pd dz2 occupancy from Loewdin Reduced Orbital Charges',
                blockName: 'LOEWDIN REDUCED ORBITAL CHARGES',
                contextLines: extractContext(lines, j),
              };
            } else if ((sub.includes('dxy') || sub.includes('d-2') || sub.includes('d -2')) && descriptors.dxy === undefined) {
              descriptors.dxy = val;
              meta.dxy = {
                sourceLine: j + 1,
                rawSnippet: lines[j].trim(),
                method: 'regex',
                confidence: 'medium',
                ruleDescription: 'Pd dxy occupancy from Loewdin Reduced Orbital Charges',
                blockName: 'LOEWDIN REDUCED ORBITAL CHARGES',
                contextLines: extractContext(lines, j),
              };
            } else if ((sub.includes('dxz') || sub.includes('d 1') || sub.includes('d1')) && !sub.includes('d-1') && descriptors.dxz === undefined) {
              descriptors.dxz = val;
              meta.dxz = {
                sourceLine: j + 1,
                rawSnippet: lines[j].trim(),
                method: 'regex',
                confidence: 'medium',
                ruleDescription: 'Pd dxz occupancy from Loewdin Reduced Orbital Charges',
                blockName: 'LOEWDIN REDUCED ORBITAL CHARGES',
                contextLines: extractContext(lines, j),
              };
            } else if ((sub.includes('dyz') || sub.includes('d-1') || sub.includes('d -1')) && descriptors.dyz === undefined) {
              descriptors.dyz = val;
              meta.dyz = {
                sourceLine: j + 1,
                rawSnippet: lines[j].trim(),
                method: 'regex',
                confidence: 'medium',
                ruleDescription: 'Pd dyz occupancy from Loewdin Reduced Orbital Charges',
                blockName: 'LOEWDIN REDUCED ORBITAL CHARGES',
                contextLines: extractContext(lines, j),
              };
            } else if ((sub.includes('dx2y2') || sub.includes('dx2-y2') || sub.includes('d 2') || sub.includes('d2')) && !sub.includes('d-2') && descriptors.dx2y2 === undefined) {
              descriptors.dx2y2 = val;
              meta.dx2y2 = {
                sourceLine: j + 1,
                rawSnippet: lines[j].trim(),
                method: 'regex',
                confidence: 'medium',
                ruleDescription: 'Pd dx2-y2 occupancy from Loewdin Reduced Orbital Charges',
                blockName: 'LOEWDIN REDUCED ORBITAL CHARGES',
                contextLines: extractContext(lines, j),
              };
            }
          }
          break;
        }
      }
    }
  }

  // 7. Parse NMR Chemical Shifts (31P NMR)
  // 7a. First check for EPRNMR Nucleus ... P : ... Isotropic = <val> (user's Python script)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const match = line.match(/Nucleus\s+\d+\s+P\s*:.*?Isotropic\s*=\s*([-+]?\d+\.\d+)/i);
    if (match) {
      descriptors.nmr_31p = parseFloat(match[1]);
      meta.nmr_31p = {
        sourceLine: i + 1,
        rawSnippet: line.trim(),
        method: 'regex',
        confidence: 'high',
        ruleDescription: '31P NMR isotropic chemical shielding from ORCA NMR module',
        blockName: 'CHEMICAL SHIELDING',
        contextLines: extractContext(lines, i),
      };
      break;
    }
  }

  // 7b. Fallback to CHEMICAL SHIELDING SUMMARY block
  if (descriptors.nmr_31p === undefined) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line.includes('CHEMICAL SHIELDING SUMMARY') || line.includes('CHEMICAL SHIELDINGS') || line.includes('NMR CHEMICAL SHIFTS')) {
        for (let j = i; j < Math.min(lines.length, i + 120); j++) {
          const sub = lines[j];
          if (sub.includes(' P ') || sub.startsWith('P ') || sub.includes('Phosphorus')) {
            const match = sub.match(/P\s+\d+\s+([-+]?\d+\.\d+)/) || sub.match(/:\s*([-+]?\d+\.\d+)/);
            if (match) {
              descriptors.nmr_31p = parseFloat(match[1]);
              meta.nmr_31p = {
                sourceLine: j + 1,
                rawSnippet: sub.trim(),
                method: 'regex',
                confidence: 'high',
                ruleDescription: 'Phosphorus nucleus NMR isotropic chemical shielding/shift',
                blockName: 'CHEMICAL SHIELDINGS (NMR)',
                contextLines: extractContext(lines, j),
              };
              break;
            }
          }
        }
        break;
      }
    }
  }

  // 8. Parse VIBRATIONAL FREQUENCIES & Normal Modes
  let freqBlockStart = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('VIBRATIONAL FREQUENCIES') || lines[i].includes('IR SPECTRUM')) {
      freqBlockStart = i;
      break;
    }
  }

  if (freqBlockStart !== -1) {
    let modeLineIdx = -1;
    for (let i = freqBlockStart; i < Math.min(lines.length, freqBlockStart + 350); i++) {
      const line = lines[i].trim();
      const freqMatch = line.match(/^(\d+):?\s+([-+]?\d+\.\d+)(?:\s+cm\*\*-1)?(?:\s+([-+]?\d+\.\d+))?/);
      if (freqMatch) {
        const modeNum = parseInt(freqMatch[1], 10);
        const freq = parseFloat(freqMatch[2]);
        const intensity = freqMatch[3] ? parseFloat(freqMatch[3]) : undefined;

        if (!isNaN(freq)) {
          frequencies.push(freq);
          const isCandidate = freq >= 1480 && freq <= 1650;
          vibrationalModes.push({
            modeNumber: modeNum,
            frequency: freq,
            irIntensity: intensity,
            isAlkeneCandidate: isCandidate,
          });

          if (isCandidate && modeLineIdx === -1) {
            modeLineIdx = i;
          }
        }
      }
      if (line.includes('NORMAL MODES') || line.includes('THERMOCHEMISTRY')) break;
    }

    const candidates = vibrationalModes.filter((m) => m.isAlkeneCandidate);
    const ccCandidate = candidates.length > 0 ? candidates[candidates.length - 1] : undefined;
    if (ccCandidate) {
      descriptors.ir_cc = ccCandidate.frequency;
      const lIdx = modeLineIdx !== -1 ? modeLineIdx : freqBlockStart;
      meta.ir_cc = {
        sourceLine: lIdx + 1,
        rawSnippet: lines[lIdx] || `Mode #${ccCandidate.modeNumber}: ${ccCandidate.frequency} cm^-1`,
        method: 'regex',
        confidence: 'high',
        ruleDescription: `Harmonic vibrational frequency for coordinated C=C stretch (Mode #${ccCandidate.modeNumber}, 1500-1650 cm^-1 window)`,
        blockName: 'VIBRATIONAL FREQUENCIES',
        contextLines: extractContext(lines, lIdx),
      };
    }
  }

  // 9. Parse Final CARTESIAN COORDINATES (ANGSTROEM)
  // CRITICAL FIX: Scan BACKWARDS to locate strictly the LAST coordinate block
  let coordBlockStart = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (
      lines[i].includes('FINAL CARTESIAN COORDINATES') ||
      lines[i].includes('CARTESIAN COORDINATES (ANGSTROEM)')
    ) {
      coordBlockStart = i;
      break;
    }
  }

  if (coordBlockStart !== -1) {
    let readingCoords = false;
    for (let i = coordBlockStart; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('---') || line.includes('Atom') || line.includes('CARTESIAN')) {
        readingCoords = true;
        continue;
      }
      if (readingCoords) {
        if (line === '' || line.startsWith('====') || line.includes('INTERNAL') || line.includes('TOTAL')) {
          if (coordinates.length > 0) break;
          continue;
        }

        const parts = line.split(/\s+/);
        if (parts.length >= 4 && isNaN(parseFloat(parts[0]))) {
          const sym = parts[0];
          const x = parseFloat(parts[1]);
          const y = parseFloat(parts[2]);
          const z = parseFloat(parts[3]);
          if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            coordinates.push({
              index: coordinates.length + 1,
              symbol: sym,
              x,
              y,
              z,
            });
          }
        } else if (parts.length >= 5 && !isNaN(parseInt(parts[0], 10))) {
          const idx = parseInt(parts[0], 10);
          const sym = parts[1];
          const x = parseFloat(parts[2]);
          const y = parseFloat(parts[3]);
          const z = parseFloat(parts[4]);
          if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            coordinates.push({ index: idx, symbol: sym, x, y, z });
          }
        } else if (coordinates.length > 5) {
          break;
        }
      }
    }

    if (coordinates.length > 0) {
      const geom = analyzeGeometry(coordinates);
      coordination = geom.coordination;

      if (geom.pd_c !== undefined) {
        descriptors.pd_c = geom.pd_c;
        meta.pd_c = {
          sourceLine: coordBlockStart + 1,
          rawSnippet: `d(Pd-C_alkyl) = ${geom.pd_c} A (Pd #${geom.pdAtom?.index} - C #${geom.alkylCAtom?.index})`,
          method: 'calculated',
          confidence: 'high',
          ruleDescription: `Euclidean distance between Pd #${geom.pdAtom?.index} and propyl/alkyl Carbon #${geom.alkylCAtom?.index} in final converged coordinates`,
          blockName: 'FINAL CARTESIAN COORDINATES',
          contextLines: extractContext(lines, coordBlockStart),
        };
      }
      if (geom.p_pd_o !== undefined) {
        descriptors.p_pd_o = geom.p_pd_o;
        meta.p_pd_o = {
          sourceLine: coordBlockStart + 1,
          rawSnippet: `angle(P-Pd-O) = ${geom.p_pd_o} deg (P #${geom.pAtom?.index} - Pd #${geom.pdAtom?.index} - O #${geom.oAtom?.index})`,
          method: 'calculated',
          confidence: 'high',
          ruleDescription: `Chelate bite angle: vector angle P #${geom.pAtom?.index} - Pd #${geom.pdAtom?.index} - O #${geom.oAtom?.index}`,
          blockName: 'FINAL CARTESIAN COORDINATES',
          contextLines: extractContext(lines, coordBlockStart),
        };
      }
      if (geom.p_c2_s !== undefined) {
        descriptors.p_c2_s = geom.p_c2_s;
        meta.p_c2_s = {
          sourceLine: coordBlockStart + 1,
          rawSnippet: `Shorter Pd-C(ethylene) = ${geom.p_c2_s} A (Pd - C #${geom.alkeneC1?.index})`,
          method: 'calculated',
          confidence: 'high',
          ruleDescription: `Shorter coordination distance of Pd to coordinated ethylene carbon`,
          blockName: 'FINAL CARTESIAN COORDINATES',
          contextLines: extractContext(lines, coordBlockStart),
        };
      }
      if (geom.p_c2_l !== undefined) {
        descriptors.p_c2_l = geom.p_c2_l;
        meta.p_c2_l = {
          sourceLine: coordBlockStart + 1,
          rawSnippet: `Longer Pd-C(ethylene) = ${geom.p_c2_l} A (Pd - C #${geom.alkeneC2?.index})`,
          method: 'calculated',
          confidence: 'high',
          ruleDescription: `Longer coordination distance of Pd to coordinated ethylene carbon`,
          blockName: 'FINAL CARTESIAN COORDINATES',
          contextLines: extractContext(lines, coordBlockStart),
        };
      }
      if (geom.c_c !== undefined) {
        descriptors.c_c = geom.c_c;
        meta.c_c = {
          sourceLine: coordBlockStart + 1,
          rawSnippet: `d(C=C) in coordinated alkene = ${geom.c_c} A (C #${geom.alkeneC1?.index} - C #${geom.alkeneC2?.index})`,
          method: 'calculated',
          confidence: 'high',
          ruleDescription: `Bond length of coordinated ethylene C=C double bond`,
          blockName: 'FINAL CARTESIAN COORDINATES',
          contextLines: extractContext(lines, coordBlockStart),
        };
      }
      if (geom.vbur_estimate !== undefined && descriptors.vbur === undefined) {
        descriptors.vbur = geom.vbur_estimate;
        meta.vbur = {
          sourceLine: coordBlockStart + 1,
          rawSnippet: `Estimated %Vbur in 3.5 A sphere = ${geom.vbur_estimate}%`,
          method: 'calculated',
          confidence: 'medium',
          ruleDescription: 'Steric profile / estimated buried volume in 3.5 A sphere around Pd',
          blockName: 'FINAL CARTESIAN COORDINATES',
        };
      }
    }
  }

  const cleanName = fileName.replace(/\.[^/.]+$/, '');
  const isLigand = cleanName.toLowerCase().includes('ligand') || (!descriptors.nbo_pd && coordinates.every((a) => a.symbol.toUpperCase() !== 'PD'));

  return {
    id: `calc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    fileName,
    fileSize: rawText.length,
    systemName: cleanName,
    calcType: isLigand ? 'ligand' : 'complex',
    rawText,
    parsedAt: new Date().toISOString(),
    orcaVersion,
    functionalBasis,
    isConverged,
    totalEnergyHartree,
    dipoleMomentDebye,
    optimizationCyclesFound,
    orbitals,
    charges,
    coordinates,
    frequencies,
    vibrationalModes,
    coordination,
    descriptors,
    descriptorsMeta: meta,
  };
}
