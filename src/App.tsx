/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FileUploadZone } from './components/FileUploadZone';
import { ParameterGrid } from './components/ParameterGrid';
import { DeltaCalculator } from './components/DeltaCalculator';
import { DatasetMatrix } from './components/DatasetMatrix';
import { TableS3DictionaryModal } from './components/TableS3DictionaryModal';
import { CsvExportModal } from './components/CsvExportModal';
import { RawLogViewer } from './components/RawLogViewer';
import { OpiScriptModal } from './components/OpiScriptModal';
import { ParsingAuditDrawer } from './components/ParsingAuditDrawer';
import { CoordinationAssignment, DeltaDescriptors, OrcaCalculation, TableS3Descriptors } from './types/orca';
import { parseOrcaOutput } from './utils/orcaParser';
import { computeDelta } from './utils/csvExport';
import {
  SAMPLE_ORCA_COMPLEX_OAN,
  SAMPLE_ORCA_LIGAND_OAN,
  SAMPLE_ORCA_COMPLEX_BIAR,
} from './utils/sampleData';

export default function App() {
  const [calculations, setCalculations] = useState<OrcaCalculation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inspect' | 'delta' | 'dataset' | 'dictionary'>('inspect');
  const [savedDeltas, setSavedDeltas] = useState<DeltaDescriptors[]>([]);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isOpiOpen, setIsOpiOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [activeAuditParam, setActiveAuditParam] = useState<keyof TableS3Descriptors>('pd_c');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Initialize with benchmark calculation runs on initial mount
  useEffect(() => {
    const calc1 = parseOrcaOutput('Pd_PS_oAn_complex.out', SAMPLE_ORCA_COMPLEX_OAN);
    const calc2 = parseOrcaOutput('PS_oAn_ligand.out', SAMPLE_ORCA_LIGAND_OAN);
    const calc3 = parseOrcaOutput('Pd_PS_biAr_complex.out', SAMPLE_ORCA_COMPLEX_BIAR);

    setCalculations([calc1, calc2, calc3]);
    setActiveId(calc1.id);

    // Auto-calculate initial delta pair for Pd_PS_oAn
    const initDelta = computeDelta(calc1, calc2);
    setSavedDeltas([initDelta]);
  }, []);

  const activeCalculation = calculations.find((c) => c.id === activeId) || calculations[0];

  const handleAddCalculation = (calc: OrcaCalculation) => {
    setCalculations((prev) => [calc, ...prev]);
    setActiveId(calc.id);
    setStatusMessage(`Parsed ${calc.fileName} successfully.`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDeleteCalculation = (id: string) => {
    setCalculations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (activeId === id) {
        setActiveId(remaining[0]?.id || null);
      }
      return remaining;
    });
    setSavedDeltas((prev) => prev.filter((d) => d.complexId !== id && d.ligandId !== id));
  };

  const handleToggleCalcType = (id: string) => {
    setCalculations((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextType = c.calcType === 'complex' ? 'ligand' : 'complex';
          return { ...c, calcType: nextType };
        }
        return c;
      })
    );
  };

  const handleUpdateDescriptor = (key: keyof TableS3Descriptors, value: number | undefined) => {
    if (!activeCalculation) return;
    setCalculations((prev) =>
      prev.map((c) => {
        if (c.id === activeCalculation.id) {
          return {
            ...c,
            descriptors: { ...c.descriptors, [key]: value },
            descriptorsMeta: {
              ...c.descriptorsMeta,
              [key]: {
                method: 'manual',
                confidence: 'high',
                rawSnippet: `Manual user edit: ${value}`,
              },
            },
          };
        }
        return c;
      })
    );
  };

  const handleUpdateCoordination = (calcId: string, assignment: CoordinationAssignment) => {
    setCalculations((prev) =>
      prev.map((c) => {
        if (c.id === calcId) {
          return { ...c, coordination: assignment };
        }
        return c;
      })
    );
    setStatusMessage('Updated coordination sphere atom assignments.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleOpenAudit = (key: keyof TableS3Descriptors) => {
    setActiveAuditParam(key);
    setIsAuditDrawerOpen(true);
  };

  const handleAiExtract = async () => {
    if (!activeCalculation) return;
    setIsAiLoading(true);
    setStatusMessage('Querying Gemini AI extraction agent...');

    try {
      const response = await fetch('/api/orca/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logSnippet: activeCalculation.rawText,
          fileName: activeCalculation.fileName,
          currentDescriptors: activeCalculation.descriptors,
        }),
      });

      const data = await response.json();
      if (data.descriptors) {
        setCalculations((prev) =>
          prev.map((c) => {
            if (c.id === activeCalculation.id) {
              const updatedDescriptors = { ...c.descriptors, ...data.descriptors };
              delete (updatedDescriptors as Record<string, unknown>).aiNotes;
              return {
                ...c,
                descriptors: updatedDescriptors,
                aiProcessed: true,
                aiNotes: data.aiNotes || data.warning || 'Parameters verified by Gemini AI.',
              };
            }
            return c;
          })
        );
        setStatusMessage('AI Validation complete!');
      } else {
        setStatusMessage(data.warning || 'No new parameters returned by AI agent.');
      }
    } catch (err: unknown) {
      console.error(err);
      setStatusMessage('AI validation request failed. Check server connection.');
    } finally {
      setIsAiLoading(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleSaveDelta = (delta: DeltaDescriptors) => {
    setSavedDeltas((prev) => {
      const filtered = prev.filter(
        (d) => !(d.complexId === delta.complexId && d.ligandId === delta.ligandId)
      );
      return [...filtered, delta];
    });
    setStatusMessage(`Saved delta pair (${delta.complexName} - ${delta.ligandName}) to CSV dataset.`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenOpi={() => setIsOpiOpen(true)}
        totalCalculations={calculations.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Status Toast Ribbon */}
        {statusMessage && (
          <div className="mb-4 px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-sm flex items-center justify-between transition-all">
            <span>{statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-white ml-2 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* File Ingestion & Benchmark Zone */}
        <FileUploadZone
          calculations={calculations}
          activeId={activeId}
          onSelectCalculation={(id) => {
            setActiveId(id);
            if (activeTab !== 'inspect') setActiveTab('inspect');
          }}
          onAddCalculation={handleAddCalculation}
          onDeleteCalculation={handleDeleteCalculation}
          onToggleCalcType={handleToggleCalcType}
        />

        {/* Tab Content */}
        {activeTab === 'inspect' && activeCalculation && (
          <div className="space-y-6">
            <ParameterGrid
              calculation={activeCalculation}
              onUpdateDescriptor={handleUpdateDescriptor}
              onAiExtract={handleAiExtract}
              isAiLoading={isAiLoading}
              onOpenAudit={handleOpenAudit}
            />
            <RawLogViewer
              fileName={activeCalculation.fileName}
              rawText={activeCalculation.rawText}
            />
          </div>
        )}

        {activeTab === 'delta' && (
          <DeltaCalculator
            calculations={calculations}
            onSaveDelta={handleSaveDelta}
            savedDeltas={savedDeltas}
          />
        )}

        {activeTab === 'dataset' && (
          <DatasetMatrix
            calculations={calculations}
            savedDeltas={savedDeltas}
            onSelectCalculation={(id) => {
              setActiveId(id);
              setActiveTab('inspect');
            }}
            onOpenExport={() => setIsExportOpen(true)}
          />
        )}

        {activeTab === 'dictionary' && <TableS3DictionaryModal />}
      </main>

      {/* Parsing Audit Drawer */}
      {activeCalculation && (
        <ParsingAuditDrawer
          isOpen={isAuditDrawerOpen}
          onClose={() => setIsAuditDrawerOpen(false)}
          calculation={activeCalculation}
          activeParamKey={activeAuditParam}
          onSelectParamKey={setActiveAuditParam}
          onUpdateDescriptor={handleUpdateDescriptor}
          onUpdateCoordination={handleUpdateCoordination}
        />
      )}

      {/* CSV Export Configuration Modal */}
      <CsvExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        calculations={calculations}
        savedDeltas={savedDeltas}
      />

      {/* FACCTs OPI Python Script Modal */}
      <OpiScriptModal
        isOpen={isOpiOpen}
        onClose={() => setIsOpiOpen(false)}
      />

      <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
        <p>
          ORCA Computational Chemistry Table S3 Parsing Agent · Parameters extracted based on Akita et al., <em>Organometallics</em> 2022
        </p>
      </footer>
    </div>
  );
}
