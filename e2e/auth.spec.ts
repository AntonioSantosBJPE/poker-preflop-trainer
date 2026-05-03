import { test, expect } from './fixtures';
import { loginWithPassword, logout, registerAccount, switchToLoginTab } from './helpers/auth';
import { uniqueUserCredentials } from './helpers/credentials';

test.describe('Autenticação', () => {
  test('login após logout', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);
    await logout(appPage);
    await loginWithPassword(appPage, user.email, user.password);
    await expect(
      appPage.getByRole('heading', { name: new RegExp(`Olá, ${user.displayName}`) }),
    ).toBeVisible();
  });

  test('credenciais inválidas', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);
    await logout(appPage);
    await loginWithPassword(appPage, user.email, 'password-errada');
    await expect(appPage.getByText('Credenciais inválidas')).toBeVisible();
  });

  test('registo com e-mail duplicado', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);
    await logout(appPage);
    await appPage.getByRole('button', { name: 'Criar conta' }).click();
    await appPage.getByLabel('Nome').fill('Outro nome');
    await appPage.getByLabel('E-mail').fill(user.email);
    await appPage.getByRole('textbox', { name: 'Senha' }).fill(user.password);
    await appPage.getByRole('button', { name: 'Cadastrar e entrar' }).click();
    await expect(appPage.getByText('E-mail já cadastrado')).toBeVisible();
  });

  test('validação client: e-mail inválido no login', async ({ appPage }) => {
    await switchToLoginTab(appPage);
    await appPage.getByLabel('E-mail').fill('não-é-email');
    await appPage.getByRole('textbox', { name: 'Senha' }).fill('qualquer');
    await appPage.locator('form').getByRole('button', { name: 'Entrar' }).click();
    await expect(appPage.getByText('E-mail inválido')).toBeVisible();
  });

  test('validação client: senha curta no registo', async ({ appPage }) => {
    await appPage.getByRole('button', { name: 'Criar conta' }).click();
    await appPage.getByLabel('Nome').fill('Teste');
    await appPage.getByLabel('E-mail').fill('ok@example.com');
    await appPage.getByRole('textbox', { name: 'Senha' }).fill('1234567');
    await appPage.getByRole('button', { name: 'Cadastrar e entrar' }).click();
    await expect(appPage.getByText(/8 caracteres/)).toBeVisible();
  });

  test('validação client: nome obrigatório no registo', async ({ appPage }) => {
    await appPage.getByRole('button', { name: 'Criar conta' }).click();
    await appPage.getByLabel('E-mail').fill('user@example.com');
    await appPage.getByRole('textbox', { name: 'Senha' }).fill('12345678');
    await appPage.getByRole('button', { name: 'Cadastrar e entrar' }).click();
    await expect(appPage.getByText('Nome obrigatório')).toBeVisible();
  });

  test('separador Entrar mostra formulário de login', async ({ appPage }) => {
    await appPage.getByRole('button', { name: 'Criar conta' }).click();
    await switchToLoginTab(appPage);
    await expect(appPage.locator('form').getByRole('button', { name: 'Entrar' })).toBeVisible();
  });
});
