import type { GroupSummaryDto } from '@shared/ipc/types'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

type SituationRow = {
  id: number
  name: string
  position: string
  effectiveStack: number
}

export function GroupDetailPage(): React.ReactElement {
  const { groupId: groupIdParam } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const groupId = groupIdParam ? Number(groupIdParam) : NaN

  const [group, setGroup] = useState<GroupSummaryDto | null | undefined>(undefined)
  const [situations, setSituations] = useState<SituationRow[]>([])
  const [archivingId, setArchivingId] = useState<number | null>(null)

  async function loadGroupsAndSituations(): Promise<void> {
    if (!Number.isFinite(groupId)) {
      setGroup(null)
      return
    }
    const groups = await window.api.groups.list()
    const g = groups.find((x) => x.id === groupId) ?? null
    setGroup(g)
    if (!g) {
      setSituations([])
      return
    }
    const list = await window.api.situations.list({ groupId })
    const rows: SituationRow[] = list.map((s) => ({
      id: s.id,
      name: s.name,
      position: s.position,
      effectiveStack: s.effectiveStack
    }))
    setSituations(rows)
  }

  useEffect(() => {
    void loadGroupsAndSituations()
  }, [groupId])

  async function handleArchive(row: SituationRow): Promise<void> {
    if (archivingId === row.id) return
    const ok = confirm(`Arquivar situação "${row.name}"?`)
    if (!ok) return
    setArchivingId(row.id)
    try {
      await window.api.situations.delete(row.id)
      await loadGroupsAndSituations()
    } finally {
      setArchivingId(null)
    }
  }

  if (group === undefined) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    )
  }

  if (group === null) {
    return (
      <div className="space-y-4">
        <Link to="/groups" className="text-sm text-primary hover:underline">
          ← Grupos
        </Link>
        <p className="text-muted-foreground">Grupo não encontrado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Link to="/groups" className="text-sm text-primary hover:underline">
          ← Grupos
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="pt-page-title">{group.name}</h1>
          <button
            type="button"
            className="pt-btn-primary text-sm"
            data-testid="new-situation-btn"
            onClick={() => navigate(`/situations/new?groupId=${group.id}`)}
          >
            Nova situação
          </button>
        </div>
      </div>

      <div className="pt-card overflow-hidden" data-testid="group-detail-situations">
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
            {situations.map((r) => (
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
                      void loadGroupsAndSituations()
                    }}
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    className="text-destructive hover:underline"
                    disabled={archivingId === r.id}
                    onClick={() => void handleArchive(r)}
                  >
                    Arquivar
                  </button>
                </td>
              </tr>
            ))}
            {!situations.length && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  Nenhuma situação neste grupo.{' '}
                  <Link
                    to={`/situations/new?groupId=${group.id}`}
                    className="text-primary hover:underline"
                  >
                    Criar a primeira?
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
