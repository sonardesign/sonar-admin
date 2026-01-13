-- Modify leads table to store contact IDs as UUID array
ALTER TABLE public.leads
ALTER COLUMN contacts TYPE UUID[] USING 
  CASE 
    WHEN contacts IS NULL THEN NULL
    ELSE ARRAY[]::UUID[]
  END;

-- Add comment to clarify the column stores contact IDs
COMMENT ON COLUMN public.leads.contacts IS 'Array of contact UUIDs referencing the contacts table';


