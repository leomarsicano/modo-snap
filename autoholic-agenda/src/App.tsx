import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { supabase } from './lib/supabase'
import autoholicLogo from './assets/autoholic-logo.png'

type AppointmentStatus = 'Novo' | 'Confirmado' | 'Em atendimento' | 'Finalizado'

type Appointment = {
  id: number
  customer: string
  phone: string
  vehicle: string
  plate: string
  service: string
  source: string
  advisor: string
  date: string
  time: string
  status: AppointmentStatus
}

type AppointmentForm = {
  customer: string
  phone: string
  vehicle: string
  plate: string
  service: string
  internalNotes: string
  source: string
  advisor: string
  date: string
  time: string
}

type RescheduleState = {
  id: number
  customer: string
  date: string
} | null

type LoginForm = {
  login: string
  password: string
}

type SignupForm = {
  name: string
  email: string
  password: string
  confirmPassword: string
}

const customerSources = [
  'Cliente antigo',
  'Indicação',
  'Instagram',
  'Google',
  'WhatsApp',
  'Passando na porta',
  'Outro',
]

const initialAppointments: Omit<Appointment, 'id'>[] = [
  {
    customer: 'Bruno Carvalho',
    phone: '(31) 99999-1234',
    vehicle: 'Audi Q3',
    plate: 'QWE-1234',
    service: 'Revisão preventiva',
    source: 'Cliente antigo',
    advisor: 'Leonardo',
    date: '2026-04-18',
    time: '08:30',
    status: 'Confirmado',
  },
  {
    customer: 'Marcos Vieira',
    phone: '(31) 98888-4567',
    vehicle: 'VW Tiguan',
    plate: 'RTY-7788',
    service: 'Diagnóstico de ruído',
    source: 'Indicação',
    advisor: 'Bruna',
    date: '2026-04-18',
    time: '10:00',
    status: 'Novo',
  },
  {
    customer: 'Camila Souza',
    phone: '(31) 97777-9911',
    vehicle: 'Audi A3',
    plate: 'UIO-4455',
    service: 'Troca de óleo e filtros',
    source: 'Instagram',
    advisor: 'Leonardo',
    date: '2026-04-19',
    time: '14:00',
    status: 'Em atendimento',
  },
]

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(`${date}T12:00:00`))
}


function getWeekRange(reference = new Date(), weekOffset = 0) {
  const current = new Date(reference)
  const day = current.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day

  const start = new Date(current)
  start.setDate(current.getDate() + diffToMonday + weekOffset * 7)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

function formatWeekLabel(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })

  return `${formatter.format(start)} até ${formatter.format(end)}`
}

function buildCalendarDays(reference: Date) {
  const startOfMonth = new Date(reference.getFullYear(), reference.getMonth(), 1)
  const endOfMonth = new Date(reference.getFullYear(), reference.getMonth() + 1, 0)
  const startDay = startOfMonth.getDay()
  const daysToShowBefore = startDay === 0 ? 6 : startDay - 1
  const calendarStart = new Date(startOfMonth)
  calendarStart.setDate(startOfMonth.getDate() - daysToShowBefore)

  const days = []
  for (let index = 0; index < 42; index += 1) {
    const current = new Date(calendarStart)
    current.setDate(calendarStart.getDate() + index)
    days.push(current)
  }

  return { days, startOfMonth, endOfMonth }
}

function buildConfirmationMessage(appointment: Appointment) {
  return `Olá, ${appointment.customer}. Seu agendamento na AutoHolic foi confirmado para ${formatDate(appointment.date)} às ${appointment.time}. Veículo: ${appointment.vehicle} | Placa: ${appointment.plate}. Serviço desejado: ${appointment.service}. Se precisar remarcar, responde aqui.`
}

function getSessionUserName(user: { email?: string; user_metadata?: { name?: unknown } }) {
  const metadataName = typeof user.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : ''
  const email = user.email

  return metadataName || (typeof email === 'string' ? email.split('@')[0] : '')
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '')

  if (!digits) return ''
  if (digits.startsWith('55')) return digits
  return `55${digits}`
}

function sanitizePhoneInput(value: string) {
  const digits = value.replace(/\D/g, '')
  const withoutPrefix = digits.startsWith('55') ? digits.slice(2) : digits
  return `55${withoutPrefix}`
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isCreatingLogin, setIsCreatingLogin] = useState(false)
  const [currentUserName, setCurrentUserName] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginForm, setLoginForm] = useState<LoginForm>({ login: '', password: '' })
  const [signupForm, setSignupForm] = useState<SignupForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [showNewAppointmentForm, setShowNewAppointmentForm] = useState(false)
  const [rescheduleState, setRescheduleState] = useState<RescheduleState>(null)
  const [rescheduleInput, setRescheduleInput] = useState('')
  const [form, setForm] = useState<AppointmentForm>({
    customer: '',
    phone: '55',
    vehicle: '',
    plate: '',
    service: '',
    internalNotes: '',
    source: '',
    advisor: '',
    date: '',
    time: '',
  })
  const [message, setMessage] = useState('Conectando agenda ao Supabase...')
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [sourceFilter, setSourceFilter] = useState('Todos')
  const [sourceMonth, setSourceMonth] = useState(() => new Date().toISOString().slice(0, 7))

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return

      setIsAuthenticated(Boolean(data.session))
      setCurrentUserName(data.session ? getSessionUserName(data.session.user) : '')
      setIsAuthLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session))
      setCurrentUserName(session ? getSessionUserName(session.user) : '')
      setIsAuthLoading(false)

      if (!session) {
        setAppointments([])
        setCurrentUserName('')
      }
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    async function loadAppointments() {
      setLoading(true)

      if (!isAuthenticated) {
        setAppointments([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('appointments')
        .select('id, customer, phone, vehicle, plate, service, source, advisor, date, time, status')
        .order('date', { ascending: true })
        .order('time', { ascending: true })

      if (error) {
        setAppointments([])
        setMessage(`Erro ao carregar agenda: ${error.message}`)
        setLoading(false)
        return
      }

      if (!data?.length) {
        const { data: seededData, error: seedError } = await supabase
          .from('appointments')
          .insert(initialAppointments)
          .select('id, customer, phone, vehicle, plate, service, source, advisor, date, time, status')

        if (seedError) {
          setAppointments([])
          setMessage(`Erro ao criar agenda inicial: ${seedError.message}`)
          setLoading(false)
          return
        }

        setAppointments((seededData as Appointment[]) ?? [])
        setMessage('Agenda conectada. Base inicial criada no banco.')
        setLoading(false)
        return
      }

      setAppointments(data as Appointment[])
      setMessage('')
      setLoading(false)
    }

    loadAppointments()
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !currentUserName) return

    setForm((current) => ({ ...current, advisor: currentUserName }))
  }, [currentUserName, isAuthenticated])

  const selectedWeek = useMemo(() => getWeekRange(new Date(), weekOffset), [weekOffset])

  const currentWeekAppointments = useMemo(() => {
    return appointments.filter((item) => {
      const appointmentDate = new Date(`${item.date}T12:00:00`)
      return appointmentDate >= selectedWeek.start && appointmentDate <= selectedWeek.end
    })
  }, [appointments, selectedWeek])

  const weeklyActiveAppointments = currentWeekAppointments.filter((item) => item.status !== 'Finalizado')

  const monthlySourceAppointments = useMemo(() => {
    return appointments.filter((item) => {
      const matchesMonth = item.date.startsWith(sourceMonth)
      const matchesSource = sourceFilter === 'Todos' || item.source === sourceFilter
      return matchesMonth && matchesSource
    })
  }, [appointments, sourceFilter, sourceMonth])

  const sourceSummary = useMemo(() => {
    const summary = new Map<string, number>()

    appointments
      .filter((item) => item.date.startsWith(sourceMonth))
      .forEach((item) => {
        const source = item.source || 'Não informado'
        summary.set(source, (summary.get(source) ?? 0) + 1)
      })

    return Array.from(summary.entries())
      .map(([source, total]) => ({ source, total }))
      .sort((a, b) => b.total - a.total)
  }, [appointments, sourceMonth])

  const metrics = [
    {
      label: 'Agendamentos',
      value: String(weeklyActiveAppointments.length),
      hint: 'Volume ativo da semana selecionada',
    },
    {
      label: 'Confirmados',
      value: String(weeklyActiveAppointments.filter((item) => item.status === 'Confirmado').length),
      hint: 'Prontos para receber',
    },
  ]

  const calendarReference = selectedWeek.start
  const { days: calendarDays, startOfMonth, endOfMonth } = useMemo(
    () => buildCalendarDays(calendarReference),
    [calendarReference],
  )
  const currentMonthLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(calendarReference)

  function resetAppointmentForm() {
    setShowNewAppointmentForm(false)
    setForm({
      customer: '',
      phone: '55',
      vehicle: '',
      plate: '',
      service: '',
      internalNotes: '',
      source: '',
      advisor: currentUserName,
      date: '',
      time: '',
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const advisor = currentUserName || form.advisor
    const requiredFields = [form.customer, form.phone, form.vehicle, form.plate, form.service, form.source, advisor, form.date, form.time]

    if (requiredFields.some((value) => !value.trim())) {
      setMessage('Preenche todos os campos para criar o agendamento.')
      return
    }

    const payload = {
      customer: form.customer.trim(),
      phone: form.phone.trim(),
      vehicle: form.vehicle.trim(),
      plate: form.plate.trim().toUpperCase(),
      service: form.internalNotes.trim()
        ? `${form.service.trim()}\nObs. interna: ${form.internalNotes.trim()}`
        : form.service.trim(),
      source: form.source.trim(),
      advisor: advisor.trim(),
      date: form.date,
      time: form.time,
      status: 'Novo' as AppointmentStatus,
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert(payload)
      .select('id, customer, phone, vehicle, plate, service, source, advisor, date, time, status')
      .single()

    if (error || !data) {
      setMessage(`Erro ao criar agendamento: ${error?.message ?? 'erro desconhecido'}`)
      return
    }

    setAppointments((current) => [data as Appointment, ...current])
    setForm({
      customer: '',
      phone: '55',
      vehicle: '',
      plate: '',
      service: '',
      internalNotes: '',
      source: '',
      advisor: currentUserName,
      date: '',
      time: '',
    })
    setShowNewAppointmentForm(false)
    await sendViaWhatsApp(data as Appointment, buildConfirmationMessage(data as Appointment), 'Confirmação')
    setMessage(`Agendamento criado para ${data.customer} e mensagem enviada.`)
  }

  async function updateStatus(id: number, status: AppointmentStatus) {
    const previous = appointments
    setAppointments((current) => current.map((item) => (item.id === id ? { ...item, status } : item)))

    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select('id, customer, phone, vehicle, plate, service, source, advisor, date, time, status')
      .single()

    if (error || !data) {
      setAppointments(previous)
      setMessage(`Erro ao atualizar status: ${error?.message ?? 'erro desconhecido'}`)
      return
    }

    setAppointments((current) => current.map((item) => (item.id === id ? (data as Appointment) : item)))
    setMessage(`Status atualizado para ${status}.`)
  }

  async function unconfirmAppointment(id: number) {
    await updateStatus(id, 'Novo')
  }

  function openRescheduleModal(appointment: Appointment) {
    setRescheduleState({
      id: appointment.id,
      customer: appointment.customer,
      date: appointment.date,
    })
    setRescheduleInput(appointment.date)
  }

  async function submitReschedule() {
    if (!rescheduleState) {
      return
    }

    const parsedDate = rescheduleInput

    if (!parsedDate) {
      setMessage('Escolhe uma data para remarcar.')
      return
    }

    if (parsedDate === rescheduleState.date) {
      setRescheduleState(null)
      return
    }

    const previous = appointments
    setAppointments((current) => current.map((item) => (item.id === rescheduleState.id ? { ...item, date: parsedDate } : item)))

    const { data, error } = await supabase
      .from('appointments')
      .update({ date: parsedDate })
      .eq('id', rescheduleState.id)
      .select('id, customer, phone, vehicle, plate, service, source, advisor, date, time, status')
      .single()

    if (error || !data) {
      setAppointments(previous)
      setMessage(`Erro ao remarcar: ${error?.message ?? 'erro desconhecido'}`)
      return
    }

    setAppointments((current) => current.map((item) => (item.id === rescheduleState.id ? (data as Appointment) : item)))
    setRescheduleState(null)
    setRescheduleInput('')
    setMessage(`Agendamento de ${rescheduleState.customer} remarcado para ${formatDate(parsedDate)}.`)
  }

  async function deleteAppointment(appointment: Appointment) {
    const confirmed = window.confirm(`Excluir o agendamento de ${appointment.customer}?`)

    if (!confirmed) {
      return
    }

    const previous = appointments
    setAppointments((current) => current.filter((item) => item.id !== appointment.id))

    const { data, error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointment.id)
      .select('id')

    if (error) {
      setAppointments(previous)
      setMessage(`Erro ao excluir agendamento: ${error.message}`)
      return
    }

    if (!data?.length) {
      setAppointments(previous)
      setMessage(`Nenhum agendamento foi excluído no banco (${appointment.customer}).`)
      return
    }

    setMessage(`Agendamento de ${appointment.customer} excluído.`)
  }

  async function sendViaWhatsApp(appointment: Appointment, text: string, label: string) {
    const normalizedPhone = normalizePhone(appointment.phone)

    if (!normalizedPhone) {
      setMessage(`Telefone inválido para ${appointment.customer}.`)
      return
    }

    const response = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: normalizedPhone,
        message: text,
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setMessage(`Erro ao enviar WhatsApp: ${payload?.error ?? 'erro desconhecido'}`)
      return
    }

    setMessage(`${label} enviada para ${appointment.customer}.`)
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const login = loginForm.login.trim()

    if (!login || !loginForm.password) {
      setLoginError('Informe nome/e-mail e senha.')
      return
    }

    let email = login.toLowerCase()

    if (!login.includes('@')) {
      const resolveResponse = await fetch('/api/auth-resolve-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login }),
      })

      if (!resolveResponse.ok) {
        const payload = await resolveResponse.json().catch(() => null)
        setLoginError(payload?.error ?? 'Login não encontrado.')
        return
      }

      const payload = (await resolveResponse.json()) as { email?: string }
      email = payload.email ?? ''
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: loginForm.password,
    })

    if (error) {
      setLoginError('Nome/e-mail ou senha inválidos.')
      return
    }

    setCurrentUserName(data.user ? getSessionUserName(data.user) : '')
    setIsAuthenticated(true)
    setLoginError('')
    setLoginForm({ login: '', password: '' })
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = signupForm.name.trim()
    const email = signupForm.email.trim().toLowerCase()
    const password = signupForm.password

    if (!name || !email || !password || !signupForm.confirmPassword) {
      setLoginError('Preencha todos os campos para criar o login.')
      return
    }

    if (password.length < 6) {
      setLoginError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (password !== signupForm.confirmPassword) {
      setLoginError('As senhas não conferem.')
      return
    }

    const signupResponse = await fetch('/api/auth-signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    })

    if (!signupResponse.ok) {
      const payload = await signupResponse.json().catch(() => null)
      setLoginError(payload?.error ?? 'Erro ao criar login.')
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setLoginError(`Login criado, mas não foi possível entrar automaticamente: ${error.message}`)
      return
    }

    setCurrentUserName(data.user ? getSessionUserName(data.user) : name)
    setIsAuthenticated(true)
    setIsCreatingLogin(false)
    setLoginError('')
    setSignupForm({ name: '', email: '', password: '', confirmPassword: '' })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setCurrentUserName('')
    setIsAuthenticated(false)
  }

  if (isAuthLoading) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <img src={autoholicLogo} alt="Logo da AutoHolic" className="login-logo" />
          <h1>Carregando acesso</h1>
        </section>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <img src={autoholicLogo} alt="Logo da AutoHolic" className="login-logo" />
          <h1>{isCreatingLogin ? 'Criar login' : 'Acessar agenda'}</h1>

          {isCreatingLogin ? (
            <form className="login-form" onSubmit={handleSignup}>
              <input
                placeholder="Nome"
                autoComplete="name"
                value={signupForm.name}
                onChange={(event) => setSignupForm((current) => ({ ...current, name: event.target.value }))}
              />
              <input
                type="email"
                placeholder="E-mail"
                autoComplete="username"
                value={signupForm.email}
                onChange={(event) => setSignupForm((current) => ({ ...current, email: event.target.value }))}
              />
              <input
                type="password"
                placeholder="Senha"
                autoComplete="new-password"
                value={signupForm.password}
                onChange={(event) => setSignupForm((current) => ({ ...current, password: event.target.value }))}
              />
              <input
                type="password"
                placeholder="Confirmar senha"
                autoComplete="new-password"
                value={signupForm.confirmPassword}
                onChange={(event) => setSignupForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              />
              {loginError ? <small className="login-error">{loginError}</small> : null}
              <button type="submit">Criar e entrar</button>
              <button
                type="button"
                className="login-link-button"
                onClick={() => {
                  setIsCreatingLogin(false)
                  setLoginError('')
                }}
              >
                Já tenho login
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleLogin}>
              <input
                type="text"
                placeholder="Nome ou e-mail"
                autoComplete="username"
                value={loginForm.login}
                onChange={(event) => setLoginForm((current) => ({ ...current, login: event.target.value }))}
              />
              <input
                type="password"
                placeholder="Senha"
                autoComplete="current-password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
              />
              {loginError ? <small className="login-error">{loginError}</small> : null}
              <button type="submit">Entrar</button>
              <button
                type="button"
                className="login-link-button"
                onClick={() => {
                  setIsCreatingLogin(true)
                  setLoginError('')
                }}
              >
                Criar novo login
              </button>
            </form>
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div className="hero-brand-block">
          <img src={autoholicLogo} alt="Logo da AutoHolic" className="hero-logo" />
          <div>
            <p className="eyebrow">AutoHolic Agenda</p>
            <h1>Agendamento de carros</h1>
            <button type="button" className="primary-button hero-action" onClick={() => setShowNewAppointmentForm((current) => !current)}>
              {showNewAppointmentForm ? 'Fechar novo agendamento' : 'Novo agendamento'}
            </button>
            <button type="button" className="ghost-button hero-logout" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </div>

        {message ? (
          <div className="focus-box">
            <small className="sync-message">{message}</small>
          </div>
        ) : null}
      </section>

      <section className="metric-grid">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.hint}</small>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="panel panel-large">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Agenda principal</p>
              <h2>Agendamentos da semana</h2>
            </div>
            <div className="week-navigation">
              <button type="button" className="ghost-button" onClick={() => setWeekOffset((current) => current - 1)}>
                ← Semana anterior
              </button>
              <span className="panel-badge">{formatWeekLabel(selectedWeek.start, selectedWeek.end)}</span>
              <button type="button" className="ghost-button" onClick={() => setWeekOffset((current) => current + 1)}>
                Próxima semana →
              </button>
            </div>
          </div>

          <div className="appointment-list">
            {loading ? (
              <div className="empty-state">Carregando agenda...</div>
            ) : currentWeekAppointments.length ? (
              currentWeekAppointments.map((appointment) => (
                <div className="appointment-card" key={appointment.id}>
                  <div className="appointment-main">
                    <div className="appointment-identity">
                      <div className="appointment-topline">
                        <div className="appointment-topline-left">
                          <strong>{appointment.customer}</strong>
                          <span>{appointment.phone}</span>
                        </div>
                      </div>
                      <span>{appointment.vehicle}</span>
                      <span>{appointment.plate}</span>
                    </div>
                    <div className="appointment-date">
                      <strong>{formatDate(appointment.date)}</strong>
                      <span>{appointment.time}</span>
                    </div>
                  </div>

                  <div className="appointment-meta">
                    <span>Serviço desejado: {appointment.service}</span>
                  </div>

                  <div className="appointment-actions">
                    <button
                      type="button"
                      className={appointment.status === 'Confirmado' ? 'status status-active' : 'status-button'}
                      onClick={() => updateStatus(appointment.id, 'Confirmado')}
                    >
                      Confirmado
                    </button>

                    <button type="button" className="ghost-button" onClick={() => unconfirmAppointment(appointment.id)}>
                      Desmarcar
                    </button>

                    <button type="button" className="ghost-button" onClick={() => openRescheduleModal(appointment)}>
                      Trocar data
                    </button>

                    <button type="button" className="ghost-button danger-button" onClick={() => deleteAppointment(appointment)}>
                      Excluir
                    </button>

                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">Nenhum agendamento encontrado.</div>
            )}
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Calendário</p>
          <h2>{currentMonthLabel}</h2>
          <div className="calendar-weekdays">
            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {calendarDays.map((day) => {
              const isoDate = day.toISOString().slice(0, 10)
              const hasAppointment = appointments.some((item) => item.date === isoDate)
              const isCurrentMonth = day >= startOfMonth && day <= endOfMonth
              const isToday = isoDate === new Date().toISOString().slice(0, 10)
              const isInsideSelectedWeek = day >= selectedWeek.start && day <= selectedWeek.end

              return (
                <div
                  key={isoDate}
                  className={[
                    'calendar-day',
                    isCurrentMonth ? 'calendar-day-current' : 'calendar-day-muted',
                    isToday ? 'calendar-day-today' : '',
                    isInsideSelectedWeek ? 'calendar-day-selected' : '',
                    hasAppointment ? 'calendar-day-has-appointment' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {day.getDate()}
                </div>
              )
            })}
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Origem dos clientes</p>
          <h2>Filtro mensal</h2>
          <div className="source-filters">
            <input
              type="month"
              value={sourceMonth}
              onChange={(event) => setSourceMonth(event.target.value)}
            />
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
              <option value="Todos">Todas as origens</option>
              {customerSources.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>
          <div className="source-summary">
            <strong>{monthlySourceAppointments.length}</strong>
            <span>agendamentos encontrados</span>
          </div>
          <div className="source-list">
            {sourceSummary.length ? sourceSummary.map((item) => (
              <div className="source-item" key={item.source}>
                <span>{item.source}</span>
                <strong>{item.total}</strong>
              </div>
            )) : (
              <div className="empty-state">Nenhuma origem no mês selecionado.</div>
            )}
          </div>
        </article>


        {showNewAppointmentForm ? (
          <div className="modal-overlay" onClick={resetAppointmentForm}>
            <article className="panel modal-panel" onClick={(event) => event.stopPropagation()}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Novo agendamento</p>
                  <h2>Preencher dados</h2>
                </div>
                <button type="button" className="ghost-button" onClick={resetAppointmentForm}>
                  Fechar
                </button>
              </div>

              <form className="appointment-form" onSubmit={handleSubmit}>
                <input
                  placeholder="Nome do cliente"
                  value={form.customer}
                  onChange={(event) => setForm((current) => ({ ...current, customer: event.target.value }))}
                />
                <input
                  placeholder="Telefone"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: sanitizePhoneInput(event.target.value) }))}
                />
                <input
                  placeholder="Veículo"
                  value={form.vehicle}
                  onChange={(event) => setForm((current) => ({ ...current, vehicle: event.target.value }))}
                />
                <input
                  placeholder="Placa"
                  value={form.plate}
                  onChange={(event) => setForm((current) => ({ ...current, plate: event.target.value }))}
                />
                <input
                  placeholder="Serviço desejado"
                  value={form.service}
                  onChange={(event) => setForm((current) => ({ ...current, service: event.target.value }))}
                />
                <textarea
                  placeholder="Observações internas do carro/cliente"
                  value={form.internalNotes}
                  onChange={(event) => setForm((current) => ({ ...current, internalNotes: event.target.value }))}
                />
                <select
                  value={form.source}
                  onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}
                >
                  <option value="">Origem do cliente</option>
                  {customerSources.map((source) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
                <input
                  placeholder="Consultor responsável"
                  value={currentUserName || form.advisor}
                  disabled
                  readOnly
                />
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                />
                <input
                  type="time"
                  value={form.time}
                  onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
                />
                <button type="submit">Salvar agendamento</button>
              </form>
            </article>
          </div>
        ) : null}

        {rescheduleState ? (
          <div className="modal-overlay" onClick={() => setRescheduleState(null)}>
            <article className="panel modal-panel" onClick={(event) => event.stopPropagation()}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Trocar data</p>
                  <h2>{rescheduleState.customer}</h2>
                </div>
                <button type="button" className="ghost-button" onClick={() => setRescheduleState(null)}>
                  Fechar
                </button>
              </div>

              <form
                className="appointment-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  submitReschedule()
                }}
              >
                <input
                  type="date"
                  value={rescheduleInput}
                  onChange={(event) => setRescheduleInput(event.target.value)}
                />
                <button type="submit">Salvar nova data</button>
              </form>
            </article>
          </div>
        ) : null}

      </section>
    </main>
  )
}

export default App
