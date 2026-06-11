import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

type SignupBody = {
  name?: string
  email?: string
  password?: string
}

async function getAuthUserCount(supabase: ReturnType<typeof createClient>) {
  let page = 1
  let total = 0

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })

    if (error) {
      throw error
    }

    const users = data?.users ?? []
    total += users.length

    if (users.length < 100) {
      return total
    }

    page += 1
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const maxAuthUsers = Number(process.env.MAX_AUTH_USERS || 20)

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Supabase service role is not configured' })
  }

  const body = (req.body ?? {}) as SignupBody
  const name = String(body.name || '').trim()
  const email = String(body.email || '')
    .trim()
    .toLowerCase()
  const password = String(body.password || '')

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' })
  }

  const currentUserCount = await getAuthUserCount(createClient(supabaseUrl, serviceRoleKey))

  if (currentUserCount >= maxAuthUsers) {
    return res.status(409).json({
      error: `Limite de ${maxAuthUsers} logins atingido.`,
      currentUserCount,
      maxAuthUsers,
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (error) {
    const alreadyExists = error.message.toLowerCase().includes('already')

    return res.status(alreadyExists ? 409 : 400).json({
      error: alreadyExists ? 'Já existe um login com esse e-mail.' : error.message,
    })
  }

  return res.status(201).json({
    ok: true,
    currentUserCount: currentUserCount + 1,
    maxAuthUsers,
  })
}
