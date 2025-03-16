import React, { useState } from 'react';
import { Download, X } from 'lucide-react';

interface ExportDataProps {
  data: any[];
  onClose: () => void;
}

export const ExportData: React.FC<ExportDataProps> = ({ data, onClose }) => {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');

  const exportData = () => {
    let content: string;
    let filename: string;
    let type: string;

    if (format === 'csv') {
      // Convert to CSV
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(item => 
        Object.values(item).map(value => 
          typeof value === 'string' ? `"${value}"` : value
        ).join(',')
      );
      content = [headers, ...rows].join('\n');
      filename = 'export.csv';
      type = 'text/csv';
    } else {
      // Convert to JSON
      content = JSON.stringify(data, null, 2);
      filename = 'export.json';
      type = 'application/json';
    }

    // Create and trigger download
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium">Export Data</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Export Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'csv' | 'json')}
              className="w-full bg-gray-700 rounded-lg px-4 py-2"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <button
            onClick={exportData}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>
    </div>
  );
};