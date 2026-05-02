import { ipcMain } from 'electron';
import { getDb } from '../db/client';
import { requireUserId } from '../services/session';
import {
  buildAuthSessionSnapshot,
  changeUserPassword,
  updateUserName,
  upsertUserPreferences,
} from '../db/profile';
import {
  parseProfileChangePasswordInput,
  parseProfileNameInput,
  parseProfilePreferencesInput,
} from '@shared/forms/profileSchemas';

export function registerProfileIpc(): void {
  ipcMain.handle('profile:updateName', async (_e, payload: unknown) => {
    const userId = await requireUserId();
    const parsed = parseProfileNameInput(payload);
    const db = getDb();

    await updateUserName(db, userId, parsed.name);
    return await buildAuthSessionSnapshot(db, userId);
  });

  ipcMain.handle('profile:changePassword', async (_e, payload: unknown) => {
    const userId = await requireUserId();
    const parsed = parseProfileChangePasswordInput(payload);
    const db = getDb();

    await changeUserPassword(db, userId, parsed.currentPassword, parsed.newPassword);
  });

  ipcMain.handle('profile:updatePreferences', async (_e, payload: unknown) => {
    const userId = await requireUserId();
    const parsed = parseProfilePreferencesInput(payload);
    const db = getDb();

    await upsertUserPreferences(db, userId, parsed);
    return await buildAuthSessionSnapshot(db, userId);
  });
}
