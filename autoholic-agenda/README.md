# AutoHolic Agenda

## Automação de WhatsApp

Existe um endpoint para envio automático diário:

- `GET /api/send-scheduled-whatsapp`

Ele:
- envia **reconfirmação** para agendamentos de **5 dias à frente**
- envia **lembrete** para agendamentos de **3 dias à frente**
- marca no Supabase `reconfirmation_sent_at` e `reminder_sent_at`
- evita repetição de disparo

## Variáveis de ambiente necessárias na Vercel

- `VITE_SUPABASE_URL` ou `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ZAPI_INSTANCE_ID`
- `ZAPI_INSTANCE_TOKEN`
- `ZAPI_CLIENT_TOKEN`

## Ajuste necessário no banco

Rodar o SQL de `supabase.sql`:

```sql
alter table public.appointments
  add column if not exists reconfirmation_sent_at timestamptz null,
  add column if not exists reminder_sent_at timestamptz null;
```

## Agendamento recomendado

Na Vercel Cron, rodar diariamente às 09:00:

```json
{
  "crons": [
    {
      "path": "/api/send-scheduled-whatsapp",
      "schedule": "0 12 * * *"
    }
  ]
}
```

`0 12 * * *` em UTC = 09:00 no horário de Brasília.
