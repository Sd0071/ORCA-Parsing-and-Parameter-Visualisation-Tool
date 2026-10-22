/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Gemini SDK with User-Agent header
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// POST /api/orca/extract: AI parsing & parameter validation agent
app.post('/api/orca/extract', async (req, res) => {
  try {
    const { logSnippet, fileName, currentDescriptors } = req.body;

    if (!logSnippet || typeof logSnippet !== 'string') {
      return res.status(400).json({ error: 'Missing logSnippet text' });
    }

    if (!ai) {
      return res.json({
        success: false,
        warning: 'GEMINI_API_KEY is not configured on the server. Using deterministic parser outputs.',
        descriptors: currentDescriptors || {},
        aiNotes: 'Server running in deterministic offline mode without Gemini API key.',
      });
    }

    // Truncate snippet to 80,000 chars if larger, focusing on key sections
    const textToAnalyze = logSnippet.length > 80000
      ? logSnippet.slice(0, 40000) + '\n\n... [INTERMEDIATE SCF CYCLES OMITTED] ...\n\n' + logSnippet.slice(-40000)
      : logSnippet;

    const prompt = `You are an expert computational chemistry and ORCA quantum chemistry parsing agent.
Analyze the following computational chemistry output file (file name: "${fileName || 'calculation.out'}").
Your goal is to extract or verify the specific parameters required for catalytic machine learning analysis according to Table S3 of the research paper (*Organometallics* 2022 / Ethylene-Methyl Acrylate copolymerization).

Target Table S3 Parameters to extract:
- homo: Energy of Highest Occupied Molecular Orbital (in eV)
- lumo: Energy of Lowest Unoccupied Molecular Orbital (in eV)
- eta: Chemical hardness / gap (LUMO - HOMO in eV)
- mu: Absolute chemical potential ((HOMO + LUMO)/2 in eV)
- omega: Electrophilic index (mu^2 / (2 * eta) in eV)
- nbo_pd: NBO (or Loewdin) partial charge on central Palladium
- nbo_p: NBO partial charge on coordinated Phosphorus
- nbo_o: NBO partial charge on coordinated Oxygen (sulfonate)
- nbo_s: NBO partial charge on Sulfonate Sulfur
- polar1: First principal polarizability component / eigenvalue
- polar2: Second principal polarizability component / eigenvalue
- nmr_31p: 31P NMR isotropic chemical shift or shielding (in ppm)
- pd_dz2: Occupancy of the dz2 d-orbital on Palladium (from NAO analysis)
- dxy, dxz, dyz, dx2y2: Occupancies of other d-orbitals on Palladium
- ir_cc: Harmonic vibrational frequency of the coordinated C=C double bond (cm^-1)
- pd_c: Bond length of Pd-C in propyl/alkyl group (Angstrom)
- p_pd_o: Bite angle of P-Pd-O (degrees)
- p_c2_s: Shorter length of Pd-C in coordinated ethylene (Angstrom)
- p_c2_l: Longer length of Pd-C in coordinated ethylene (Angstrom)
- c_c: Length of C=C double bond in coordinated ethylene (Angstrom)
- vbur: Buried volume %Vbur if reported

Current preliminary deterministic parsed descriptors:
${JSON.stringify(currentDescriptors || {}, null, 2)}

Inspect the raw text below and return a verified JSON object. If a parameter is not found in the output, leave it null:

--- ORCA LOG SNIPPET START ---
${textToAnalyze}
--- ORCA LOG SNIPPET END ---`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              homo: { type: Type.NUMBER, description: 'HOMO energy in eV' },
              lumo: { type: Type.NUMBER, description: 'LUMO energy in eV' },
              eta: { type: Type.NUMBER, description: 'Gap LUMO - HOMO in eV' },
              mu: { type: Type.NUMBER, description: 'Chemical potential in eV' },
              omega: { type: Type.NUMBER, description: 'Electrophilic index in eV' },
              nbo_pd: { type: Type.NUMBER, description: 'NBO charge on Pd' },
              nbo_p: { type: Type.NUMBER, description: 'NBO charge on P' },
              nbo_o: { type: Type.NUMBER, description: 'NBO charge on O' },
              nbo_s: { type: Type.NUMBER, description: 'NBO charge on S' },
              polar1: { type: Type.NUMBER, description: 'Polarizability component 1' },
              polar2: { type: Type.NUMBER, description: 'Polarizability component 2' },
              nmr_31p: { type: Type.NUMBER, description: '31P NMR chemical shift in ppm' },
              pd_dz2: { type: Type.NUMBER, description: 'Pd dz2 occupancy' },
              dxy: { type: Type.NUMBER, description: 'Pd dxy occupancy' },
              dxz: { type: Type.NUMBER, description: 'Pd dxz occupancy' },
              dyz: { type: Type.NUMBER, description: 'Pd dyz occupancy' },
              dx2y2: { type: Type.NUMBER, description: 'Pd d(x2-y2) occupancy' },
              ir_cc: { type: Type.NUMBER, description: 'Coordinated C=C stretch freq in cm^-1' },
              pd_c: { type: Type.NUMBER, description: 'Pd-C bond length in Angstrom' },
              p_pd_o: { type: Type.NUMBER, description: 'P-Pd-O bite angle in degrees' },
              p_c2_s: { type: Type.NUMBER, description: 'Shorter Pd-C(ethylene) in Angstrom' },
              p_c2_l: { type: Type.NUMBER, description: 'Longer Pd-C(ethylene) in Angstrom' },
              c_c: { type: Type.NUMBER, description: 'C=C double bond length in Angstrom' },
              vbur: { type: Type.NUMBER, description: '%Vbur buried volume' },
              aiNotes: { type: Type.STRING, description: 'Brief audit notes of what was found and verified' },
            },
          },
        },
      });
    } catch (primaryErr: unknown) {
      console.warn('Primary model busy, retrying with gemini-3.1-flash-lite...', primaryErr);
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
    }

    const parsedJson = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      descriptors: parsedJson,
      aiNotes: parsedJson.aiNotes || 'AI validated against raw ORCA output.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Gemini extraction error:', errorMsg);
    return res.status(500).json({
      error: 'AI extraction failed',
      details: errorMsg,
      descriptors: req.body.currentDescriptors || {},
    });
  }
});

// Setup Vite in development or static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`ORCA QChem Parser Server listening on port ${port}`);
  });
}

startServer();
