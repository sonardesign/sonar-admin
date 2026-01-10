-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  organization_name TEXT,
  url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all contacts
CREATE POLICY "Users can view all contacts"
  ON public.contacts
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Users can insert contacts
CREATE POLICY "Users can insert contacts"
  ON public.contacts
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

-- Policy: Users can update their own contacts
CREATE POLICY "Users can update their own contacts"
  ON public.contacts
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Policy: Users can delete their own contacts
CREATE POLICY "Users can delete their own contacts"
  ON public.contacts
  FOR DELETE
  USING (auth.uid() = created_by);

-- Create updated_at trigger
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index on created_by for faster queries
CREATE INDEX idx_contacts_created_by ON public.contacts(created_by);

-- Create index on name for faster searches
CREATE INDEX idx_contacts_name ON public.contacts(name);

