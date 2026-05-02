import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { GroupSummaryDto, SituationSummaryDto } from '@shared/ipc/types';

type Row = Pick<SituationSummaryDto, 'id' | 'name' | 'position' | 'effectiveStack' | 'groupId'>;

export function SituationsPage(): React.ReactElement {
  const [groups, setGroups] = useState<GroupSummaryDto[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const navigate = useNavigate();

  async function load(groupId?: number): Promise<void> {
    const list = (await window.api.situations.list(
      groupId != null ? { groupId } : undefined,
    )) as Row[];
    setRows(list);
  }

  const reload = useCallback(() => load(selectedGroupId ?? undefined), [selectedGroupId]);

  async function handleArchive(row: Row): Promise<void> {
    if (archivingId === row.id) return;
    const ok = confirm(`Arquivar situação "${row.name}"?`);
    if (!ok) return;
    setArchivingId(row.id);
    try {
      await window.api.situations.delete(row.id);
      await reload();
    } finally {
      setArchivingId(null);
    }
  }

  useEffect(() => {
    void (async () => {
      const g = (await window.api.groups.list()) as GroupSummaryDto[];
      setGroups(g);
    })();
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="pt-page-title">Situações</h1>
        <button
          type="button"
          className="pt-btn-primary text-sm"
          onClick={() => navigate('/situations/new')}
        >
          Nova situação
        </button>
      </div>
      <div className="space-y-2">
        <label className="block max-w-xs" htmlFor="situations-group-filter-input">
          <span className="pt-label">Filtrar por grupo</span>
          <select
            id="situations-group-filter-input"
            data-testid="situations-group-filter"
            className="pt-input"
            value={selectedGroupId ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              setSelectedGroupId(v === '' ? null : Number(v));
            }}
          >
            <option value="">Todos os grupos</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        {selectedGroupId != null && (
          <p className="text-sm text-muted-foreground">
            Grupo: {groups.find((g) => g.id === selectedGroupId)?.name ?? '—'}
          </p>
        )}
      </div>
      <div className="pt-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="p-3 text-left font-medium">Nome</th>
              <th className="p-3 text-left font-medium">Grupo</th>
              <th className="p-3 text-left font-medium">Posição</th>
              <th className="p-3 text-left font-medium">Stack (BB)</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/40">
                <td className="p-3">{r.name}</td>
                <td className="p-3">{groups.find((g) => g.id === r.groupId)?.name ?? '—'}</td>
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
                      await window.api.situations.duplicate(r.id);
                      void reload();
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
            {!rows.length && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
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
  );
}
