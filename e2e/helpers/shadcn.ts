import type { Page } from '@playwright/test';

/**
 * Selects an option in a shadcn/Radix Select component.
 * shadcn Select renders as a combobox button (not a native <select>),
 * so we must click the trigger first, then click the desired option.
 *
 * @param page - Playwright page
 * @param labelText - Accessible label of the select field (via htmlFor/aria-label)
 * @param optionLabel - Visible text of the option to select
 */
export async function selectShadcnOption(
  page: Page,
  labelText: string,
  optionLabel: string,
): Promise<void> {
  // Click the select trigger (combobox) associated with the label
  await page.getByRole('combobox', { name: labelText, exact: true }).click();
  // Click the option in the dropdown list
  await page.getByRole('option', { name: optionLabel, exact: true }).click();
}
