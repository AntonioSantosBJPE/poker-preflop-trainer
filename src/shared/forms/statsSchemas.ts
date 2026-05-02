import { z } from 'zod';
import { POSITIONS } from '@shared/constants';
import type { StatsFilters } from '@shared/ipc/types';

const sessionTypeSchema = z.enum(['single', 'simultaneous'], {
  message: 'Tipo de sessão inválido',
});

const baseStatsFiltersSchema = z.object({
  groupId: z.number().int().positive().optional(),
  situationIds: z.array(z.number().int().positive()).optional(),
  fromTs: z.number().int().nonnegative().optional(),
  toTs: z.number().int().nonnegative().optional(),
  positions: z.array(z.enum(POSITIONS)).optional(),
  sessionType: sessionTypeSchema.optional(),
  simultaneousTableCount: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
});

export const statsFiltersSchema = baseStatsFiltersSchema.superRefine((data, ctx) => {
  if (
    data.simultaneousTableCount !== undefined &&
    data.sessionType !== undefined &&
    data.sessionType !== 'simultaneous'
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['simultaneousTableCount'],
      message: 'Filtro de mesas simultâneas exige tipo de sessão simultâneo',
    });
  }

  if (data.simultaneousTableCount !== undefined && data.sessionType === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['simultaneousTableCount'],
      message: 'Filtro de mesas simultâneas exige tipo de sessão simultâneo',
    });
  }
});

export type StatsFiltersInput = z.input<typeof statsFiltersSchema>;
export type StatsFiltersValues = z.infer<typeof statsFiltersSchema>;

export function parseStatsFilters(raw: unknown): StatsFilters {
  if (raw === undefined || raw === null) return {};
  const result = statsFiltersSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? 'Filtros de estatísticas inválidos');
  }
  return result.data;
}
