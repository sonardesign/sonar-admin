-- Add client_code and project_code fields
-- Format: 3 letters from client name + incremental number (e.g., ACM-001, ACM-002)

-- Add client_code field to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS client_code TEXT UNIQUE;

-- Add project_code field to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS project_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_client_code ON public.clients(client_code);
CREATE INDEX IF NOT EXISTS idx_projects_project_code ON public.projects(project_code);

-- Function to extract 3-letter code from name
CREATE OR REPLACE FUNCTION public.generate_code_prefix(name_text TEXT)
RETURNS TEXT AS $$
DECLARE
    cleaned_name TEXT;
    words TEXT[];
    prefix TEXT := '';
    char_count INTEGER := 0;
    word TEXT;
    char CHAR;
BEGIN
    -- Remove special characters and convert to uppercase
    cleaned_name := UPPER(REGEXP_REPLACE(name_text, '[^A-Za-z0-9\s]', '', 'g'));
    
    -- Split into words
    words := STRING_TO_ARRAY(cleaned_name, ' ');
    
    -- If single word with 3+ characters, take first 3
    IF array_length(words, 1) = 1 AND length(words[1]) >= 3 THEN
        RETURN SUBSTRING(words[1] FROM 1 FOR 3);
    END IF;
    
    -- Take first letter of each word until we have 3 letters
    FOREACH word IN ARRAY words
    LOOP
        IF char_count >= 3 THEN
            EXIT;
        END IF;
        
        IF length(word) > 0 THEN
            char := SUBSTRING(word FROM 1 FOR 1);
            -- Only add if it's a letter
            IF char ~ '[A-Z]' THEN
                prefix := prefix || char;
                char_count := char_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    -- If we don't have 3 letters, pad with X
    WHILE char_count < 3
    LOOP
        prefix := prefix || 'X';
        char_count := char_count + 1;
    END LOOP;
    
    RETURN prefix;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get next incremental number for a client code prefix
CREATE OR REPLACE FUNCTION public.get_next_client_code(client_name TEXT)
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    next_num INTEGER;
    new_code TEXT;
BEGIN
    -- Generate prefix from client name
    prefix := public.generate_code_prefix(client_name);
    
    -- Find the highest number for this prefix
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(client_code FROM length(prefix) + 2) AS INTEGER)
    ), 0) + 1
    INTO next_num
    FROM public.clients
    WHERE client_code LIKE prefix || '-%'
    AND client_code ~ ('^' || prefix || '-\d+$');
    
    -- Format as 3-digit number with leading zeros
    new_code := prefix || '-' || LPAD(next_num::TEXT, 3, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to get next incremental number for a project code prefix
CREATE OR REPLACE FUNCTION public.get_next_project_code(client_id UUID)
RETURNS TEXT AS $$
DECLARE
    client_name TEXT;
    prefix TEXT;
    next_num INTEGER;
    new_code TEXT;
BEGIN
    -- Get client name
    SELECT name INTO client_name
    FROM public.clients
    WHERE id = client_id;
    
    IF client_name IS NULL THEN
        RAISE EXCEPTION 'Client not found';
    END IF;
    
    -- Generate prefix from client name
    prefix := public.generate_code_prefix(client_name);
    
    -- Find the highest number for this prefix
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(project_code FROM length(prefix) + 2) AS INTEGER)
    ), 0) + 1
    INTO next_num
    FROM public.projects
    WHERE project_code LIKE prefix || '-%'
    AND project_code ~ ('^' || prefix || '-\d+$');
    
    -- Format as 3-digit number with leading zeros
    new_code := prefix || '-' || LPAD(next_num::TEXT, 3, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate client_code on insert
CREATE OR REPLACE FUNCTION public.set_client_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.client_code IS NULL OR NEW.client_code = '' THEN
        NEW.client_code := public.get_next_client_code(NEW.name);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_client_code
    BEFORE INSERT ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.set_client_code();

-- Trigger to auto-generate project_code on insert
CREATE OR REPLACE FUNCTION public.set_project_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.project_code IS NULL OR NEW.project_code = '' THEN
        NEW.project_code := public.get_next_project_code(NEW.client_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_project_code
    BEFORE INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.set_project_code();

-- Backfill existing clients and projects with codes
DO $$
DECLARE
    client_rec RECORD;
    project_rec RECORD;
    new_client_code TEXT;
    new_project_code TEXT;
BEGIN
    -- Backfill clients in creation order to ensure proper sequential numbering
    FOR client_rec IN 
        SELECT id, name 
        FROM public.clients 
        WHERE client_code IS NULL OR client_code = ''
        ORDER BY created_at ASC
    LOOP
        new_client_code := public.get_next_client_code(client_rec.name);
        UPDATE public.clients 
        SET client_code = new_client_code 
        WHERE id = client_rec.id;
    END LOOP;
    
    -- Backfill projects in creation order to ensure proper sequential numbering per client
    FOR project_rec IN 
        SELECT id, client_id 
        FROM public.projects 
        WHERE project_code IS NULL OR project_code = ''
        ORDER BY created_at ASC
    LOOP
        BEGIN
            new_project_code := public.get_next_project_code(project_rec.client_id);
            UPDATE public.projects 
            SET project_code = new_project_code 
            WHERE id = project_rec.id;
        EXCEPTION
            WHEN OTHERS THEN
                -- Skip projects with invalid client_id
                RAISE NOTICE 'Skipping project % due to error: %', project_rec.id, SQLERRM;
        END;
    END LOOP;
END $$;

