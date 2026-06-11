import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

type ResolveLoginBody = {
  login?: string
}

function normalizeLogin(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = (req.body ?? {}) as ResolveLoginBody
  const login = String(body.login || '').trim()

  if (!login) {
    return res.status(400).json({ error: 'Informe nome ou e-mail.' })
  }

  if (login.includes('@')) {
    return res.status(200).json({ email: login.toLowerCase() })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Supabase service role is not configured' })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const normalizedLogin = normalizeLogin(login)
  let page = 1
  const matches: string[] = []

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    const users = data?.users ?? []

    for (const user of users) {
      const metadataName = typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : ''
      const emailPrefix = user.email?.split('@')[0] ?? ''
      const possibleLogins = [metadataName, emailPrefix].map(normalizeLogin).filter(Boolean)

      if (possibleLogins.includes(normalizedLogin) && user.email) {
        matches.push(user.email)
      }
    }

    if (users.length < 100) {
      break
    }

    page += 1
  }

  if (matches.length === 0) {
    return res.status(404).json({ error: 'Login não encontrado.' })
  }

  if (matches.length > 1) {
    return res.status(409).json({ error: 'Mais de um usuário tem esse nome. Entre com o e-mail.' })
  }

  return res.status(200).json({ email: matches[0] })
}
