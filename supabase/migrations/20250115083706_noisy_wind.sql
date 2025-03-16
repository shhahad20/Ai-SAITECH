/*
  # Document Management Schema

  1. New Tables
    - `documents`
      - `id` (uuid, primary key)
      - `name` (text) - Original filename
      - `content` (text) - Document content
      - `user_id` (uuid) - Reference to auth.users
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `document_chunks`
      - `id` (uuid, primary key)
      - `document_id` (uuid) - Reference to documents
      - `content` (text) - Chunk content
      - `page_number` (integer)
      - `section_title` (text)
      - `embedding` (vector) - OpenAI embedding
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own documents
*/

-- Enable pgvector extension for embeddings
create extension if not exists vector;

-- Documents table
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  content text not null,
  user_id uuid references auth.users not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Document chunks table
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents on delete cascade not null,
  content text not null,
  page_number integer not null,
  section_title text,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table documents enable row level security;
alter table document_chunks enable row level security;

-- Policies for documents
create policy "Users can insert their own documents"
  on documents for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can view their own documents"
  on documents for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update their own documents"
  on documents for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own documents"
  on documents for delete
  to authenticated
  using (auth.uid() = user_id);

-- Policies for document chunks
create policy "Users can insert chunks for their documents"
  on document_chunks for insert
  to authenticated
  with check (
    exists (
      select 1 from documents
      where documents.id = document_chunks.document_id
      and documents.user_id = auth.uid()
    )
  );

create policy "Users can view chunks of their documents"
  on document_chunks for select
  to authenticated
  using (
    exists (
      select 1 from documents
      where documents.id = document_chunks.document_id
      and documents.user_id = auth.uid()
    )
  );

-- Create updated_at trigger for documents
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger documents_updated_at
  before update on documents
  for each row
  execute function update_updated_at();