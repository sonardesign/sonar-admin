-- Create "No Client" client and assign unassigned projects to it

-- Create the "No Client" client if it doesn't exist
INSERT INTO clients (id, name, is_active, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'No Client',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM clients WHERE name = 'No Client'
);

-- Get the "No Client" client ID
DO $$
DECLARE
  no_client_id UUID;
BEGIN
  -- Get the "No Client" client ID
  SELECT id INTO no_client_id FROM clients WHERE name = 'No Client' LIMIT 1;
  
  -- Update all projects with NULL client_id to use "No Client"
  IF no_client_id IS NOT NULL THEN
    UPDATE projects
    SET client_id = no_client_id,
        updated_at = NOW()
    WHERE client_id IS NULL;
    
    RAISE NOTICE 'Updated projects to use "No Client" client';
  ELSE
    RAISE NOTICE 'Could not find "No Client" client';
  END IF;
END $$;

