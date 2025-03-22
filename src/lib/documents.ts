import { supabase } from "./supabase";
import { analyzeDocument } from "./openai";
import type { Document, DocumentMetadata } from "../types";
import mammoth from "mammoth";
import { isSupabaseConfigured } from "./supabase";

// Constants for text processing
// const CHUNK_SIZE = 3000;
// const CHUNK_OVERLAP = 200;

interface DocumentAnalysis {
  topics: string[];
  concepts: string[];
  tags: string[];
  summary: string;
}

async function analyzeDocumentContent(
  content: string
): Promise<DocumentAnalysis> {
  try {
    const analysis = await analyzeDocument(content);
    return JSON.parse(analysis);
  } catch (error) {
    console.error("Error analyzing document content:", error);
    return {
      topics: [],
      concepts: [],
      tags: [],
      summary: "Analysis failed",
    };
  }
}

function sanitizeContent(content: string): string {
  return content
    .replace(/\u0000/g, "")
    .replace(/[\uFFFD\uFFFE\uFFFF]/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .trim();
}

async function extractTextFromDocx(file: File): Promise<string> {
  try {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          if (!e.target?.result) {
            throw new Error("Failed to read file content");
          }
          const arrayBuffer = e.target.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          if (!result.value) {
            throw new Error("Failed to extract text from document");
          }
          resolve(result.value);
        } catch (error) {
          reject(
            error instanceof Error
              ? error
              : new Error("Failed to process DOCX file")
          );
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("Failed to process DOCX file");
  }
}

export async function uploadDocument(
  name: string,
  file: File,
  sectionId: string,
  isUniversal: boolean = false
): Promise<Document> {
  // Validate Supabase connection
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Please connect to Supabase first using the "Connect to Supabase" button.'
    );
  }

  // Authentication check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("You must be logged in to upload documents");
  }

  // Admin check for universal docs
  if (isUniversal) {
    const { data: userData } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!userData?.is_admin) {
      throw new Error("Only administrators can upload universal documents");
    }
  }

  console.log(sectionId + " From Document");
  const { data: sectionData } = await supabase
    .from("sub_sections")
    .select("id")
    .eq("id", sectionId)
    .single();

  if (!sectionData) {
    throw new Error("Section not found");
  }
  sectionId = sectionData.id;

  try {
    // File validation
    if (!file) throw new Error("No file provided");
    if (file.size === 0) throw new Error("File is empty");
    if (file.size > 20 * 1024 * 1024)
      throw new Error("File size must be less than 20MB");

    // File type handling
    let content: string;
    const fileType = name.toLowerCase();

    if (fileType.endsWith(".docx")) {
      content = await extractTextFromDocx(file);
    } else if (fileType.endsWith(".txt")) {
      content = await file.text();
    } else {
      throw new Error("Unsupported file type. Please upload .docx or .txt");
    }

    // Content validation
    if (!content?.trim()) throw new Error("Document appears empty");
    const sanitizedContent = sanitizeContent(content);
    if (!sanitizedContent.length) throw new Error("No valid text content");

    // Document analysis
    let metadata: DocumentMetadata;
    try {
      const analysis = await analyzeDocumentContent(sanitizedContent);
      if (!analysis?.summary) {
        throw new Error("Analysis returned invalid data");
      }

      metadata = {
        topics: analysis.topics || [],
        concepts: analysis.concepts || [],
        tags: analysis.tags || [],
        summary: analysis.summary || "",
        lastUpdated: new Date().toISOString(),
        section: sectionId,
      };
    } catch (analysisError) {
      console.error("Analysis failed:", sanitizedContent);
      throw new Error(
        `Document analysis failed: ${(analysisError as Error).message}`
      );
    }

    console.log(sectionId);
    // Database insertion
    const { data: result, error: fnError } = await supabase.rpc(
      "manage_document",
      {
        p_action: "create",
        p_name: sanitizeContent(name),
        p_content: sanitizedContent,
        p_section_id: sectionId,
        p_is_universal: isUniversal,
        p_topics: metadata.topics,
        p_concepts: metadata.concepts,
        p_tags: metadata.tags,
        p_user_id: user.id,
        p_summary: metadata.summary,
      }
    );

    if (fnError || !result?.[0]?.id) {
      console.error("Database error:", fnError);
      throw new Error("Failed to create document record");
    }

    // Retrieve created document
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", result[0].id)
      .single();

    if (docError || !document) {
      throw new Error("Failed to retrieve created document");
    }

    // Create audit log
    const { error: auditError } = await supabase
      .from("document_audit_logs")
      .insert({
        document_id: document.id,
        action: "create",
        user_id: user.id,
        version: 1,
        changes: JSON.stringify({
          name: document.name,
          metadata: metadata,
        }),
      });

    if (auditError) {
      console.warn("Audit log error:", auditError);
    }

    return document as Document;
  } catch (error) {
    console.error("Upload process failed:", error);
    throw error instanceof Error
      ? error
      : new Error("Document processing failed");
  }
}

export async function getDocuments(): Promise<Document[]> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Please connect to Supabase first using the "Connect to Supabase" button in the top right corner.'
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error("Authentication error");
  }

  try {
    const { data: documents, error } = await supabase
      .from("documents")
      .select("*")
      // .or(`user_id.eq.${user?.id},is_universal.eq.true`)
      .or(`user_id.eq.${user?.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
      throw new Error("Failed to fetch documents");
    }

    return documents as Document[];
  } catch (error) {
    console.error("Error fetching documents:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to fetch documents. Please try again.");
  }
}

export async function deleteDocument(id: string): Promise<void> {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error(
        'Supabase connection required - use the "Connect to Supabase" button'
      );
    }

    // Verify authentication
    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("You must be logged in to upload documents");
    }

    // First create audit log
    const { error: auditError } = await supabase
      .from("document_audit_logs")
      .insert({
        document_id: id,
        action: "delete",
        user_id: user.id,
        changes: {
          deleted_by: user.id,
          deletion_attempt_at: new Date().toISOString(),
        },
      });
    if (auditError) {
      console.error("Audit log creation failed:", auditError);
      throw new Error("Failed to create deletion audit record");
    }

    // Attempt deletion
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Database deletion error:", {
        error: deleteError,
        documentId: id,
        userId: user.id,
      });
      throw new Error("Failed to delete document from database");
    }

    // console.log("Document deleted and audited successfully:", {
    //   documentId: id,
    // });
  } catch (error) {
    console.error("Document deletion process failed:", {
      error,
      documentId: id,
      timestamp: new Date().toISOString(),
    });

    const message =
      error instanceof Error
        ? error.message
        : "Document deletion failed due to an unexpected error";

    throw new Error(message);
  }
}
// Add to your documents.ts file
export async function updateDocument(
  id: string,
  updates: Partial<Document>
): Promise<Document> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase connection required");
  }

  const { data, error } = await supabase
    .from("documents")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Update error:", error);
    throw new Error("Failed to update document");
  }

  return data as Document;
}
