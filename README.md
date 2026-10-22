# ORCA QChem Parser & CSV Agent

An automated quantum chemistry parser and dataset extraction platform designed for computational chemistry and homogeneous catalysis research. It extracts electronic, spectroscopic, and 3D geometric descriptors from raw **ORCA** (`.out`, `.log`) calculation files into structured **Table S3** datasets with automatic Complex–Ligand Delta ($\Delta$) calculations and RFC 4180 CSV export.

---

## Overview

In homogeneous catalysis studies (e.g., palladium phosphine-sulfonate catalyzed ethylene/acrylate copolymerization, *Organometallics* 2022), quantum chemical descriptors from DFT calculations must be compiled into tabular data for quantitative structure-activity relationship (QSAR) models and machine learning.

Extracting these parameters manually from multi-megabyte ORCA logs is error-prone and time-consuming. This tool provides:

1. **Deterministic Parser Engine**: Instant, zero-latency extraction of frontier orbital energies, NBO/Loewdin charges, polarizability tensors, $^{31}\text{P}$ NMR shieldings, IR frequencies, and Cartesian geometries.
2. **Interactive Parsing Audit Drawer**: Inspect exact matched source lines in the raw calculation log, view normal mode frequencies, and visually reassign coordination sphere atoms with live geometric recalculations.
3. **Automated $\Delta$ Descriptor Pairing**: Match catalyst complexes with their corresponding free ligands to compute $\Delta\text{HOMO}$, $\Delta\text{NBO(P)}$, $\Delta\text{NBO(O)}$, and $\Delta^{31}\text{P}\text{ NMR}$.
4. **Export Ready for ML/Spreadsheets**: Export selected or full parameter matrices to clean RFC 4180 CSV or JSON formats.
5. **Colab / HPC Script**: Includes a standalone, batch Python script ready for cluster environments.
6. **Gemini AI Fallback**: Optional server-side AI verification to resolve non-standard or heavily customized ORCA logs.

---

## Extracted Descriptors (Table S3 Specification)

| Descriptor | Unit | Description & Methodology |
| :--- | :--- | :--- |
| **`homo`** | eV | Highest Occupied Molecular Orbital energy from final SCF cycle |
| **`lumo`** | eV | Lowest Unoccupied Molecular Orbital energy |
| **`eta` ($\eta$)** | eV | Chemical hardness: $\text{LUMO} - \text{HOMO}$ |
| **`mu` ($\mu$)** | eV | Absolute chemical potential: $\frac{\text{HOMO} + \text{LUMO}}{2}$ |
| **`omega` ($\omega$)** | eV | Parr electrophilicity index: $\frac{\mu^2}{2\eta}$ |
| **`NBO(Pd)`** | $e$ | Natural Population Analysis atomic charge on Palladium (with Loewdin fallback) |
| **`NBO(P)`** | $e$ | Atomic charge on coordinated Phosphorus |
| **`NBO(O)`** | $e$ | Atomic charge on coordinated Sulfonate Oxygen |
| **`NBO(S)`** | $e$ | Atomic charge on Sulfonate Sulfur |
| **`polar1`, `polar2`**| a.u. | Principal diagonalized polarizability tensor components ($\alpha_{xx}$, $\alpha_{yy}$) |
| **`31P_NMR`** | ppm | $^{31}\text{P}$ isotropic chemical shielding from ORCA NMR/EPRNMR module |
| **`Pd_dz2`** | $e$ | Palladium $4d(z^2)$ orbital occupancy (Valence NAO or Loewdin Reduced Orbital Charges) |
| **`dxy`** | $e$ | Palladium $4d(xy)$ orbital occupancy |
| **`dxz`** | $e$ | Palladium $4d(xz)$ orbital occupancy |
| **`dyz`** | $e$ | Palladium $4d(yz)$ orbital occupancy |
| **`dx2y2`** | $e$ | Palladium $4d(x^2-y^2)$ orbital occupancy |
| **`IR(C=C)`** | cm$^{-1}$| Harmonic vibrational frequency for coordinated alkene stretch ($1500\text{--}1650\text{ cm}^{-1}$) |
| **`Pd-C`** | Å | Bond length between Pd and alkyl/propyl carbon ($< 2.2\text{ \AA}$) |
| **`P-Pd-O`** | deg | Chelate bite angle ($\angle\text{P–Pd–O}$) |
| **`P-C2-S`** | Å | Shorter coordination distance between Pd and ethylene carbon ($1.9\text{--}2.6\text{ \AA}$) |
| **`P-C2-L`** | Å | Longer coordination distance between Pd and ethylene carbon ($1.9\text{--}2.6\text{ \AA}$) |
| **`C=C`** | Å | Coordinated ethylene $\text{C=C}$ bond distance |
| **`%Vbur`** | % | Estimated steric buried volume in a $3.5\text{ \AA}$ sphere around Pd |
| **`D_*`** | — | Paired delta difference: $\Delta = \text{Complex} - \text{Ligand}$ |

---

## Getting Started

### Prerequisites

- **Node.js**: Version 18.x or later (Node 20+ recommended)
- **npm** or **bun** / **yarn**

### 1. Installation

Clone or open the repository directory, then install dependencies:

```bash
npm install
```

### 2. Environment Setup (Optional for AI Fallback)

Copy the example environment configuration:

```bash
cp .env.example .env
```

If you wish to use the Gemini AI parsing fallback for malformed or customized calculation logs, add your Gemini API key to `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

*(Note: The deterministic parser works 100% locally and does not require an API key).*

### 3. Running in Development

Start the full-stack development server:

```bash
npm run dev
```

Open your browser to [http://localhost:3000](http://localhost:3000).

### 4. Building for Production

Compile both the TypeScript frontend and production assets:

```bash
npm run build
npm start
```

---

## How to Use the Web Application

1. **Upload Files**:
   - Drag and drop one or more `.out` or `.log` files into the upload zone.
   - Alternatively, click **"Load Benchmark Dataset"** to immediately explore three preloaded calculations (`Pd_PS_oAn_complex`, `PS_oAn_ligand`, and `Pd_PS_biAr_complex`).
2. **Review Parameter Cards**:
   - The main workspace presents high-density cards organized into Frontier Orbitals, Atomic Charges, Spectroscopy, $d$-Orbital Occupancies, and 3D Geometry.
   - Click **"Audit Source"** on any card to see the exact lines in the raw ORCA log where that value was extracted.
3. **Audit & Reassign Coordination**:
   - Click **"Audit Parsing Matches"** to open the slide-over inspection drawer.
   - In the **Coordination Atoms** tab, you can override automatic atom detection for Pd, P, O, Alkyl Carbon, and Alkene Carbons; distances and angles recalculate live.
   - In the **Vibrational Modes** tab, view all harmonic normal modes and select custom candidates.
4. **Compute Delta ($\Delta$) Descriptors**:
   - Switch to the **Delta ($\Delta$) Calculator** tab to pair any complex with its corresponding free ligand.
   - The application computes $\Delta\text{HOMO}$, $\Delta\text{NBO(P)}$, $\Delta\text{NBO(O)}$, and $\Delta^{31}\text{P}\text{ NMR}$ instantaneously.
5. **Batch Matrix & Export**:
   - Switch to the **Batch Dataset Matrix** tab to view all uploaded calculations in a tabular spreadsheet view.
   - Click **"Export CSV"** to configure column selections, preview the raw RFC 4180 CSV, and download `.csv` or `.json` files.

---

## Python / Google Colab Batch Pipeline

If you have hundreds of calculation files on a remote HPC cluster or Google Colab, you can use the built-in Python script.

Click **"Python Script"** in the top navigation bar to copy the script, or run it directly:

```bash
pip install pandas numpy
```

```python
import os
import glob
import re
import numpy as np
import pandas as pd

# Set the path to your ORCA .out files
folder_path = "./orca_calculations"
out_files = sorted(glob.glob(os.path.join(folder_path, "*.out")))

# Run batch parsing and compute delta descriptors
# (Full script is available via the 'Python Script' button in the application UI)
```

The script extracts all descriptors, computes complex–ligand delta parameters, and exports `Table_S3_all_descriptors.csv`.

---

## Project Structure

```text
├── server.ts                    # Express server with Vite middleware & Gemini API endpoint
├── src/
│   ├── App.tsx                  # Root application state & navigation router
│   ├── types/
│   │   └── orca.ts              # TypeScript interfaces for Table S3 descriptors & metadata
│   ├── utils/
│   │   ├── orcaParser.ts        # Fast regex/AST deterministic ORCA log parser
│   │   ├── geometryCalc.ts      # 3D Cartesian coordinate analyzer & coordination sphere solver
│   │   ├── csvExport.ts         # RFC 4180 compliant CSV serializer with Delta computation
│   │   └── sampleData.ts        # Pre-packaged benchmark ORCA outputs for immediate testing
│   └── components/
│       ├── Header.tsx           # Navigation bar with benchmark & script triggers
│       ├── FileUploadZone.tsx   # Drag-and-drop file upload & raw log paste modal
│       ├── ParameterGrid.tsx    # High-density parameter cards grouped by scientific category
│       ├── ParsingAuditDrawer.tsx # Slide-over inspection drawer with source code snippets
│       ├── DeltaCalculator.tsx  # Interactive complex vs ligand delta pairing workbench
│       ├── DatasetMatrix.tsx    # Multi-file batch spreadsheet matrix
│       ├── CsvExportModal.tsx   # Live CSV preview with custom column toggles
│       ├── RawLogViewer.tsx     # Full terminal log viewer with regex search
│       └── OpiScriptModal.tsx   # Python batch script modal for Colab/HPC
├── metadata.json                # AI Studio application metadata
└── package.json                 # Project dependencies & scripts
```

---

## Compatibility

- **ORCA Versions**: Verified for ORCA 4.0 through 6.x output logs.
- **Methods**: Restricted and Unrestricted DFT (RKS / UKS), hybrid functionals (B3LYP, PBE0, M06, etc.), def2 basis sets, D3/D4 dispersion corrections, CPCM/SMD solvent models.
- **Population Analyses**: NBO 3.1 / 6.0 / 7.0 Natural Population Analysis, Loewdin Atomic Charges, Loewdin Reduced Orbital Charges, and Mulliken fallback.

---

## License

This project is licensed under the Apache 2.0 License.
