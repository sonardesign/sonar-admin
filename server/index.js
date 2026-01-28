import dotenv from 'dotenv'
import express from 'express'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })
dotenv.config()

const app = express()
const port = process.env.PORT || 3001

app.use(express.json())

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let supabaseAdmin = null
const missing = []
if (!supabaseUrl) missing.push('SUPABASE_URL')
if (!supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
if (missing.length > 0) {
  console.error(`Missing ${missing.join(' or ')}`)
} else {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)
}

app.get('/api/schema-graph', async (_req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({
      error: `Missing ${missing.join(' or ')}`,
    })
  }

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
})

app.post('/api/admin/delete-user', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({
      error: `Missing ${missing.join(' or ')}`,
    })
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' })
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !authData?.user) {
    return res.status(401).json({ error: 'Invalid authorization token' })
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  const userId = req.body?.userId
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' })
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (deleteError) {
    console.error('Delete user error:', deleteError)
    return res.status(500).json({ error: deleteError.message })
  }

  return res.json({ success: true })
})

app.listen(port, () => {
  console.log(`Schema graph API listening on http://localhost:${port}`)
})

