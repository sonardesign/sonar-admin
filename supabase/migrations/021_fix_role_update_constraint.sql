-- Fix Role Update Constraint
-- Description: Allow role changes from manager to admin by removing problematic constraint
-- Issue: The manager_must_be_manager_role constraint prevents updating a manager to admin
-- Solution: Drop the constraint and use a trigger for validation instead

-- Drop the old constraint that prevents role changes
ALTER TABLE public.project_manager_permissions 
DROP CONSTRAINT IF EXISTS manager_must_be_manager_role;

-- Create a function to validate manager/admin role
CREATE OR REPLACE FUNCTION validate_project_permission_role()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get the role of the user being assigned permission
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = NEW.manager_id;
    
    -- Only allow manager or admin roles
    IF user_role NOT IN ('manager', 'admin') THEN
        RAISE EXCEPTION 'Only managers and admins can have project-specific permissions';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to validate role on insert/update
DROP TRIGGER IF EXISTS trigger_validate_project_permission_role ON public.project_manager_permissions;

CREATE TRIGGER trigger_validate_project_permission_role
    BEFORE INSERT OR UPDATE ON public.project_manager_permissions
    FOR EACH ROW
    EXECUTE FUNCTION validate_project_permission_role();

-- Add comment for documentation
COMMENT ON FUNCTION validate_project_permission_role() IS 
'Validates that only managers and admins can have project-specific permissions. Allows role transitions from manager to admin.';

