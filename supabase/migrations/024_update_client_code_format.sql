-- Update client code format to C + 3 digits (C001, C002, etc.)
-- This replaces the previous name-based format

-- Drop existing triggers first
DROP TRIGGER IF EXISTS trigger_set_client_code ON public.clients;
DROP TRIGGER IF EXISTS trigger_set_project_code ON public.projects;

-- Update function to generate client codes with C- + 3 letters from name
CREATE OR REPLACE FUNCTION public.get_next_client_code(client_name TEXT)
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    new_code TEXT;
    code_counter INTEGER := 1;
BEGIN
    -- Generate 3-letter prefix from client name
    prefix := public.generate_code_prefix(client_name);
    
    -- Base code: C- + prefix (e.g., C-ACM)
    new_code := 'C-' || prefix;
    
    -- Check if this code already exists, if so append a number
    WHILE EXISTS (SELECT 1 FROM public.clients WHERE client_code = new_code) LOOP
        code_counter := code_counter + 1;
        new_code := 'C-' || prefix || code_counter::TEXT;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Update function to generate project codes using client's prefix
CREATE OR REPLACE FUNCTION public.get_next_project_code(client_id UUID)
RETURNS TEXT AS $$
DECLARE
    client_code_full TEXT;
    prefix TEXT;
    next_num INTEGER;
    new_code TEXT;
BEGIN
    -- Get the client's code (e.g., C-ACM)
    SELECT client_code INTO client_code_full
    FROM public.clients
    WHERE id = client_id;
    
    -- If client has no code yet, return NULL
    IF client_code_full IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Extract the 3-letter prefix after "C-" (e.g., C-ACM -> ACM)
    prefix := SUBSTRING(client_code_full FROM 3);
    
    -- Find the highest number for this prefix
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(project_code FROM length(prefix) + 2) AS INTEGER)
    ), 0) + 1
    INTO next_num
    FROM public.projects
    WHERE project_code LIKE prefix || '-%'
    AND project_code ~ ('^' || prefix || '-\d{3}$');
    
    -- Format as prefix + - + 3-digit number (e.g., ACM-001, ACM-002)
    new_code := prefix || '-' || LPAD(next_num::TEXT, 3, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to set client_code on insert
CREATE OR REPLACE FUNCTION public.set_client_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.client_code IS NULL THEN
        NEW.client_code := public.get_next_client_code(NEW.name);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to set project_code on insert
CREATE OR REPLACE FUNCTION public.set_project_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.project_code IS NULL THEN
        NEW.project_code := public.get_next_project_code(NEW.client_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers
CREATE TRIGGER trigger_set_client_code
    BEFORE INSERT ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.set_client_code();

CREATE TRIGGER trigger_set_project_code
    BEFORE INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.set_project_code();

-- Regenerate all client codes with new format (C-XXX)
DO $$
DECLARE
    client_record RECORD;
    counter INTEGER := 0;
BEGIN
    -- Clear all existing client codes first
    UPDATE public.clients SET client_code = NULL;
    
    -- Regenerate client codes in created_at order
    FOR client_record IN 
        SELECT id, name 
        FROM public.clients 
        ORDER BY created_at ASC
    LOOP
        UPDATE public.clients 
        SET client_code = public.get_next_client_code(client_record.name)
        WHERE id = client_record.id;
        counter := counter + 1;
    END LOOP;
    
    RAISE NOTICE 'Regenerated % client codes', counter;
END $$;

-- Regenerate all project codes using client prefix
DO $$
DECLARE
    project_record RECORD;
    client_prefix TEXT;
    project_counter INTEGER;
    prefix_counts JSONB := '{}'::JSONB;
BEGIN
    -- Clear all existing project codes first
    UPDATE public.projects SET project_code = NULL;
    
    -- Process each project in creation order
    FOR project_record IN
        SELECT p.id, p.name, p.client_id, 
               SUBSTRING(c.client_code FROM 3) as client_prefix
        FROM public.projects p
        INNER JOIN public.clients c ON c.id = p.client_id
        ORDER BY p.created_at ASC
    LOOP
        client_prefix := project_record.client_prefix;
        
        -- Get current count for this client prefix (default to 0)
        project_counter := COALESCE((prefix_counts->>client_prefix)::INTEGER, 0) + 1;
        
        -- Update the project with new code
        UPDATE public.projects
        SET project_code = client_prefix || '-' || LPAD(project_counter::TEXT, 3, '0')
        WHERE id = project_record.id;
        
        -- Store updated count for this prefix
        prefix_counts := jsonb_set(prefix_counts, ARRAY[client_prefix], to_jsonb(project_counter));
        
        RAISE NOTICE 'Project "%" assigned code: %', project_record.name, client_prefix || '-' || LPAD(project_counter::TEXT, 3, '0');
    END LOOP;
END $$;

