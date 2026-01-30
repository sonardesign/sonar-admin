import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
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

  // Verify authorization
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' })
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !authData?.user) {
    return res.status(401).json({ error: 'Invalid authorization token' })
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  // Get userId from request body
  const userId = req.body?.userId
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' })
  }

  // Delete the user
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (deleteError) {
    console.error('Delete user error:', deleteError)
    return res.status(500).json({ error: deleteError.message })
  }

  return res.json({ success: true })
}
