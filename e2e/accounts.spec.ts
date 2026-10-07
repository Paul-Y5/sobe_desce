import { expect, test } from '@playwright/test';

test('register, reload HttpOnly account session, sign out and sign in', async ({ page }) => {
  await page.goto('/account');
  await page.getByRole('button', { name: 'Quero criar uma conta' }).click();
  await page.getByLabel('Nome da conta', { exact: true }).fill('Conta de teste');
  const email = `browser-${Date.now()}@example.test`;
  await page.getByLabel('Correio eletrónico', { exact: true }).fill(email);
  await page.getByLabel('Palavra-passe', { exact: true }).fill('browser-safe-password');
  await page.getByRole('button', { name: 'Registar conta' }).click();
  await expect(page.getByText('A sua conta', { exact: true })).toBeVisible();
  expect((await page.context().cookies()).some(c => c.httpOnly && c.name.includes('session_token'))).toBe(true);
  await page.reload();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Terminar sessão' }).click();
  await page.getByLabel('Correio eletrónico', { exact: true }).fill(email);
  await page.getByLabel('Palavra-passe', { exact: true }).fill('browser-safe-password');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('A sua conta', { exact: true })).toBeVisible();
  await page.goto('/admin');
  await expect(page.getByText('Acesso reservado')).toBeVisible();
});
