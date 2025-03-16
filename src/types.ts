export interface ChatSession {
  messages: Message[];
  activeDocumentId: string | null;
  documentName: string | null;
  isNewChat: boolean;
}

export interface Answer {
  content: string;
  source: string;
  confidence: number;
}

// export interface Message {
//   id: string;
//   role: 'user' | 'assistant';
//   content: string;
//   timestamp: Date;
//   isHtml?: boolean;
//   alternativeAnswer?: string;
// }
export interface Message  {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isHtml?: boolean;
  alternativeAnswer?: string;
}

// new 
export type UnansweredQuestion = {
  id: string;
  question: string;
  answer: string;
  alternativeAnswer?: string;
  section: string;
  document?: string;
  timestamp: Date;
  resolved?: boolean;
  notes?: string;
};
export interface DocumentMetadata {
  topics: string[];
  concepts: string[];
  tags: string[];
  summary: string;
  lastUpdated: string;
  section?: string;
  category?: string;
}

export interface Document {
  id: string;
  name: string;
  content: string;
  metadata: DocumentMetadata;
  user_id: string;
  is_universal: boolean;
  version: number;
  created_by: string;
  last_modified_by: string;
  created_at: string;
  updated_at: string;
  section_id: string;
  category_id: string;
}

export interface DocumentCategory {
  id: string;
  name: string;
  description: string;
  parentId?: string;
}

export interface DocumentSection {
  id: string;
  name: string;
  description: string;
  categories: DocumentCategory[];
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  user_email: string;
  status: 'pending' | 'approved' | 'rejected';
  verification_data: Record<string, any>;
  admin_note?: string;
  created_at: string;
  verified_at?: string;
}

export interface User {
  id: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  is_verified: boolean;
  last_login?: string;
  created_at: string;
}

export interface DataVisualization {
  type: 'bar' | 'pie';
  title: string;
  data: Array<{
    name: string;
    value: number;
  }>;
}