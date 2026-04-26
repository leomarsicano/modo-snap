import { ImapFlow } from 'imapflow'

const client = new ImapFlow({
  host: process.env.IMAP_HOST,
  port: Number(process.env.IMAP_PORT || 993),
  secure: true,
  auth: {
    user: process.env.IMAP_USER,
    pass: process.env.IMAP_PASS,
  },
  logger: false,
})

const max = Number(process.env.IMAP_MAX || 20)

async function main() {
  await client.connect()
  await client.mailboxOpen('INBOX')

  const lock = await client.getMailboxLock('INBOX')
  try {
    const messages = []
    const total = client.mailbox.exists || 0
    const start = Math.max(1, total - max + 1)

    for await (const message of client.fetch(`${start}:*`, { envelope: true, uid: true, flags: true, internalDate: true })) {
      if (message.flags && message.flags.has('\\Seen')) continue
      messages.push({
        uid: message.uid,
        date: message.internalDate,
        subject: message.envelope?.subject || '',
        from: (message.envelope?.from || []).map((item) => `${item.name || ''} <${item.address || ''}>`).join(', '),
        flags: message.flags ? Array.from(message.flags) : [],
      })
    }

    messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    console.log(JSON.stringify(messages.slice(0, max), null, 2))
  } finally {
    lock.release()
    await client.logout()
  }
}

main().catch(async (error) => {
  console.error(error)
  try { await client.logout() } catch {}
  process.exit(1)
})
