import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({
      error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    })
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

  try {
    const { data, error } = await supabaseAdmin.rpc('get_schema_graph', {
      target_schemas: ['public'],
    })
    if (error) {
      console.error('RPC error:', error)
      return res.status(500).json({
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
    }
    return res.json(data)
  } catch (error) {
    console.error('Schema graph error:', error)
    return res.status(500).json({
      error: 'Failed to load schema graph',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
