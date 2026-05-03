import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

function getStartOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

function getEndOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return Math.floor(d.getTime() / 1000);
}

function getStartOfMonth(date: Date): number {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return Math.floor(d.getTime() / 1000);
}

const PRESETS = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last7', label: 'Últimos 7 dias' },
  { value: 'last15', label: 'Últimos 15 dias' },
  { value: 'currentMonth', label: 'Mês atual' },
  { value: 'last30', label: 'Últimos 30 dias' },
  { value: 'last90', label: 'Últimos 90 dias' },
  { value: 'custom', label: 'Personalizado' },
] as const;

export interface DatePeriodFilterProps {
  onChange: (filters: { fromTs?: number; toTs?: number }) => void;
  className?: string;
}

export function DatePeriodFilter({
  onChange,
  className,
}: DatePeriodFilterProps): React.ReactElement {
  const [preset, setPreset] = useState('currentMonth');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [error, setError] = useState('');
  const mounted = useRef(false);

  const computePreset = useCallback((value: string) => {
    const now = Date.now();
    const nowSec = Math.floor(now / 1000);

    switch (value) {
      case 'today':
        return { fromTs: getStartOfDay(new Date(now)), toTs: nowSec };
      case 'yesterday': {
        const yesterday = new Date(now - 86400000);
        return { fromTs: getStartOfDay(yesterday), toTs: getEndOfDay(yesterday) };
      }
      case 'last7':
        return { fromTs: nowSec - 7 * 86400, toTs: nowSec };
      case 'last15':
        return { fromTs: nowSec - 15 * 86400, toTs: nowSec };
      case 'currentMonth':
        return { fromTs: getStartOfMonth(new Date(now)), toTs: nowSec };
      case 'last30':
        return { fromTs: nowSec - 30 * 86400, toTs: nowSec };
      case 'last90':
        return { fromTs: nowSec - 90 * 86400, toTs: nowSec };
      default:
        return {};
    }
  }, []);

  const handlePresetChange = useCallback(
    (value: string) => {
      setPreset(value);
      setError('');
      if (value !== 'custom') {
        setCustomFrom('');
        setCustomTo('');
        onChange(computePreset(value));
      }
    },
    [computePreset, onChange],
  );

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      onChange(computePreset('currentMonth'));
    }
  }, [computePreset, onChange]);

  const handleCustomDateChange = useCallback(() => {
    if (!customFrom || !customTo) return;

    const fromDate = new Date(`${customFrom}T00:00:00`);
    const toDate = new Date(`${customTo}T23:59:59`);

    if (fromDate > toDate) {
      setError('Data inicial não pode ser maior que a data final');
      return;
    }

    setError('');
    onChange({
      fromTs: Math.floor(fromDate.getTime() / 1000),
      toTs: Math.floor(toDate.getTime() / 1000),
    });
  }, [customFrom, customTo, onChange]);

  useEffect(() => {
    if (preset === 'custom') {
      handleCustomDateChange();
    }
  }, [customFrom, customTo, preset, handleCustomDateChange]);

  return (
    <div className={cn('flex flex-wrap items-end gap-3', className)}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="period-select">Período</Label>
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[180px]" id="period-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {preset === 'custom' && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="custom-from">De</Label>
            <input
              id="custom-from"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="block h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="custom-to">Até</Label>
            <input
              id="custom-to"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="block h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </>
      )}
    </div>
  );
}
