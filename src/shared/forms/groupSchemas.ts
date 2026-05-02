import { z } from 'zod';

export const groupCreateSchema = z.object({
  name: z.string().trim().min(1, 'Nome obrigatório').max(100, 'Nome muito longo'),
});

export type GroupCreateInput = z.infer<typeof groupCreateSchema>;

export const groupRenameSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1, 'Nome obrigatório').max(100, 'Nome muito longo'),
});

export type GroupRenameInput = z.infer<typeof groupRenameSchema>;

export const groupArchiveSchema = z.object({
  id: z.number().int().positive(),
});

export type GroupArchiveInput = z.infer<typeof groupArchiveSchema>;

export function parseGroupCreate(raw: unknown): GroupCreateInput {
  const r = groupCreateSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(r.error.issues[0]?.message ?? 'Dados inválidos');
  }
  return r.data;
}

export function parseGroupRename(raw: unknown): GroupRenameInput {
  const r = groupRenameSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(r.error.issues[0]?.message ?? 'Dados inválidos');
  }
  return r.data;
}

export function parseGroupArchive(raw: unknown): GroupArchiveInput {
  const r = groupArchiveSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(r.error.issues[0]?.message ?? 'Dados inválidos');
  }
  return r.data;
}
