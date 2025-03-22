import React from 'react';
import { Trash2, FileText, Globe, Lock, History } from 'lucide-react';
import type { Document } from '../types';
import { useNavigation } from '../lib/sections';

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
  const { sections } = useNavigation();

  // Helper functions using your existing data structure
  const getSubSectionById = (subSectionId: string) => {
    return sections
      .flatMap(s => s.sub_sections || [])
      .find(sub => sub.id === subSectionId);
  };

  const getParentSection = (subSectionId: string) => {
    return sections.find(s => 
      s.sub_sections?.some(sub => sub.id === subSectionId)
    );
  };

  // Filter documents based on active subsection UUID
  const filteredDocuments = activeSection
    ? documents.filter(doc => doc.section_id === activeSection)
    : documents;

  // Get active subsection name
  const activeSubSection = activeSection 
    ? getSubSectionById(activeSection)?.name || 'Unknown Subsection'
    : 'All Documents';

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3">
        {activeSubSection}
      </h3>
      
      {filteredDocuments.length === 0 ? (
        <p className="text-sm text-gray-400">No documents available</p>
      ) : (
        <ul className="space-y-2">
          {filteredDocuments.map((doc) => {
            const subSection = getSubSectionById(doc.section_id);
            const parentSection = getParentSection(doc.section_id);

            return (
              <li 
                key={doc.id}
                className="flex items-center justify-between p-2 rounded hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {doc.is_universal ? (
                      <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-gray-300 truncate">{doc.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {parentSection?.name || 'Unknown Section'} → {subSection?.name || 'Unknown Subsection'}
                      </p>
                    </div>
                  </div>
                  {doc.is_universal && (
                    <Lock className="w-3 h-3 text-gray-400 shrink-0" title="Universal Document" />
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onViewHistory && (
                    <button
                      onClick={() => onViewHistory(doc.id)}
                      className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                      title="View history"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(doc.id)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete document"
                    disabled={doc.is_universal}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};