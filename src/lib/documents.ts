import { supabase } from './supabase';
import { analyzeDocument } from './openai';
import type { Document, DocumentMetadata } from '../types';
import mammoth from 'mammoth';
import { isSupabaseConfigured } from './supabase';

// Constants for text processing
const CHUNK_SIZE = 3000;
const CHUNK_OVERLAP = 200;

interface DocumentAnalysis {
  topics: string[];
  concepts: string[];
  tags: string[];
  summary: string;
}

async function analyzeDocumentContent(content: string): Promise<DocumentAnalysis> {
  try {
    const analysis = await analyzeDocument(content);
    return JSON.parse(analysis);
  } catch (error) {
    console.error('Error analyzing document content:', error);
    return {
      topics: [],
      concepts: [],
      tags: [],
      summary: 'Analysis failed'
    };
  }
}

function sanitizeContent(content: string): string {
  return content
    .replace(/\u0000/g, '')
    .replace(/[\uFFFD\uFFFE\uFFFF]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim();
}

async function extractTextFromDocx(file: File): Promise<string> {
  try {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          if (!e.target?.result) {
            throw new Error('Failed to read file content');
          }
          const arrayBuffer = e.target.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          if (!result.value) {
            throw new Error('Failed to extract text from document');
          }
          resolve(result.value);
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Failed to process DOCX file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to process DOCX file');
  }
}

export async function uploadDocument(
  name: string, 
  file: File, 
  sectionId: string,
  isUniversal: boolean = false
): Promise<Document> {
  if (!isSupabaseConfigured()) {
    throw new Error('Please connect to Supabase first using the "Connect to Supabase" button in the top right corner.');
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be logged in to upload documents');
  }

  if (isUniversal) {
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      throw new Error('Only administrators can upload universal documents');
    }
  }

  try {
    let content: string;
    
    if (!file) {
      throw new Error('No file provided');
    }

    if (file.size === 0) {
      throw new Error('File is empty');
    }

    if (file.size > 20 * 1024 * 1024) {
      throw new Error('File size must be less than 20MB');
    }
    
    const fileType = name.toLowerCase();
    if (fileType.endsWith('.docx')) {
      content = await extractTextFromDocx(file);
    } else if (fileType.endsWith('.txt')) {
      content = await file.text();
    } else {
      throw new Error('Unsupported file type. Please upload a .docx or .txt file.');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Document appears to be empty');
    }

    const sanitizedContent = sanitizeContent(content);

    if (sanitizedContent.length === 0) {
      throw new Error('Document contains no valid text content');
    }

    // Analyze document content
    const analysis = await analyzeDocumentContent(sanitizedContent);
    
    // Create document metadata
    const metadata: DocumentMetadata = {
      topics: analysis.topics || [],
      concepts: analysis.concepts || [],
      tags: analysis.tags || [],
      summary: analysis.summary || '',
      lastUpdated: new Date().toISOString(),
      section: sectionId
    };

    // Use the manage_document function to create the document
    const { data: result, error: fnError } = await supabase.rpc('manage_document', {
      p_action: 'create',
      p_name: sanitizeContent(name),
      p_content: sanitizedContent,
      p_section_id: sectionId,
      p_is_universal: isUniversal
    });

    if (fnError) {
      console.error('Document upload error:', fnError);
      throw new Error('Failed to upload document to database');
    }

    // Get the created document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', result.id)
      .single();

    if (docError || !document) {
      throw new Error('Failed to retrieve created document');
    }

    // Create audit log entry
    await supabase.from('document_audit_logs').insert({
      document_id: document.id,
      action: 'create',
      user_id: user.id,
      version: 1,
      changes: 'Initial document creation'
    });

    return document as Document;
  } catch (error) {
    console.error('Error processing document:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to process document. Please try again.');
  }
}

export async function getDocuments(): Promise<Document[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Please connect to Supabase first using the "Connect to Supabase" button in the top right corner.');
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error('Authentication error');
  }

  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .or(`user_id.eq.${user?.id},is_universal.eq.true`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      throw new Error('Failed to fetch documents');
    }

    return documents as Document[];
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to fetch documents. Please try again.');
  }
}

export async function deleteDocument(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Please connect to Supabase first using the "Connect to Supabase" button in the top right corner.');
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Authentication required');
  }

  // Use the manage_document function to delete the document
  const { error: fnError } = await supabase.rpc('manage_document', {
    p_action: 'delete',
    p_document_id: id
  });

  if (fnError) {
    console.error('Error deleting document:', fnError);
    throw new Error('Failed to delete document');
  }
}