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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="pt-page-title">Situações</h1>
        <button type="button" className="pt-btn-primary text-sm" onClick={() => navigate('/situations/new')}>
          Nova situação
        </button>
      </div>
      <div className="pt-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="p-3 text-left font-medium">Nome</th>
              <th className="p-3 text-left font-medium">Posição</th>
              <th className="p-3 text-left font-medium">Stack (BB)</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/40">
                <td className="p-3">{r.name}</td>
                <td className="p-3">{r.position}</td>
                <td className="p-3 tabular-nums">{r.effectiveStack}</td>
                <td className="space-x-2 p-3 text-right">
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => navigate(`/situations/${r.id}`)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={async () => {
                      await window.api.situations.duplicate(r.id)
                      void load()
                    }}
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    className="text-destructive hover:underline"
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
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  Nenhuma situação.{' '}
                  <Link to="/situations/new" className="text-primary hover:underline">
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
