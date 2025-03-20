import { Section, SubSection } from "../types";
// import { DOCUMENT_SECTIONS } from "./constants";
import { supabase } from "./supabase";
import { useCallback, useEffect, useState } from "react";

// Fetch full navigation hierarchy
export const fetchNavigationHierarchy = async (): Promise<Section[]> => {
  const { data, error } = await supabase
    .from('sections')
    .select(`
      id,
      name,
      slug,
      description,
      created_at,
      updated_at,
      sub_sections (
        id,
        name,
        slug,
        description,
        created_at,
        section_id
      )
    `)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error:', error);
    throw error;
  }

  // Transform the data with proper filtering
  return data.map(section => ({
    ...section,
    created_at: new Date(section.created_at),
    updated_at: new Date(section.updated_at),
    sub_sections: section.sub_sections
      ?.filter(sub => sub.section_id === section.id) // Ensure correct parentage
      ?.map(sub => ({
        ...sub,
        created_at: new Date(sub.created_at)
      })) || []
  }));
};
// Create new section
export const createSection = async (section: Omit<Section, 'id' | 'created_at' | 'updated_at'>): Promise<Section> => {
  const { data, error } = await supabase
    .from('sections')
    .insert(section)
    .select()
    .single();

  if (error) {
    console.error('Error creating section:', error);
    throw new Error('Failed to create section');
  }
  return data;
};

// Update existing section
export const updateSection = async (id: string, updates: Partial<Section>): Promise<Section> => {
  const { data, error } = await supabase
    .from('sections')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating section:', error);
    throw new Error('Failed to update section');
  }
  return data;
};

// Delete section and its sub-sections
export const deleteSection = async (id: string): Promise<void> => {
  // Delete related sub-sections first
  const { error: subError } = await supabase
    .from('sub_sections')
    .delete()
    .eq('section_id', id);

  if (subError) {
    console.error('Error deleting sub-sections:', subError);
    throw new Error('Failed to delete related sub-sections');
  }

  // Delete the section
  const { error } = await supabase
    .from('sections')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting section:', error);
    throw new Error('Failed to delete section');
  }
};

// Create new sub-section
export const createSubSection = async (
  subSection: Omit<SubSection, 'id' | 'created_at' | 'updated_at'>
): Promise<SubSection> => {
  const { data, error } = await supabase
    .from('sub_sections')
    .insert(subSection)
    .select()
    .single();

  if (error) {
    console.error('Error creating sub-section:', error);
    throw new Error('Failed to create sub-section');
  }
  return data;
};

// Update existing sub-section
export const updateSubSection = async (id: string, updates: Partial<SubSection>): Promise<SubSection> => {
  const { data, error } = await supabase
    .from('sub_sections')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating sub-section:', error);
    throw new Error('Failed to update sub-section');
  }
  return data;
};

// Delete sub-section
export const deleteSubSection = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('sub_sections')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting sub-section:', error);
    throw new Error('Failed to delete sub-section');
  }
};

// ======================
// React Hooks
// ======================

export const useNavigation = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchNavigationHierarchy();
      setSections(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load navigation');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sections, loading, error, refresh };
};

export const useTabStructure = () => {
  const { sections, loading, error } = useNavigation();

  const tabs = sections.map(section => ({
    id: section.slug,
    name: section.name,
    subTabs: section.sub_sections?.map(sub => ({
      id: sub.slug,
      name: sub.name,
      description: sub.description
    })) || []
  }));
  return { tabs, loading, error };
};
// ======================
// Navigation Helpers
// ======================

export const findSectionBySlug = (sections: Section[], slug: string): Section | undefined => {
  return sections.find(s => s.slug === slug);
};

export const findSubSectionBySlug = (section: Section, subSlug: string): SubSection | undefined => {
  return section.sub_sections?.find(sub => sub.slug === subSlug);
};

export const getDefaultSectionSlug = (sections: Section[]): string | null => {
  return sections[0]?.slug || null;
};

export const getDefaultSubSectionSlug = (section: Section): string | null => {
  return section.sub_sections?.[0]?.slug || null;
};