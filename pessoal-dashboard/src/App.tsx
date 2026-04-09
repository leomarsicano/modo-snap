import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { supabase } from './lib/supabase'

type RoutineStatus = 'feito' | 'pendente' | 'atrasado'

type RoutineItem = {
  id: number
  title: string
  status: RoutineStatus
  time: string
}

type ExpenseItem = {
  id: number
  category: string
  note: string
  value: number
}

const initialRoutine: RoutineItem[] = [
  { id: 1, title: 'Devocional', status: 'feito', time: '05:15' },
  { id: 2, title: 'Pedal', status: 'feito', time: '06:00' },
  { id: 3, title: 'Segunda refeição', status: 'feito', time: '10:00' },
  { id: 4, title: 'Almoço', status: 'pendente', time: '12:00' },
  { id: 5, title: 'Academia', status: 'pendente', time: '19:30' },
  { id: 6, title: 'Dormir', status: 'atrasado', time: '22:30' },
]

const tasks = [
  'Ver gastos pessoais do mês',
  'Confirmar horário de cortar cabelo',
  'Revisar prioridades da AutoHolic',
]

const initialExpenses: ExpenseItem[] = [
  { id: 1, category: 'Casa', note: 'Luz', value: 495 },
  { id: 2, category: 'Mercado', note: 'Frutas', value: 100 },
]

const waterTarget = 5
const currentWater = 3.2
const mealsTarget = 5
const statusOptions: RoutineStatus[] = ['feito', 'pendente', 'atrasado']

function currency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

function App() {
  const [routine, setRoutine] = useState<RoutineItem[]>([])
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [form, setForm] = useState({ note: '', category: '', value: '' })
  const [syncMessage, setSyncMessage] = useState('Conectando com Supabase...')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)

      const [{ data: routineData, error: routineError }, { data: expensesData, error: expensesError }] = await Promise.all([
        supabase.from('routine_items').select('*').order('id', { ascending: true }),
        supabase.from('expenses').select('*').order('id', { ascending: false }),
      ])

      if (routineError || expensesError) {
        setSyncMessage('Banco conectado, mas houve erro ao carregar dados.')
        setRoutine(initialRoutine)
        setExpenses(initialExpenses)
        setLoading(false)
        return
      }

      if (!routineData?.length) {
        const { data: seededRoutine } = await supabase
          .from('routine_items')
          .insert(initialRoutine.map(({ title, status, time }) => ({ title, status, time })))
          .select()

        setRoutine((seededRoutine as RoutineItem[]) ?? initialRoutine)
      } else {
        setRoutine(routineData as RoutineItem[])
      }

      if (!expensesData?.length) {
        const { data: seededExpenses } = await supabase
          .from('expenses')
          .insert(initialExpenses.map(({ note, category, value }) => ({ note, category, value })))
          .select()

        setExpenses((seededExpenses as ExpenseItem[]) ?? initialExpenses)
      } else {
        setExpenses(expensesData as ExpenseItem[])
      }

      setSyncMessage('Supabase conectado e dados reais carregados.')
      setLoading(false)
    }

    loadData()
  }, [])

  const routineDone = routine.filter((item) => item.status === 'feito').length
  const mealsDone = routine
    .filter((item) => item.title.toLowerCase().includes('refeição') || item.title === 'Almoço')
    .filter((item) => item.status === 'feito').length
  const expensesTotal = useMemo(() => expenses.reduce((sum, item) => sum + item.value, 0), [expenses])
  const weeklyConsistency = routine.length ? Math.round((routineDone / routine.length) * 100) : 0

  const metrics = [
    {
      label: 'Água',
      value: `${currentWater.toFixed(1)} / ${waterTarget}L`,
      hint: `${Math.round((currentWater / waterTarget) * 100)}% da meta hoje`,
    },
    {
      label: 'Refeições',
      value: `${mealsDone} / ${mealsTarget}`,
      hint: `${Math.max(mealsTarget - mealsDone, 0)} pendentes no dia`,
    },
    {
      label: 'Rotina concluída',
      value: `${routineDone} / ${routine.length || initialRoutine.length}`,
      hint: 'Check-ins sincronizados com o banco',
    },
    {
      label: 'Gastos do mês',
      value: currency(expensesTotal),
      hint: `${expenses.length} lançamentos pessoais`,
    },
  ]

  async function updateRoutineStatus(id: number, status: RoutineStatus) {
    const previous = routine
    const updated = routine.map((item) => (item.id === id ? { ...item, status } : item))
    setRoutine(updated)

    const { error } = await supabase.from('routine_items').update({ status }).eq('id', id)

    if (error) {
      setRoutine(previous)
      setSyncMessage('Erro ao salvar rotina no banco.')
      return
    }

    setSyncMessage('Rotina salva no banco.')
  }

  async function resetRoutine() {
    const { data, error } = await supabase.from('routine_items').select('*').order('id', { ascending: true })

    if (error) {
      setSyncMessage('Erro ao recarregar rotina.')
      return
    }

    setRoutine(data as RoutineItem[])
    setSyncMessage('Rotina recarregada do banco.')
  }

  async function resetExpenses() {
    const { data, error } = await supabase.from('expenses').select('*').order('id', { ascending: false })

    if (error) {
      setSyncMessage('Erro ao recarregar gastos.')
      return
    }

    setExpenses(data as ExpenseItem[])
    setSyncMessage('Gastos recarregados do banco.')
  }

  async function handleExpenseSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.note.trim() || !form.category.trim() || !form.value.trim()) {
      return
    }

    const numericValue = Number(form.value.replace(',', '.'))
    if (Number.isNaN(numericValue) || numericValue <= 0) {
      return
    }

    const payload = {
      note: form.note.trim(),
      category: form.category.trim(),
      value: numericValue,
    }

    const { data, error } = await supabase.from('expenses').insert(payload).select().single()

    if (error || !data) {
      setSyncMessage('Erro ao salvar gasto no banco.')
      return
    }

    setExpenses((current) => [data as ExpenseItem, ...current])
    setForm({ note: '', category: '', value: '' })
    setSyncMessage('Gasto salvo no banco.')
  }

  return (
    <main className="dashboard-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Dashboard pessoal</p>
          <h1>Resumo do dia do Leo</h1>
          <p className="hero-text">
            Um painel simples para rotina, saúde, compromissos e financeiro pessoal.
          </p>
        </div>

        <div className="focus-box">
          <span className="focus-label">Foco do dia</span>
          <strong>Clareza, constância e execução.</strong>
          <p>Ver o que está pendente sem se perder no operacional.</p>
          <small className="sync-message">{syncMessage}</small>
        </div>
      </section>

      <section className="metric-grid">
        {metrics.map((item) => (
          <article className="metric-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.hint}</small>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="panel panel-large">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Rotina</p>
              <h2>Check-in do dia</h2>
            </div>
            <div className="panel-actions">
              <span className="panel-badge">Banco real</span>
              <button type="button" className="ghost-button" onClick={resetRoutine}>
                Recarregar rotina
              </button>
            </div>
          </div>

          <div className="routine-list">
            {loading ? (
              <div className="empty-state">Carregando rotina...</div>
            ) : (
              routine.map((item) => (
                <div className="routine-item" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.time}</span>
                  </div>

                  <div className="routine-actions">
                    {statusOptions.map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={item.status === status ? `status status-${status}` : 'status-button'}
                        onClick={() => updateRoutineStatus(item.id, status)}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Agenda e foco</p>
          <h2>Próximas pendências</h2>
          <ul className="task-list">
            {tasks.map((task) => (
              <li key={task}>{task}</li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Financeiro pessoal</p>
              <h2>Novo lançamento</h2>
            </div>
            <button type="button" className="ghost-button" onClick={resetExpenses}>
              Recarregar gastos
            </button>
          </div>

          <form className="expense-form" onSubmit={handleExpenseSubmit}>
            <input
              placeholder="Ex: Mercado"
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            />
            <input
              placeholder="Categoria"
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            />
            <input
              placeholder="Valor"
              inputMode="decimal"
              value={form.value}
              onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
            />
            <button type="submit">Adicionar gasto</button>
          </form>

          <div className="expense-list">
            {loading ? (
              <div className="empty-state">Carregando gastos...</div>
            ) : (
              expenses.map((expense) => (
                <div className="expense-item" key={expense.id}>
                  <div>
                    <strong>{expense.note}</strong>
                    <span>{expense.category}</span>
                  </div>
                  <strong>{currency(expense.value)}</strong>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="panel panel-highlight">
          <p className="eyebrow">Consistência semanal</p>
          <h2>Semana atual</h2>
          <div className="consistency-row">
            <div>
              <span>Rotina</span>
              <strong>{weeklyConsistency}%</strong>
            </div>
            <div>
              <span>Treino</span>
              <strong>{routine.find((item) => item.title === 'Academia')?.status === 'feito' ? '1/1' : '0/1'}</strong>
            </div>
            <div>
              <span>Refeições</span>
              <strong>{mealsDone}/{mealsTarget}</strong>
            </div>
          </div>
        </article>
      </section>
    </main>
  )
}

export default App
