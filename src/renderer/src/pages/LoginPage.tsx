import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

function ipcErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return 'Erro'
}

export function LoginPage(): React.ReactElement {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    void useAuthStore.getState().refresh().then(() => {
      if (useAuthStore.getState().user) navigate('/', { replace: true })
    })
  }, [navigate])

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    try {
      if (tab === 'register') {
        await window.api.auth.register(name, email, password)
      }
      const res = await window.api.auth.login(email, password)
      setUser(res.user)
      navigate('/')
    } catch (err) {
      setError(ipcErrorMessage(err))
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-8 rounded-xl border border-slate-800 bg-slate-900 shadow-xl">
      <h1 className="text-2xl font-bold mb-2">Preflop Trainer</h1>
      <p className="text-slate-400 text-sm mb-6">Treino offline de ranges pré-flop NLHE 6-max.</p>
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          className={`flex-1 py-2 rounded ${tab === 'login' ? 'bg-emerald-600' : 'bg-slate-800'}`}
          onClick={() => setTab('login')}
        >
          Entrar
        </button>
        <button
          type="button"
          className={`flex-1 py-2 rounded ${tab === 'register' ? 'bg-emerald-600' : 'bg-slate-800'}`}
          onClick={() => setTab('register')}
        >
          Criar conta
        </button>
      </div>
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        {tab === 'register' && (
          <div>
            <label className="block text-sm text-slate-400 mb-1">Nome</label>
            <input
              className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        )}
        <div>
          <label className="block text-sm text-slate-400 mb-1">E-mail</label>
          <input
            type="email"
            className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Senha</label>
          <input
            type="password"
            className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" className="w-full py-2 rounded bg-emerald-600 font-medium">
          {tab === 'login' ? 'Entrar' : 'Cadastrar e entrar'}
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-slate-500">
        <Link to="/" className="text-emerald-400">
          Voltar
        </Link>
      </p>
    </div>
  )
}
