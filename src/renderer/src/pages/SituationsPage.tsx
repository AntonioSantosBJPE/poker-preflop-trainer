import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Row = {
  id: number
  name: string
  position: string
  effectiveStack: number
}

export function SituationsPage(): React.ReactElement {
  const [rows, setRows] = useState<Row[]>([])
  const navigate = useNavigate()

  async function load(): Promise<void> {
    const list = (await window.api.situations.list()) as Row[]
    setRows(list)
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Situações</h1>
        <button
          type="button"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium"
          onClick={() => navigate('/situations/new')}
        >
          Nova situação
        </button>
      </div>
      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Posição</th>
              <th className="text-left p-3">Stack (BB)</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-800 hover:bg-slate-900/60">
                <td className="p-3">{r.name}</td>
                <td className="p-3">{r.position}</td>
                <td className="p-3">{r.effectiveStack}</td>
                <td className="p-3 text-right space-x-2">
                  <button type="button" className="text-emerald-400" onClick={() => navigate(`/situations/${r.id}`)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="text-slate-400"
                    onClick={async () => {
                      await window.api.situations.duplicate(r.id)
                      void load()
                    }}
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    className="text-amber-400"
                    onClick={async () => {
                      await window.api.situations.delete(r.id)
                      void load()
                    }}
                  >
                    Arquivar
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-500">
                  Nenhuma situação.{' '}
                  <Link to="/situations/new" className="text-emerald-400">
                    Criar a primeira
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
