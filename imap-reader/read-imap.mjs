import { ImapFlow } from 'imapflow'

const client = new ImapFlow({
  host: process.env.IMAP_HOST,
  port: Number(process.env.IMAP_PORT || 993),
  secure: true,
  auth: {
    user: process.env.IMAP_USER,
    pass: process.env.IMAP_PASS,
  },
})

const max = Number(process.env.IMAP_MAX || 10)

async function main() {
  await client.connect()
  await client.mailboxOpen('INBOX')

  const messages = []
  let count = 0

  for await (const message of client.fetch({ seen: false }, { envelope: true, uid: true, flags: true, internalDate: true })) {
    messages.push({
      uid: message.uid,
      date: message.internalDate,
      subject: message.envelope?.subject || '',
      from: (message.envelope?.from || []).map((item) => `${item.name || ''} <${item.address || ''}>`).join(', '),
      flags: message.flags ? Array.from(message.flags) : [],
    })
    count += 1
    if (count >= max) break
  }

  console.log(JSON.stringify(messages, null, 2))
  await client.logout()
}

main().catch(async (error) => {
  console.error(error)
  try { await client.logout() } catch {}
  process.exit(1)
})
