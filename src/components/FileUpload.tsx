import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, AlertCircle, Globe, Loader2 } from 'lucide-react';
import { useNavigation } from '../lib/sections';
import { uploadDocument } from '../lib/documents';
import type { Document, Section, SubSection } from '../types';

interface FileUploadProps {
  accept: Record<string, string[]>;
  onUploadSuccess: (document: Document) => void;
  onError: (error: string) => void;
  isAdmin?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  accept,
  onUploadSuccess,
  onError,
  isAdmin = false 
}) => {
  const { sections, loading: sectionsLoading } = useNavigation();
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedSubSection, setSelectedSubSection] = useState<SubSection | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUniversal, setIsUniversal] = useState(false);
  const [error, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (sections.length > 0) {
      const firstSection = sections[0];
      setSelectedSection(firstSection);
      if (firstSection.sub_sections?.length) {
        setSelectedSubSection(firstSection.sub_sections[0]);
      }
    }
  }, [sections]);

  const handleUpload = useCallback(async (file: File) => {
    try {
      setIsUploading(true);
      setLocalError(null);
      onError('');

      if (!selectedSubSection) {
        throw new Error('Please select a sub-section before uploading');
      }

      const document = await uploadDocument(
        file.name,
        file,
        selectedSubSection.id,
        isUniversal
      );

      onUploadSuccess(document);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to upload file. Please try again.';
      setLocalError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [selectedSubSection, isUniversal, onUploadSuccess, onError]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    
    if (file.size > 10 * 1024 * 1024) {
      onError('File size must be less than 10MB');
      return;
    }

    await handleUpload(file);
  }, [handleUpload, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize: 10485760,
    maxFiles: 1,
    disabled: isUploading || !selectedSubSection,
  });

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="space-y-3">
          {/* Section Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Select Section
            </label>
            <select
              value={selectedSection?.id || ''}
              onChange={(e) => {
                const section = sections.find(s => s.id === e.target.value);
                setSelectedSection(section || null);
                setSelectedSubSection(section?.sub_sections?.[0] || null);
              }}
              className="w-full bg-gray-700 rounded-lg py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={sectionsLoading || isUploading}
              style={{ border: "1px solid white" }}
            >
              {sectionsLoading ? (
                <option>Loading sections...</option>
              ) : (
                sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Sub-section Selection */}
          {selectedSection?.sub_sections?.length && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Select Sub-section
              </label>
              <select
                value={selectedSubSection?.id || ''}
                onChange={(e) => {
                  const subSection = selectedSection.sub_sections?.find(
                    sub => sub.id === e.target.value
                  );
                  setSelectedSubSection(subSection || null);
                }}
                className="w-full bg-gray-700 rounded-lg py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                disabled={sectionsLoading || isUploading}
                style={{ border: "1px solid white" }}
              >
                {selectedSection.sub_sections.map((subSection) => (
                  <option key={subSection.id} value={subSection.id}>
                    {subSection.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Universal Document Toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isUniversal}
              onChange={(e) => setIsUniversal(e.target.checked)}
              className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
              disabled={isUploading}
            />
            <Globe className="w-4 h-4" />
            Upload as Universal Document
          </label>
        </div>
      )}
      
      {/* Dropzone Area */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-blue-500'}
          ${error ? 'border-red-500 bg-red-500/5' : ''}
          ${isUploading || !selectedSubSection ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} disabled={isUploading || !selectedSubSection} />
        
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-sm text-gray-400">Uploading and processing document...</p>
          </div>
        ) : (
          <>
            <Upload className={`mx-auto h-12 w-12 ${error ? 'text-red-500' : 'text-gray-400'}`} />
            <p className="mt-2 text-sm text-gray-400">
              {isDragActive 
                ? 'Drop the files here...' 
                : 'Drag & drop files here, or click to select files'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Supported formats: .docx, .txt (Max 10MB)
            </p>
            {!selectedSubSection && isAdmin && (
              <p className="mt-2 text-xs text-red-400">
                Please select a section and sub-section first
              </p>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};