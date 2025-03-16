import { supabase } from './supabase';
import type { UnansweredQuestion } from '../types';

/* We need to create this table in Supabase */

// create table unanswered_questions (
//     id uuid primary key default uuid_generate_v4(),
//     question text not null,
//     answer text not null,
//     alternative_answer text,
//     section text not null,
//     document text,
//     timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
//     resolved boolean default false,
//     notes text
//   );
  
  
export const UnansweredQuestionsService = {
  // Create
  async createUnansweredQuestion(question: Omit<UnansweredQuestion, 'id' | 'timestamp'>) {
    const { data, error } = await supabase
      .from('unanswered_questions')
      .insert({
        ...question,
        timestamp: new Date().toISOString()
      })
      .select();

    if (error) throw new Error(error.message);
    return data?.[0] as UnansweredQuestion;
  },

  // Read
  async getUnansweredQuestions() {
    const { data, error } = await supabase
      .from('unanswered_questions')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw new Error(error.message);
    return data as UnansweredQuestion[];
  },

  async getUnansweredQuestionById(id: string) {
    const { data, error } = await supabase
      .from('unanswered_questions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as UnansweredQuestion;
  },

  // Update
  async updateUnansweredQuestion(id: string, updates: Partial<UnansweredQuestion>) {
    const { data, error } = await supabase
      .from('unanswered_questions')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw new Error(error.message);
    return data?.[0] as UnansweredQuestion;
  },

  // Delete
  async deleteUnansweredQuestion(id: string) {
    const { error } = await supabase
      .from('unanswered_questions')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return true;
  },

  // Additional useful operations
  async getBySection(section: string) {
    const { data, error } = await supabase
      .from('unanswered_questions')
      .select('*')
      .eq('section', section)
      .order('timestamp', { ascending: false });

    if (error) throw new Error(error.message);
    return data as UnansweredQuestion[];
  },

  async markAsResolved(id: string) {
    return this.updateUnansweredQuestion(id, { resolved: true });
  }
};

// Types
export type UnansweredQuestionCreate = Omit<UnansweredQuestion, 'id' | 'timestamp'>;