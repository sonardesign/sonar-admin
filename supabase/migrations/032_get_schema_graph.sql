-- RPC function to return database schema graph (tables, columns, relations)
CREATE OR REPLACE FUNCTION public.get_schema_graph(target_schemas TEXT[] DEFAULT ARRAY['public'])
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '10s'
AS $$
WITH tables AS (
  SELECT t.table_schema, t.table_name
  FROM information_schema.tables t
  WHERE t.table_type = 'BASE TABLE'
    AND t.table_schema = ANY(target_schemas)
),
columns AS (
  SELECT
    c.table_schema,
    c.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.ordinal_position
  FROM information_schema.columns c
  WHERE c.table_schema = ANY(target_schemas)
),
primary_keys AS (
  SELECT
    tc.table_schema,
    tc.table_name,
    kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
   AND tc.table_name = kcu.table_name
  WHERE tc.constraint_type = 'PRIMARY KEY'
),
table_json AS (
  SELECT
    t.table_schema AS schema,
    t.table_name AS name,
    jsonb_agg(
      jsonb_build_object(
        'name', c.column_name,
        'type', c.data_type,
        'is_nullable', (c.is_nullable = 'YES'),
        'is_pk', (pk.column_name IS NOT NULL)
      )
      ORDER BY c.ordinal_position
    ) AS columns
  FROM tables t
  JOIN columns c
    ON c.table_schema = t.table_schema
   AND c.table_name = t.table_name
  LEFT JOIN primary_keys pk
    ON pk.table_schema = c.table_schema
   AND pk.table_name = c.table_name
   AND pk.column_name = c.column_name
  GROUP BY t.table_schema, t.table_name
),
relations AS (
  SELECT
    src.relname AS source_table,
    src_col.attname AS source_column,
    tgt.relname AS target_table,
    tgt_col.attname AS target_column,
    con.conname AS constraint_name
  FROM pg_constraint con
  JOIN pg_class src ON src.oid = con.conrelid
  JOIN pg_namespace src_ns ON src_ns.oid = src.relnamespace
  JOIN pg_class tgt ON tgt.oid = con.confrelid
  JOIN pg_namespace tgt_ns ON tgt_ns.oid = tgt.relnamespace
  JOIN unnest(con.conkey) WITH ORDINALITY AS src_cols(attnum, ord) ON true
  JOIN unnest(con.confkey) WITH ORDINALITY AS tgt_cols(attnum, ord) ON src_cols.ord = tgt_cols.ord
  JOIN pg_attribute src_col ON src_col.attrelid = src.oid AND src_col.attnum = src_cols.attnum
  JOIN pg_attribute tgt_col ON tgt_col.attrelid = tgt.oid AND tgt_col.attnum = tgt_cols.attnum
  WHERE con.contype = 'f'
    AND src_ns.nspname = ANY(target_schemas)
    AND tgt_ns.nspname = ANY(target_schemas)
)
SELECT jsonb_build_object(
  'tables', COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'schema', schema,
          'name', name,
          'columns', columns
        )
        ORDER BY schema, name
      )
      FROM table_json
    ),
    '[]'::jsonb
  ),
  'relations', COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'source_table', source_table,
          'source_column', source_column,
          'target_table', target_table,
          'target_column', target_column,
          'constraint_name', constraint_name
        )
        ORDER BY source_table, target_table, constraint_name
      )
      FROM relations
    ),
    '[]'::jsonb
  )
);
$$;

GRANT EXECUTE ON FUNCTION public.get_schema_graph() TO authenticated;

