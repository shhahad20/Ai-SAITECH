import React from 'react';
import { supabase } from '../lib/supabase';
import { Clock, User } from 'lucide-react';
import type { DocumentAuditLog } from '../types';

interface DocumentHistoryProps {
  documentId: string;
  onClose: () => void;
}

export const DocumentHistory: React.FC<DocumentHistoryProps> = ({ documentId, onClose }) => {
  const [history, setHistory] = React.useState<DocumentAuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchHistory() {
      try {
        const { data, error } = await supabase
          .from('document_audit_logs')
          .select(`
            *,
            user:user_id (
              email
            )
          `)
          .eq('document_id', documentId)
          .order('timestamp', { ascending: false });

        if (error) throw error;
        setHistory(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [documentId]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Document History</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            <p className="mt-2 text-gray-400">Loading history...</p>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-8">
            {error}
          </div>
        ) : history.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            No history available
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="border border-gray-700 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">
                      {entry.user?.email || 'Unknown User'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-blue-400">
                    {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                  </span>
                  <span className="text-sm text-gray-400 ml-2">
                    Version {entry.version}
                  </span>
                </div>
                <p className="text-sm text-gray-300">{entry.changes}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};