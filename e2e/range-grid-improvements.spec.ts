import { test, expect } from './fixtures';
import { registerAccount } from './helpers/auth';
import { uniqueGroupName, uniqueSituationName, uniqueUserCredentials } from './helpers/credentials';
import { createGroup } from './helpers/group';

const rangeGridSelector = '[data-testid="range-grid-13"]';

test.describe('Range Grid — melhorias de usabilidade', () => {
  test.beforeEach(async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await appPage.getByRole('link', { name: 'Situações' }).click();
    await appPage.getByRole('button', { name: 'Nova situação' }).click();
    await expect(appPage.getByRole('heading', { name: 'Nova situação' })).toBeVisible();
    await appPage.getByLabel('Nome').fill(uniqueSituationName());
    await appPage.getByTestId('situation-group-select').selectOption({ label: groupName });
  });

  test('células do grid exibem label da mão (AA, 87s, 87o)', async ({ appPage }) => {
    const rangeGrid = appPage.locator(rangeGridSelector);
    const cells = rangeGrid.locator('button[title]');
    await expect(cells).toHaveCount(169);

    // Diagonal: pares (ex: AA = title e text iguais)
    const aaCell = cells.filter({ hasText: 'AA' }).first();
    await expect(aaCell).toBeVisible();
    await expect(aaCell).toHaveText('AA');

    // Acima da diagonal: suited
    const suited = cells.filter({ hasText: /^[A-Z2-9]{2}s$/ }).first();
    await expect(suited).toBeVisible();

    // Abaixo da diagonal: offsuit
    const offsuit = cells.filter({ hasText: /^[A-Z2-9]{2}o$/ }).first();
    await expect(offsuit).toBeVisible();
  });

  test('percentagem de range por ação começa em 0.0%', async ({ appPage }) => {
    // Antes de pintar qualquer célula, a percentagem de cada ação deve ser 0.0%
    const pctBadges = appPage.locator('span.tabular-nums').filter({ hasText: /^\d+\.\d+%$/ });
    const count = await pctBadges.count();
    // Há pelo menos 2 ações por padrão (Fold e Raise)
    expect(count).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < count; i++) {
      const text = await pctBadges.nth(i).textContent();
      // O total global começa com "Range total:" por isso filtramos só os badges por ação
      if (text && !text.includes('Range total')) {
        expect(text.trim()).toBe('0.0%');
      }
    }
  });

  test('percentagem aumenta ao pintar células', async ({ appPage }) => {
    const rangeGrid = appPage.locator(rangeGridSelector);
    const cells = rangeGrid.locator('button[title]');

    // AA é um par: 6 combos; 6/1326 * 100 ≈ 0.5%
    const aaCell = cells.filter({ hasText: 'AA' }).first();
    await aaCell.click();

    // O badge da primeira ação deve mostrar 0.5%
    const firstActionPct = appPage
      .locator('span.tabular-nums')
      .filter({ hasText: /^\d+\.\d+%$/ })
      .first();
    await expect(firstActionPct).toHaveText('0.5%');

    // Range total também deve refletir
    await expect(appPage.getByText(/Range total:/)).toContainText('0.5%');
  });

  test('percentagem contabiliza combos corretamente (suited vs offsuit)', async ({ appPage }) => {
    const rangeGrid = appPage.locator(rangeGridSelector);
    const cells = rangeGrid.locator('button[title]');

    // Pintar uma célula suited (4 combos) e uma offsuit (12 combos)
    const suitedCell = cells.filter({ hasText: /^[A-Z2-9]{2}s$/ }).first();
    const offsuitCell = cells.filter({ hasText: /^[A-Z2-9]{2}o$/ }).first();
    await suitedCell.click();
    await offsuitCell.click();

    // Total: 4 + 12 = 16 combos → 16/1326 * 100 ≈ 1.2%
    const rangeTotal = appPage.getByText(/Range total:/);
    await expect(rangeTotal).toContainText('1.2%');
  });

  test('ação ativa para pintura tem highlight visual na linha', async ({ appPage }) => {
    const actionsSection = appPage.getByTestId('situation-actions-panel');
    const actionRows = actionsSection.getByTestId('situation-action-row');

    // Por padrão a primeira ação está ativa (highlight)
    const firstRow = actionRows.first();
    await expect(firstRow).toHaveClass(/border-primary/);

    // Clicar em "Pintar" na segunda ação muda o highlight
    const secondRow = actionRows.nth(1);
    await secondRow.getByRole('button', { name: 'Pintar' }).click();
    await expect(secondRow).toHaveClass(/border-primary/);
    await expect(firstRow).not.toHaveClass(/border-primary/);
  });

  test('limpar todo o range apaga todas as células', async ({ appPage }) => {
    const rangeGrid = appPage.locator(rangeGridSelector);
    const cells = rangeGrid.locator('button[title]');

    // Pintar algumas células
    await cells.nth(0).click();
    await cells.nth(1).click();
    await cells.nth(2).click();

    // Range total > 0 antes de limpar
    const rangeTotal = appPage.getByText(/Range total:/);
    const before = await rangeTotal.textContent();
    expect(before).not.toContain('0.0%');

    // Limpar tudo
    await appPage.getByRole('button', { name: 'Limpar tudo' }).click();
    await expect(rangeTotal).toContainText('0.0%');
  });

  test('limpar range de uma ação apaga só as células dessa ação', async ({ appPage }) => {
    const rangeGrid = appPage.locator(rangeGridSelector);
    const cells = rangeGrid.locator('button[title]');
    const actionsSection = appPage.getByTestId('situation-actions-panel');
    const actionRows = actionsSection.getByTestId('situation-action-row');

    // Pintar AA com a primeira ação (ativa por padrão)
    const aaCell = cells.filter({ hasText: 'AA' }).first();
    await aaCell.click();

    // Mudar para segunda ação e pintar outra célula (suited)
    await actionRows.nth(1).getByRole('button', { name: 'Pintar' }).click();
    const suitedCell = cells.filter({ hasText: /^[A-Z2-9]{2}s$/ }).first();
    await suitedCell.click();

    // Range total > 0 (ambas ações pintadas)
    const rangeTotal = appPage.getByText(/Range total:/);
    const before = await rangeTotal.textContent();
    expect(before).not.toContain('0.0%');

    // Limpar apenas a segunda ação
    await actionRows.nth(1).getByRole('button', { name: 'Limpar' }).click();

    // O badge da segunda ação volta a 0.0%
    const secondPct = actionRows.nth(1).locator('span.tabular-nums');
    await expect(secondPct).toHaveText('0.0%');

    // O range total ainda reflete a primeira ação (AA = 6 combos ≈ 0.5%)
    await expect(rangeTotal).toContainText('0.5%');
  });
});
