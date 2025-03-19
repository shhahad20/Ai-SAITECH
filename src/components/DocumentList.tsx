import React from 'react';
import { Trash2, FileText, Globe, Lock, History, FolderOpen } from 'lucide-react';
import type { Document } from '../types';
import { DOCUMENT_SECTIONS } from '../lib/constants';

interface DocumentListProps {
  documents: Document[];
  onDelete: (id: string) => void;
  onViewHistory?: (id: string) => void;
  activeSection?: string;
}

export const DocumentList: React.FC<DocumentListProps> = ({ 
  documents, 
  onDelete,
  onViewHistory,
  activeSection
}) => {
// In DocumentList component
const filteredDocuments = activeSection
  ? documents.filter(doc => doc.section_id === activeSection)
  : documents;

  const getSectionName = (sectionId: string) => {
    return Object.values(DOCUMENT_SECTIONS).find(section => section.id === sectionId)?.name || 'Unknown Section';
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3">
        {activeSection ? getSectionName(activeSection) : 'All Documents'}
      </h3>
      
      {filteredDocuments.length === 0 ? (
        <p className="text-sm text-gray-400">No documents available</p>
      ) : (
        <ul className="space-y-2">
          {filteredDocuments.map((doc) => (
            <li 
              key={doc.id}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                {doc.is_universal ? (
                  <Globe className="w-4 h-4 text-blue-400" />
                ) : (
                  <FileText className="w-4 h-4 text-gray-400" />
                )}
                <div className="flex flex-col">
                  <span className="text-sm text-gray-300">{doc.name}</span>
                  <span className="text-xs text-gray-500">
                    {getSectionName(doc.section_id)}
                  </span>
                </div>
                {doc.is_universal && (
                  <Lock className="w-3 h-3 text-gray-400" title="Universal Document" />
                )}
                <span className="text-xs text-gray-500">v{doc.version}</span>
              </div>
              <div className="flex items-center gap-2">
                {onViewHistory && (
                  <button
                    onClick={() => onViewHistory(doc.id)}
                    className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                    title="View history"
                  >
                    <History className="w-4 h-4" />
                  </button>
                )}
                {(!doc.is_universal || (doc.is_universal && doc.created_by === doc.user_id)) && (
                  <button
                    onClick={() => onDelete(doc.id)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};