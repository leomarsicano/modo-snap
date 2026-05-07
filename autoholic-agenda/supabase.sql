alter table public.appointments
  add column if not exists reconfirmation_sent_at timestamptz null,
  add column if not exists reminder_sent_at timestamptz null,
  add column if not exists source text not null default 'Não informado',
  add column if not exists internal_notes text not null default '';
