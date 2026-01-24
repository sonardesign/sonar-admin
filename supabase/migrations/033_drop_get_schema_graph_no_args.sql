-- Remove legacy no-arg overload to avoid PGRST203 ambiguity
DROP FUNCTION IF EXISTS public.get_schema_graph();

