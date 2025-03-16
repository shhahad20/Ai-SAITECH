import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, AlertCircle, Globe, Loader2 } from 'lucide-react';

interface FileUploadProps {
  accept: Record<string, string[]>;
  onUpload: (files: File[], isUniversal: boolean) => void;
  isAdmin?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  accept, 
  onUpload,
  isAdmin = false 
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUniversal, setIsUniversal] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      setError(null);
      setIsUploading(true);
      
      if (acceptedFiles.length === 0) {
        throw new Error('No files were accepted. Please check the file type.');
      }
      
      const file = acceptedFiles[0];
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      await onUpload(acceptedFiles, isUniversal);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to upload file. Please try again.';
      
      setError(errorMessage);
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  }, [onUpload, isUniversal]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize: 10485760,
    maxFiles: 1,
    disabled: isUploading,
    onDropRejected: (fileRejections) => {
      const error = fileRejections[0]?.errors[0]?.message || 'File was rejected';
      setError(error);
    },
  });

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex items-center gap-2">
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
      
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-blue-500'}
          ${error ? 'border-red-500 bg-red-500/5' : ''}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} disabled={isUploading} />
        
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