# Interactive Parsing Audit Drawer & Table S3 Provenance Engine

A comprehensive enhancement to the ORCA QChem Parser that resolves parsing discrepancies in geometric metrics, metal $d$-orbital occupancies, and spectroscopic (IR/NMR) values by introducing a dedicated **Interactive Parsing Audit Drawer**, exact line-by-line provenance tracing, and interactive coordination sphere validation.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Summary of Confirmed Choices & Scope Alignment:**
> - **Identified Discrepancy Areas**: Focused on the three critical domains highlighted by the user:
>   1. *3D Geometric Metrics*: Ensuring extraction from the **final converged cycle** (not intermediate geometry cycles), correctly identifying the coordinated sulfonate oxygen vs methoxy/free oxygens, and distinguishing the alkyl Pd–C bond from the coordinated ethylene $\text{C=C}$ carbons.
>   2. *Metal $d$-Orbital Occupancies*: Explicitly targeting **valence $4d$ orbitals** (e.g. $4d_{z^2}$, $4d_{xy}$, $4d_{xz}$, $4d_{yz}$, $4d_{x^2-y^2}$) in Natural Atomic Orbital (NAO) tables, rejecting fully occupied core $3d$ shells.
>   3. *Spectroscopy (IR & $^{31}\text{P}$ NMR)*: Tracing the exact normal mode for the coordinated $\text{C=C}$ stretch in the vibrational table, and reporting the isotropic shielding/shift from the NMR summary block.
> - **Preferred Diagnostic Tool**: Building an **Interactive Parsing Audit Drawer** that opens on demand or by clicking any descriptor card, displaying:
>   - The exact line number in the uploaded ORCA output.
>   - The surrounding raw text context window (5–10 lines).
>   - The parsing regex / rule that extracted the value.
>   - An **Atom Coordination Inspector** that lists the detected atoms ($\text{Pd}, \text{P}, \text{O}_{\text{coord}}, \text{C}_{\text{alkyl}}, \text{C}_1, \text{C}_2$) with their distances and allows 1-click reassignment if a different atom was intended.
>   - A **Vibrational Mode Selector** displaying all detected frequencies in the $1450\text{--}1680\text{ cm}^{-1}$ window so the user can verify or select the active alkene stretch.

---

## 1. Overview & Core Concept

- **What It Does**: Bridges the gap between automated parsing and computational chemistry verification. Chemists can click any parameter (or open the global Audit Drawer) to immediately see *why* and *how* the value was parsed, inspect the raw log lines highlighted in place, view candidate atoms/frequencies, and make adjustments that propagate automatically to the Table S3 matrix and CSV export.
- **Target Audience**: Computational chemists and catalysis researchers working with ORCA 5 and ORCA 6 calculations who need 100% auditability and verification for machine learning dataset creation.
- **Key Value**: Guarantees trust in the generated CSV dataset by eliminating black-box parsing errors and ambiguous atom assignments.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Descriptor Card Audit Click**:
   - Each parameter card on the Parameter Inspector displays an **"Audit Source"** pill button with its source line number (e.g. `Line 482 · NAO 4d`).
   - Clicking opens the **Interactive Parsing Audit Drawer** sliding smoothly from the right side.
2. **Audit Drawer Inspection**:
   - **Header**: Parameter name, Table S3 symbol, parsed value, and confidence rating (`High`, `Assigned`, `Estimated`).
   - **Provenance Code View**: Dark monospace code block showing the exact 10 lines from the ORCA log, with the parsed line highlighted in amber/yellow.
   - **Rule Explanation**: Human-readable explanation of how the value was extracted (e.g. *"Matched valence 4d(z2) occupancy from Natural Atomic Orbital and Population Analysis block on atom Pd #1"*).
   - **Live Value Override**: Inline input to adjust or confirm the value.
3. **Coordination Sphere & Geometry Inspector**:
   - Dedicated interactive panel for 3D coordinates:
     - Shows the final geometry cycle used (with total optimization steps count).
     - Lists coordinating candidates around Palladium: nearest Phosphorus, nearest Oxygens (with distance in \AA), and nearest Carbons.
     - Allows picking which Oxygen is the coordinating sulfonate O (recalculating $\angle\text{P-Pd-O}$ bite angle in real time) and which Carbons are the coordinated ethylene.
4. **Vibrational Mode Picker**:
   - Lists all modes in the $1400\text{--}1700\text{ cm}^{-1}$ range with their frequency, IR intensity, and symmetry/label so the user can select the exact coordinated $\text{C=C}$ stretch.

### Visual Identity & Layout Architecture
- Adheres strictly to the **Asymmetric Split Console** pattern from `frontend-design` and `science` domain guides.
- **Drawer Design**: Full-height slide-over drawer ($480\text{px}$ width on desktop) with backdrop scrim, clean tabs (*Source Snippet*, *Coordination Atoms*, *Candidate Modes*), and instant close via Escape key or close button.
- **Color Discipline**: 60% neutral canvas, 30% crisp structural panels with 1px hairline borders (`border-slate-200`), 10% cobalt (`#2563EB`) and amber (`#F59E0B`) telemetry highlights for matched log lines.
- **Tabular Figures**: Standardized `font-mono tabular-nums` for all distances, angles, occupancies, and line numbers.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Final Cycle Coordinate Enforcement**
  - *Chosen Approach*: Scan the ORCA log backwards (`for (let i = lines.length - 1; i >= 0; i--)`) to locate the **last occurrence** of `CARTESIAN COORDINATES (ANGSTROEM)` or `FINAL CARTESIAN COORDINATES`, ensuring intermediate geometry steps are never mistakenly parsed.
  - *Why*: Eliminates the most common cause of geometric discrepancies where starting geometries are read instead of converged minima.
- **Decision 2: Valence 4d vs Core 3d Discrimination**
  - *Chosen Approach*: Filter NAO lines specifically for `4d` (or valence $n$ shell) on Palladium, ignoring `3d` lines that always read `2.0000`.
  - *Why*: Directly resolves discrepancies where core occupancies were captured instead of the active valence $d$-electrons.
- **Decision 3: Interactive Coordination Sphere Reassignment**
  - *Chosen Approach*: Expose the detected atom indices in state, allowing the user to select alternative Oxygen or Carbon candidates with automatic real-time recalculation of bond lengths ($d_{\text{Pd-C}}$, $d_{\text{C=C}}$) and bite angles ($\angle\text{P-Pd-O}$).
  - *Why*: In phosphine-sulfonates with methoxy substituents, multiple Oxygens exist; allowing explicit selection guarantees complete correctness for any ligand architecture.

---

## 4. Technical Architecture & Data Strategy

### System Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                             BROWSER CLIENT                                 │
│                                                                            │
│  ┌──────────────────────┐      ┌────────────────────────────────────────┐  │
│  │ File Ingestion / Log │      │          ParameterGrid.tsx             │  │
│  │ (.out, .log, .txt)   │      │  • Table S3 Descriptor Cards           │  │
│  └──────────┬───────────┘      │  • "Audit Source" Pill on Every Card   │  │
│             │                  └───────────────────┬────────────────────┘  │
│             ▼                                      │                       │
│  ┌──────────────────────┐                          │                       │
│  │ orcaParser.ts        │                          │ Opens Drawer          │
│  │ • Final Cycle Coords │                          ▼                       │
│  │ • 4d Valence Filter  │      ┌────────────────────────────────────────┐  │
│  │ • Mode Table Builder │─────►│        ParsingAuditDrawer.tsx          │  │
│  │ • Full Line Mapping  │      │  • Line-by-Line Context Highlighting   │  │
│  └──────────────────────┘      │  • Atom Coordination Picker (P, O, C)  │  │
│                                │  • Frequency Mode Selector (C=C IR)    │  │
│                                │  • Real-Time Vector Math Recalculation │  │
│                                └────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

### Component & State Plan
- `src/types/orca.ts`:
  - Enhance `ParameterSourceMeta` to include `contextLines: string[]`, `matchedLineIndex: number`, `ruleDescription: string`, and `alternativeCandidates?: any[]`.
  - Add `CoordinationAssignment` type (`pdIndex`, `pIndex`, `oIndex`, `cAlkylIndex`, `cAlkene1Index`, `cAlkene2Index`).
- `src/utils/orcaParser.ts`:
  - Update coordinate scanning to strictly capture the last geometry block.
  - Update NAO parser to match valence `4d` specifically on Pd.
  - Collect all vibrational modes between $1300\text{--}1800\text{ cm}^{-1}$ with intensities for candidate selection.
  - Populate complete provenance context lines for every Table S3 descriptor.
- `src/components/ParsingAuditDrawer.tsx`:
  - Slide-over drawer with dark monospace log viewer highlighting matched lines.
  - Coordination atom reassignment tabs with candidate distance tables.
  - Frequency mode selector with IR intensity badges.
- `src/components/ParameterGrid.tsx`:
  - Add audit source buttons to every descriptor card triggering the drawer.
- `src/App.tsx`:
  - Wire audit drawer state and atom reassignment handlers.

---

## Verification Strategy
- Run `lint_applet` and `compile_applet` to ensure zero type errors.
- Test with sample files and verify that clicking any parameter card opens the audit drawer with the exact matching lines highlighted.
- Verify that changing atom indices recalculates distances and angles dynamically and syncs into the CSV export.
