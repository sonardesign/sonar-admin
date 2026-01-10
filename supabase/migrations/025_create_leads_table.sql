-- Create leads table for sales funnel management
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    industry TEXT,
    ticket_size INTEGER, -- Amount in HUF
    website TEXT,
    notes TEXT,
    contacts TEXT[], -- Array of contact names/emails
    related_tasks UUID[], -- Array of task IDs (time_entries)
    status TEXT NOT NULL DEFAULT 'contacted',
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('contacted', 'prospect', 'lead', 'negotiation', 'contract', 'lost'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON public.leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads
-- Allow all authenticated users to read all leads
CREATE POLICY "leads_select_policy" ON public.leads
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert leads
CREATE POLICY "leads_insert_policy" ON public.leads
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- Allow users to update leads they created, managers and admins can update all
CREATE POLICY "leads_update_policy" ON public.leads
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = created_by 
        OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Allow users to delete leads they created, only admins can delete all
CREATE POLICY "leads_delete_policy" ON public.leads
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() = created_by 
        OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_leads_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.leads IS 'Sales leads and pipeline management';
COMMENT ON COLUMN public.leads.status IS 'Lead status: contacted, prospect, lead, negotiation, contract, lost';
COMMENT ON COLUMN public.leads.ticket_size IS 'Expected deal size in HUF';
COMMENT ON COLUMN public.leads.contacts IS 'Array of contact names or emails';
COMMENT ON COLUMN public.leads.related_tasks IS 'Array of related task IDs from time_entries table';

