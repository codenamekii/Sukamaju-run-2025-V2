// app/admin/dashboard/import/page.tsx
"use client";

import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  Upload,
  Users,
  X
} from 'lucide-react';
import { useCallback, useState } from 'react';

interface ImportData {
  namaLengkap: string;
  jenisKelamin: string;
  usia: string;
  namaBib: string;
  noWhatsapp: string;
  email: string;
  kategoriLari: string;
  ukuranJersey: string;
  nomorBib: string;
  kategoriPromo: string;
}

interface ValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
}

interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  errors: ValidationError[];
  importedBibs: string[];
  duplicates: Array<{
    row: number;
    email: string;
    existingName?: string;
  }>;
}

interface ParseResult {
  data: ImportData[];
  errors: ValidationError[];
  warnings: ValidationError[];
  total: number;
  hasErrors: boolean;
  hasWarnings: boolean;
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
}

export default function ImportParticipantsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [data, setData] = useState<ImportData[]>([]);
  const [parseErrors, setParseErrors] = useState<ValidationError[]>([]);
  const [parseWarnings, setParseWarnings] = useState<ValidationError[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Handle file drop
  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile);
      parseFile(droppedFile);
    } else {
      alert('Please upload a CSV file. Convert Excel to CSV first.');
    }
  }, []);

  // Parse CSV file
  const parseFile = async (selectedFile: File) => {
    setParsing(true);
    setParseErrors([]);
    setParseWarnings([]);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/admin/import/parse', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const parseResult: ParseResult = await response.json();
        setData(parseResult.data);
        setParseErrors(parseResult.errors || []);
        setParseWarnings(parseResult.warnings || []);

        if (parseResult.data.length > 0) {
          setShowPreview(true);
        } else {
          alert('No valid data found in file');
        }
      } else {
        const error = await response.json();
        alert(`Failed to parse file: ${error.message || error.error}`);
      }
    } catch (error) {
      console.error('Parse error:', error);
      alert('Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  // Import data to database
  const handleImport = async () => {
    if (data.length === 0 || parseErrors.length > 0) return;

    setImporting(true);
    try {
      const response = await fetch('/api/admin/import/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: data })
      });

      if (response.ok) {
        const importResult: ImportResult = await response.json();
        setResult(importResult);
        setShowPreview(false);
        setData([]);
        setFile(null);
        setParseErrors([]);
        setParseWarnings([]);
      } else {
        const error = await response.json();
        alert(`Import failed: ${error.message || error.error}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import data');
    } finally {
      setImporting(false);
    }
  };

  // Download template
  const downloadTemplate = () => {
    const template = `Nama Lengkap,Jenis Kelamin,Usia,Nama BiB,No. Whatsapp,Email,Kategori Lari,Ukuran Jersey,No. BiB,Kategori Promo
John Doe,Laki-laki,25,JOHN,08123456789,john@example.com,5K,L,,EARLY_BIRD
Jane Smith,Perempuan,30,JANE,08234567890,jane@example.com,10K,M,,NORMAL`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_import_participants.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Reset everything
  const resetImport = () => {
    setShowPreview(false);
    setData([]);
    setFile(null);
    setParseErrors([]);
    setParseWarnings([]);
    setResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Participants</h1>
          <p className="text-sm text-gray-500 mt-1">
            Import participant data from Google Form CSV
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Template
        </button>
      </div>

      {/* Import Result */}
      {result && (
        <div className={`p-4 rounded-lg ${result.failed > 0 || result.skipped > 0
            ? 'bg-yellow-50 border border-yellow-200'
            : 'bg-green-50 border border-green-200'
          }`}>
          <div className="flex items-start gap-3">
            {result.failed === 0 && result.skipped === 0 ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                Import Complete
              </h3>
              <div className="mt-2 space-y-1">
                {result.success > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-green-700">
                      <strong>{result.success}</strong> participants imported successfully
                    </span>
                  </div>
                )}
                {result.skipped > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-yellow-700">
                      <strong>{result.skipped}</strong> skipped (duplicates)
                    </span>
                  </div>
                )}
                {result.failed > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <X className="w-4 h-4 text-red-600" />
                    <span className="text-red-700">
                      <strong>{result.failed}</strong> failed to import
                    </span>
                  </div>
                )}
              </div>

              {/* Duplicates Section */}
              {result.duplicates && result.duplicates.length > 0 && (
                <details
                  className="mt-3"
                  open={expandedSection === 'duplicates'}
                  onToggle={(e) => setExpandedSection(e.currentTarget.open ? 'duplicates' : null)}
                >
                  <summary className="cursor-pointer text-sm text-gray-700 hover:text-gray-900 font-medium">
                    View duplicates ({result.duplicates.length})
                  </summary>
                  <div className="mt-2 bg-white rounded p-3 max-h-40 overflow-y-auto">
                    {result.duplicates.map((dup, i) => (
                      <div key={i} className="text-xs text-gray-600 py-1 border-b last:border-0">
                        <span className="font-medium">Row {dup.row}:</span> {dup.email}
                        {dup.existingName && (
                          <span className="text-gray-500"> - Already registered as: {dup.existingName}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Errors Section */}
              {result.errors && result.errors.length > 0 && (
                <details
                  className="mt-3"
                  open={expandedSection === 'errors'}
                  onToggle={(e) => setExpandedSection(e.currentTarget.open ? 'errors' : null)}
                >
                  <summary className="cursor-pointer text-sm text-red-700 hover:text-red-900 font-medium">
                    View errors ({result.errors.length})
                  </summary>
                  <div className="mt-2 bg-white rounded p-3 max-h-40 overflow-y-auto">
                    {result.errors.map((error, i) => (
                      <div key={i} className="text-xs text-red-600 py-1">
                        <span className="font-medium">Row {error.row}:</span> {error.field} - {error.message}
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Action Button */}
              <div className="mt-4">
                <button
                  onClick={resetImport}
                  className="text-sm px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  Import More Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {!showPreview && !result && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors bg-gray-50"
        >
          <FileSpreadsheet className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Drop your CSV file here
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            or click to browse
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0];
              if (selectedFile) {
                setFile(selectedFile);
                parseFile(selectedFile);
              }
            }}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer inline-flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Choose CSV File
          </label>
          {file && (
            <p className="mt-4 text-sm text-gray-600">
              Selected: {file.name}
            </p>
          )}
        </div>
      )}

      {/* Parsing Loader */}
      {parsing && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-lg text-gray-600">Parsing file...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a moment for large files</p>
        </div>
      )}

      {/* Preview */}
      {showPreview && !parsing && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">
                Data Preview
              </h3>
              <span className="text-sm text-gray-500">
                ({data.length} participants ready)
              </span>
            </div>
            <button
              onClick={resetImport}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Validation Messages */}
          {(parseErrors.length > 0 || parseWarnings.length > 0) && (
            <div className="px-6 py-4 space-y-3 bg-gray-50 border-b">
              {/* Critical Errors */}
              {parseErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <X className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-800">
                        Critical Errors ({parseErrors.length})
                      </h4>
                      <p className="text-xs text-red-700 mt-1">
                        These must be fixed before importing
                      </p>
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        {parseErrors.slice(0, 5).map((error, i) => (
                          <div key={i} className="text-xs text-red-600 mt-1">
                            Row {error.row}: {error.field} - {error.message}
                          </div>
                        ))}
                        {parseErrors.length > 5 && (
                          <p className="text-xs text-red-600 mt-2 font-medium">
                            ... and {parseErrors.length - 5} more errors
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {parseWarnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-yellow-800">
                        Warnings ({parseWarnings.length})
                      </h4>
                      <p className="text-xs text-yellow-700 mt-1">
                        These will be auto-corrected during import
                      </p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-yellow-700 hover:text-yellow-800">
                          View details
                        </summary>
                        <div className="mt-2 max-h-32 overflow-y-auto">
                          {parseWarnings.map((warning, i) => (
                            <div key={i} className="text-xs text-yellow-600 mt-1">
                              Row {warning.row}: {warning.field} - {warning.message}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WhatsApp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jersey</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Promo</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500">{i + 1}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{row.namaLengkap}</div>
                      <div className="text-xs text-gray-500">{row.namaBib}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {row.email || <span className="text-gray-400 italic">No email</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {row.noWhatsapp || <span className="text-gray-400 italic">No phone</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${row.kategoriLari === '10K'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                        }`}>
                        {row.kategoriLari}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.ukuranJersey}</td>
                    <td className="px-6 py-4">
                      {row.kategoriPromo && (
                        <span className="inline-flex px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                          {row.kategoriPromo}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.length > 10 && (
            <div className="px-6 py-3 bg-gray-50 text-center text-sm text-gray-500">
              Showing 10 of {data.length} participants
            </div>
          )}

          {/* Action Buttons */}
          <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
            <div className="text-sm">
              {parseErrors.length > 0 ? (
                <span className="text-red-600 flex items-center gap-2">
                  <X className="w-4 h-4" />
                  Fix errors before importing
                </span>
              ) : (
                <span className="text-green-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Ready to import
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={resetImport}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || parseErrors.length > 0 || data.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import {data.length} Participants
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Import Instructions</h3>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Export data from Google Form as <strong>CSV format</strong> (not Excel)</li>
              <li>Required columns: Nama Lengkap, Email OR No. Whatsapp (at least one)</li>
              <li>System will automatically:
                <ul className="ml-6 mt-1 list-disc list-inside text-xs">
                  <li>Skip duplicate emails/phone numbers</li>
                  <li>Generate BIB numbers sequentially</li>
                  <li>Set default values for missing data</li>
                  <li>Convert phone numbers to 62xxx format</li>
                </ul>
              </li>
              <li>Categories: 5K or 10K (default: 5K)</li>
              <li>Jersey sizes: XS, S, M, L, XL, XXL, 3XL, 4XL (default: M)</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}