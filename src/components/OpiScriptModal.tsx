/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Terminal, Copy, Check, ExternalLink, Code2 } from 'lucide-react';

interface OpiScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OpiScriptModal: React.FC<OpiScriptModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const pythonScript = `# pip install orca-pi pandas numpy
import os
import glob
import re
import numpy as np
import pandas as pd

def parse_orca_full(file_path: str) -> dict:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    res = {
        "file": os.path.basename(file_path),
        "homo": None, "lumo": None, "eta": None, "mu": None, "omega": None,
        "NBO(Pd)": None, "NBO(P)": None, "NBO(O)": None, "NBO(S)": None,
        "polar1": None, "polar2": None,
        "31P_NMR": None,
        "Pd_dz2": None, "dxy": None, "dxz": None, "dyz": None, "dx2y2": None,
        "IR(C=C)": None,
        "Pd-C": None, "P-Pd-O": None,
        "P-C2-S": None, "P-C2-L": None, "C=C": None
    }

    # 1. Frontier Orbitals (HOMO, LUMO, eta, mu, omega)
    orb_blocks = list(re.finditer(r"ORBITAL ENERGIES.*?\n\s*-+\n(.*?)\n\s*-{5,}", content, re.DOTALL))
    if orb_blocks:
        target_block = orb_blocks[-1].group(1)
        lines = target_block.strip().splitlines()
        last_occ_ev = None
        first_virt_ev = None
        for line in lines:
            parts = line.split()
            if len(parts) >= 4:
                try:
                    occ = float(parts[1])
                    ev = float(parts[3])
                    if occ > 0.5:
                        last_occ_ev = ev
                    elif occ <= 0.5 and first_virt_ev is None and last_occ_ev is not None:
                        first_virt_ev = ev
                except ValueError:
                    continue
        res["homo"] = last_occ_ev
        res["lumo"] = first_virt_ev
        if res["homo"] is not None and res["lumo"] is not None:
            res["eta"] = res["lumo"] - res["homo"]
            res["mu"] = (res["homo"] + res["lumo"]) / 2.0
            res["omega"] = (res["mu"] ** 2) / (2.0 * res["eta"]) if res["eta"] != 0 else None

    # 2. Polarizability Tensor
    pol_matches = list(re.finditer(r"Diagonalized polarizability tensor.*?:\s*\n\s*([-\d\.]+)\s+([-\d\.]+)\s+([-\d\.]+)", content, re.DOTALL))
    if pol_matches:
        vals = [float(x) for x in pol_matches[-1].groups()]
        res["polar1"] = vals[0]
        res["polar2"] = vals[1]

    # 3. 31P NMR Isotropic Chemical Shielding
    p_nmr_match = list(re.finditer(r"Nucleus\s+\d+\s+P\s*:.*?Isotropic\s*=\s*([-\d\.]+)", content, re.DOTALL))
    if p_nmr_match:
        res["31P_NMR"] = float(p_nmr_match[-1].group(1))

    # 4. Harmonic IR Frequency (C=C stretch: 1500 - 1650 cm^-1)
    ir_block = list(re.finditer(r"VIBRATIONAL FREQUENCIES.*?\n\s*-+\n(.*?)\n\s*-{5,}", content, re.DOTALL))
    if ir_block:
        freqs = []
        for line in ir_block[-1].group(1).splitlines():
            m = re.search(r"^\s*\d+:\s+([-\d\.]+)\s+cm\*\*-1", line)
            if m:
                val = float(m.group(1))
                if 1500.0 <= val <= 1650.0:
                    freqs.append(val)
        if freqs:
            res["IR(C=C)"] = freqs[-1]

    # 5. Geometry Coordinates
    geom_matches = list(re.finditer(r"CARTESIAN COORDINATES \(ANGSTROEM\)\s*\n\s*-+\n(.*?)\n\s*-+", content, re.DOTALL))
    atoms, coords = [], []
    if geom_matches:
        for line in geom_matches[-1].group(1).strip().splitlines():
            parts = line.split()
            if len(parts) == 4:
                atoms.append(parts[0].upper())
                coords.append([float(parts[1]), float(parts[2]), float(parts[3])])
    coords = np.array(coords)

    # 6. Atomic Charges (NBO preferred, Loewdin fallback)
    nbo_blocks = list(re.finditer(r"SUMMARY OF NATURAL POPULATION ANALYSIS:.*?\n\s*-+\n(.*?)\n\s*={5,}", content, re.DOTALL))
    if nbo_blocks:
        for line in nbo_blocks[-1].group(1).strip().splitlines():
            parts = line.split()
            if len(parts) >= 3:
                sym, q = parts[0].upper(), float(parts[2])
                if sym == "PD" and res["NBO(Pd)"] is None: res["NBO(Pd)"] = q
                elif sym == "P" and res["NBO(P)"] is None: res["NBO(P)"] = q
                elif sym == "O" and res["NBO(O)"] is None: res["NBO(O)"] = q
                elif sym == "S" and res["NBO(S)"] is None: res["NBO(S)"] = q
    else:
        loewdin_blocks = list(re.finditer(r"LOEWDIN ATOMIC CHARGES.*?\n\s*-+\n(.*?)\n\s*-{5,}", content, re.DOTALL))
        if loewdin_blocks:
            for line in loewdin_blocks[-1].group(1).strip().splitlines():
                parts = line.split()
                if len(parts) >= 4:
                    sym, q = parts[1].upper(), float(parts[3])
                    if sym == "PD" and res["NBO(Pd)"] is None: res["NBO(Pd)"] = q
                    elif sym == "P" and res["NBO(P)"] is None: res["NBO(P)"] = q
                    elif sym == "O" and res["NBO(O)"] is None: res["NBO(O)"] = q
                    elif sym == "S" and res["NBO(S)"] is None: res["NBO(S)"] = q

    # 7. 4d Orbital Breakdown on Pd (NBO NAO if present, else Loewdin Reduced Orbital Charges)
    nao_pd_block = list(re.finditer(r"NAO\s+Atom\s+No\s+lang\s+Type\(AO\)\s+Occupancy.*?\n\s*-+\n(.*?)\n\s*={5,}", content, re.DOTALL))
    if nao_pd_block:
        for line in nao_pd_block[-1].group(1).splitlines():
            if "Pd" in line and "4d" in line:
                parts = line.split()
                if len(parts) >= 7:
                    ao_type = parts[5].lower()
                    occ = float(parts[6])
                    if "dz2" in ao_type or "3d0" in ao_type: res["Pd_dz2"] = occ
                    elif "dxy" in ao_type or "3d-2" in ao_type: res["dxy"] = occ
                    elif "dxz" in ao_type or "3d1" in ao_type: res["dxz"] = occ
                    elif "dyz" in ao_type or "3d-1" in ao_type: res["dyz"] = occ
                    elif "dx2y2" in ao_type or "3d2" in ao_type: res["dx2y2"] = occ
    else:
        # Fallback to Loewdin Reduced Orbital Charges
        loew_orb = list(re.finditer(r"LOEWDIN REDUCED ORBITAL CHARGES.*?\n\s*-+\n(.*?)\n\s*-{5,}", content, re.DOTALL))
        if loew_orb:
            lines = loew_orb[-1].group(1).splitlines()
            for i, line in enumerate(lines):
                if re.search(r"\\bPd\\b", line, re.IGNORECASE):
                    for j in range(i, min(i + 12, len(lines))):
                        sub = lines[j].lower()
                        parts = lines[j].split()
                        if not parts:
                            continue
                        try:
                            val = float(parts[-1])
                            if "dz2" in sub or "d 0" in sub or "d0" in sub: res["Pd_dz2"] = val
                            elif "dxy" in sub or "d-2" in sub or "d -2" in sub: res["dxy"] = val
                            elif "dxz" in sub or "d 1" in sub or "d 1" in sub: res["dxz"] = val
                            elif "dyz" in sub or "d-1" in sub or "d -1" in sub: res["dyz"] = val
                            elif "dx2y2" in sub or "dx2-y2" in sub or "d 2" in sub: res["dx2y2"] = val
                        except ValueError:
                            continue

    # 8. Structural Geometrical Descriptors
    if len(coords) > 0 and "PD" in atoms:
        pd_idx = atoms.index("PD")
        pd_pos = coords[pd_idx]
        
        dists_to_pd = np.linalg.norm(coords - pd_pos, axis=1)

        p_indices = [i for i, a in enumerate(atoms) if a == "P"]
        c_p_idx = min(p_indices, key=lambda i: dists_to_pd[i]) if p_indices else None

        o_indices = [i for i, a in enumerate(atoms) if a == "O" and dists_to_pd[i] < 2.5]
        c_o_idx = min(o_indices, key=lambda i: dists_to_pd[i]) if o_indices else None

        if c_p_idx is not None and c_o_idx is not None:
            v1 = coords[c_p_idx] - pd_pos
            v2 = coords[c_o_idx] - pd_pos
            cos_th = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
            res["P-Pd-O"] = float(np.degrees(np.arccos(np.clip(cos_th, -1.0, 1.0))))

        c_indices = [i for i, a in enumerate(atoms) if a == "C"]
        alkene_c = sorted([i for i in c_indices if 1.9 <= dists_to_pd[i] <= 2.6], key=lambda i: dists_to_pd[i])
        
        if len(alkene_c) >= 2:
            c1_idx, c2_idx = alkene_c[0], alkene_c[1]
            res["P-C2-S"] = float(dists_to_pd[c1_idx])
            res["P-C2-L"] = float(dists_to_pd[c2_idx])
            res["C=C"] = float(np.linalg.norm(coords[c1_idx] - coords[c2_idx]))
            
            alkyl_candidates = [i for i in c_indices if dists_to_pd[i] < 2.2 and i not in (c1_idx, c2_idx)]
            if alkyl_candidates:
                res["Pd-C"] = float(dists_to_pd[alkyl_candidates[0]])
        elif len(c_indices) > 0:
            bonded_c = [i for i in c_indices if dists_to_pd[i] < 2.3]
            if bonded_c:
                res["Pd-C"] = float(min(dists_to_pd[bonded_c]))

    return res

# --- Batch Execution Across All Files ---
folder_path = "/content"
out_files = sorted(glob.glob(os.path.join(folder_path, "*.out")))

print(f"Found {len(out_files)} .out file(s) in {folder_path}:")
for f in out_files:
    print(" -", os.path.basename(f))

records = [parse_orca_full(f) for f in out_files]
df_results = pd.DataFrame(records)

# --- Automatic Delta (D_XXX) Calculation (Complex - Ligand) ---
for idx, row in df_results.iterrows():
    name = row["file"]
    if "_Pd" in name:
        base_ligand = name.replace("_Pd_SP", "").replace("_Pd", "")
        ligand_rows = df_results[df_results["file"].str.contains(base_ligand.replace(".out", "")) & ~df_results["file"].str.contains("_Pd")]
        if not ligand_rows.empty:
            lig = ligand_rows.iloc[0]
            for col in ["homo", "NBO(P)", "NBO(O)", "31P_NMR"]:
                if pd.notnull(row[col]) and pd.notnull(lig[col]):
                    df_results.loc[idx, f"D_{col}"] = row[col] - lig[col]

df_results.to_csv("/content/Table_S3_all_descriptors.csv", index=False)
print("\\nExtraction complete! Saved to /content/Table_S3_all_descriptors.csv")
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pythonScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                ORCA Table S3 Python Parser Script
              </h2>
              <p className="text-xs text-slate-500">
                Complete Python batch extraction script with NBO/Loewdin fallback and delta calculations
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer">
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold text-blue-900 mb-0.5">Custom Table S3 Python Pipeline:</h4>
              <p className="text-blue-800 text-[11px]">
                This script matches the exact regexes, coordinate distance cutoffs, and delta pairing logic. Run it in Google Colab (pointing to <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">/content</code>) or on your local workstation.
              </p>
            </div>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shrink-0 cursor-pointer shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied Script!' : 'Copy Script'}
            </button>
          </div>

          <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-[11px] rounded-xl overflow-x-auto max-h-96 leading-relaxed border border-slate-800">
            {pythonScript}
          </pre>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500">
            Compatible with ORCA 4.x, 5.x &amp; 6.x logs
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
