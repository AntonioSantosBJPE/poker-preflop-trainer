import { test, expect } from './fixtures';
import { registerAccount } from './helpers/auth';
import { uniqueGroupName, uniqueSituationName, uniqueUserCredentials } from './helpers/credentials';
import { createGroup } from './helpers/group';
import { createSituationMinimal } from './helpers/situation';
import {
  answerFoldEndOfSession,
  answerFoldImmediate,
  cancelAbandon,
  clickAbandon,
  clickPause,
  confirmAbandon,
  openTrainingConfig,
  selectGroupForTraining,
  selectSituationsForTraining,
  setFeedbackMode,
  setTrainingHands,
  setTrainingTimer,
  startTrainingSession,
} from './helpers/training';

test.describe('Treino', () => {
  test('Iniciar desativado sem situação selecionada', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);
    await openTrainingConfig(appPage);
    await expect(appPage.getByTestId('training-step-1')).toBeVisible();
    await expect(appPage.getByRole('button', { name: 'Iniciar' })).toHaveCount(0);
  });

  test('validação client: número de mãos acima do máximo', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);
    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, groupName);
    await selectSituationsForTraining(appPage, [situationName]);
    await setTrainingHands(appPage, 501);
    await startTrainingSession(appPage);
    await expect(appPage.getByText(/500/)).toBeVisible();
  });

  test('várias mãos com feedback imediato', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, groupName);
    await selectSituationsForTraining(appPage, [situationName]);
    await setTrainingHands(appPage, 2);
    await startTrainingSession(appPage);

    await expect(appPage.getByText(/Mão 1 \/ 2/)).toBeVisible();
    await answerFoldImmediate(appPage);
    await expect(appPage.getByText(/Mão 2 \/ 2/)).toBeVisible();
    await answerFoldImmediate(appPage);
    await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible();
  });

  test('feedback ao final da sessão sem painel entre mãos', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, groupName);
    await selectSituationsForTraining(appPage, [situationName]);
    await setTrainingHands(appPage, 2);
    await setFeedbackMode(appPage, 'END_OF_SESSION');
    await startTrainingSession(appPage);

    await expect(appPage.getByText(/Mão 1 \/ 2/)).toBeVisible();
    await answerFoldEndOfSession(appPage);
    await expect(appPage.getByText(/Correto|Incorreto/)).not.toBeVisible();
    await expect(appPage.getByText(/Mão 2 \/ 2/)).toBeVisible();
    await answerFoldEndOfSession(appPage);
    await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible();
  });

  test('abandonar sessão — cancelar mantém sessão ativa', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, groupName);
    await selectSituationsForTraining(appPage, [situationName]);
    await setTrainingHands(appPage, 5);
    await startTrainingSession(appPage);

    await expect(appPage.getByText(/Mão 1 \/ 5/)).toBeVisible();
    await clickAbandon(appPage);
    await expect(appPage.getByRole('alertdialog')).toBeVisible();
    await expect(appPage.getByText('Abandonar sessão?')).toBeVisible();
    await cancelAbandon(appPage);
    await expect(appPage.getByRole('alertdialog')).not.toBeVisible();
    await expect(appPage.getByText(/Mão 1 \/ 5/)).toBeVisible();
  });

  test('abandonar sessão — confirmar navega para resultado', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, groupName);
    await selectSituationsForTraining(appPage, [situationName]);
    await setTrainingHands(appPage, 5);
    await startTrainingSession(appPage);

    await expect(appPage.getByText(/Mão 1 \/ 5/)).toBeVisible();
    await clickAbandon(appPage);
    await expect(appPage.getByRole('alertdialog')).toBeVisible();
    await confirmAbandon(appPage);
    await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible();
  });

  test('timer conta regressiva e dispara timeout', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, groupName);
    await selectSituationsForTraining(appPage, [situationName]);
    await setTrainingHands(appPage, 1);
    await setTrainingTimer(appPage, 2);
    await startTrainingSession(appPage);

    await expect(appPage.getByText(/Mão 1 \/ 1/)).toBeVisible();
    await expect(appPage.getByText(/^\d+s$/)).toBeVisible();
    // Aguarda timeout disparar (2s timer + margem de 3s)
    await appPage.waitForTimeout(3000);
    // Após timeout a mão é submetida: aparece feedback ou resultado da sessão
    await expect(
      appPage
        .getByText(/Correto|Incorreto/)
        .or(appPage.getByRole('heading', { name: 'Resultado da sessão' })),
    ).toBeVisible({ timeout: 5000 });
  });

  test('cartas exibem ícone de naipe e não letra isolada', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, groupName);
    await selectSituationsForTraining(appPage, [situationName]);
    await setTrainingHands(appPage, 1);
    await startTrainingSession(appPage);

    await expect(appPage.getByText(/Mão 1 \/ 1/)).toBeVisible();
    // Deve haver exatamente 2 cartas com aria-label descrevendo o naipe em português
    const cards = appPage.locator('[aria-label*=" de "]').filter({ hasText: /[♠♥♦♣]/ });
    await expect(cards).toHaveCount(2);
    // Nenhuma carta deve conter letra isolada de naipe S/H/D/C maiúscula
    const cardLabels = await appPage.locator('[aria-label*=" de "]').all();
    for (const card of cardLabels) {
      const text = await card.textContent();
      expect(text).not.toMatch(/^[A-Z2-9]+[SHDC]$/);
    }
  });

  test('resultado da sessão liga para nova sessão', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, groupName);
    await selectSituationsForTraining(appPage, [situationName]);
    await setTrainingHands(appPage, 1);
    await startTrainingSession(appPage);
    await answerFoldImmediate(appPage);

    await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible();
    await appPage.getByRole('link', { name: 'Nova sessão' }).click();
    await expect(appPage.getByRole('heading', { name: 'Configurar treino' })).toBeVisible();
  });

  test('resultado da sessão oferece rever sessão', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, groupName);
    await selectSituationsForTraining(appPage, [situationName]);
    await setTrainingHands(appPage, 1);
    await startTrainingSession(appPage);
    await answerFoldImmediate(appPage);

    await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible();
    await expect(appPage.getByRole('link', { name: 'Rever sessão' })).toBeVisible();
    await appPage.getByRole('link', { name: 'Rever sessão' }).click();
    await expect(appPage.getByRole('heading', { name: 'Revisão da Sessão' })).toBeVisible();
  });

  test('pausar continua sessão — timer congela e retoma', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, groupName);
    await selectSituationsForTraining(appPage, [situationName]);
    await setTrainingHands(appPage, 1);
    await setTrainingTimer(appPage, 3);
    await startTrainingSession(appPage);

    await expect(appPage.getByText(/Mão 1 \/ 1/)).toBeVisible();
    await expect(appPage.getByTestId('pause-continue-btn')).toHaveText('Pausar');
    await clickPause(appPage);
    await expect(appPage.getByTestId('pause-continue-btn')).toHaveText('Continuar');
    await expect(appPage.getByText('Pausada')).toBeVisible();

    // Timer de 3s teria expirado em 3s; esperamos 5s para confirmar que pause congelou
    await appPage.waitForTimeout(5000);

    // Feedback não deve ter aparecido (timer congelado)
    await expect(appPage.getByText(/Correto|Incorreto/)).not.toBeVisible();

    // Continua — timer retoma
    await clickPause(appPage);
    await expect(appPage.getByTestId('pause-continue-btn')).toHaveText('Pausar');

    // Aguarda timeout disparar
    await expect(
      appPage
        .getByText(/Correto|Incorreto/)
        .or(appPage.getByRole('heading', { name: 'Resultado da sessão' })),
    ).toBeVisible({ timeout: 10000 });
  });

  test('barra de progresso visível no cabeçalho da sessão', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, groupName);
    await selectSituationsForTraining(appPage, [situationName]);
    await setTrainingHands(appPage, 3);
    await startTrainingSession(appPage);

    await expect(appPage.getByTestId('progress-track')).toBeVisible();

    // Mão 1/3 — filler deve estar visível
    await expect(appPage.getByTestId('progress-filler')).toBeVisible();
  });

  test('ícone de cronômetro visível com timer ativo', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, groupName);
    await selectSituationsForTraining(appPage, [situationName]);
    await setTrainingHands(appPage, 1);
    await setTrainingTimer(appPage, 10);
    await startTrainingSession(appPage);

    await expect(appPage.getByTestId('timer-icon')).toBeVisible();
  });
});
