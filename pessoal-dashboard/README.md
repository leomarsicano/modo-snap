# pessoal-dashboard

MVP de agendamento da AutoHolic.

## Automação WhatsApp 5 e 3 dias antes

Script criado:

- `npm run send:scheduled-whatsapp`

Ele faz:
- busca agendamentos em `appointments`
- envia **reconfirmação** para agendamentos de **5 dias à frente**
- envia **lembrete** para agendamentos de **3 dias à frente**
- marca no banco os campos para não repetir envio

## Variáveis de ambiente necessárias

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ZAPI_INSTANCE_ID=
ZAPI_TOKEN=
ZAPI_CLIENT_TOKEN=
ZAPI_BASE_URL=https://api.z-api.io
```

## Campos esperados na tabela `appointments`

- `id`
- `customer`
- `phone`
- `vehicle`
- `plate`
- `service`
- `date`
- `time`
- `reconfirmation_sent_at`
- `reminder_sent_at`

## Agendamento recomendado

Rodar diariamente às 09:00 com cron no servidor:

```bash
0 9 * * * cd /caminho/do/projeto && npm run send:scheduled-whatsapp >> /var/log/autoholic-whatsapp.log 2>&1
```
