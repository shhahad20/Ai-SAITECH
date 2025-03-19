import { DOCUMENT_SECTIONS } from './constants';
import { supabase } from "./supabase";
import { useCallback, useEffect, useState } from 'react';

export interface DocumentSection {
  id: string;
  name: string;
  description: string;
  slug: string; // Added slug for human-readable IDs
  created_at: string;
}

// Fetch all document sections from database
export const fetchAllSections = async (): Promise<DocumentSection[]> => {
  const { data, error } = await supabase
    .from('sections')
    .select('*');
    // .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching sections:', error);
    throw new Error('Failed to load document sections');
  }

  return data;
};

// Get single section by ID
export const getSectionById = async (id: string): Promise<DocumentSection> => {
  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching section ${id}:`, error);
    throw new Error('Section not found');
  }

  return data;
};

// Get section by slug (human-readable ID)
// export const getSectionBySlug = async (slug: string): Promise<DocumentSection> => {
//   const { data, error } = await supabase
//     .from('sections')
//     .select('*')
//     .eq('slug', slug)
//     .single();

//   if (error) {
//     console.error(`Error fetching section ${slug}:`, error);
//     throw new Error('Section not found');
//   }

//   return data;
// };

// Initialize default sections in database (one-time setup)
export const initializeDefaultSections = async () => {
  const existingSections = await fetchAllSections();
  
  if (existingSections.length === 0) {
    const { error } = await supabase
      .from('sections')
      .upsert(
        Object.values(DOCUMENT_SECTIONS).map(section => ({
          ...section,
          slug: section.id // Use original ID as slug if needed
        })),
        { onConflict: 'slug' }
      );

    if (error) {
      console.error('Error initializing sections:', error);
      throw new Error('Failed to create default sections');
    }
  }
};

// Hook for React components
export const useDocumentSections = () => {
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSections = async () => {
      try {
        const data = await fetchAllSections();
        setSections(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sections');
      } finally {
        setLoading(false);
      }
    };

    loadSections();
  }, []);

  return { sections, loading, error };
};

// Hook for section navigation
export const useSectionNavigation = () => {
  const { sections } = useDocumentSections();

  const getSection = useCallback(
    (identifier: string) => {
      // Try UUID first
      const byId = sections.find(s => s.id === identifier);
      if (byId) return byId;
      
      // Then try slug
      const bySlug = sections.find(s => s.slug === identifier);
      return bySlug;
    },
    [sections]
  );

  return { getSection };
};