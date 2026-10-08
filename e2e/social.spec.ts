import { expect, test } from '@playwright/test';

test('two friends chat, moderate and finish a hand alongside two bots', async ({ browser }, testInfo) => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })]);
  const pages = await Promise.all(contexts.map(c => c.newPage()));
  try {
    for (let i = 0; i < pages.length; i++) {
      await pages[i].goto('/');
      await pages[i].getByRole('button', { name: 'Sim, já conheço', exact: true }).click();
      await pages[i].getByLabel('O seu nome', { exact: true }).fill(i ? 'Bruno' : 'Ana');
    }
    await pages[0].getByRole('button', { name: 'Criar sala', exact: true }).click();
    await pages[1].getByLabel('Código da sala', { exact: true }).fill(await pages[0].getByTestId('room-code').innerText());
    await pages[1].getByRole('button', { name: 'Entrar na sala', exact: true }).click();
    for (const seat of [3, 4]) await pages[0].getByRole('button', { name: `Adicionar bot ao lugar ${seat}`, exact: true }).click();
    await expect(pages[0].getByText('Mesa de treino · inclui bots')).toBeVisible();
    for (const page of pages) await page.getByRole('button', { name: /^Conversa da sala/ }).click();
    await pages[1].getByLabel('Mensagem para a sala', { exact: true }).fill('Olá, boa partida!');
    await pages[1].getByRole('button', { name: 'Enviar mensagem', exact: true }).click();
    await expect(pages[0].getByText('Olá, boa partida!', { exact: true })).toBeVisible();
    await pages[0].getByRole('button', { name: 'Silenciar Bruno', exact: true }).click();
    await expect(pages[1].getByText('O anfitrião silenciou as suas mensagens nesta sala.', { exact: true })).toBeVisible();
    await pages[0].getByRole('button', { name: 'Permitir mensagens de Bruno', exact: true }).click();
    await pages[0].getByRole('button', { name: 'Ver pontuações', exact: true }).click();
    await expect(pages[0].getByTestId('score-value-0')).toHaveText('20');
    await pages[0].getByRole('button', { name: 'Voltar à mesa', exact: true }).click();
    await pages[0].getByRole('button', { name: 'Começar partida', exact: true }).click();
    await pages[1].getByRole('button', { name: '♣ Paus', exact: true }).click();
    await pages[1].getByRole('button', { name: 'Ver pontuações', exact: true }).click();
    await expect(pages[1].getByTestId('score-value-1')).toHaveText('20');
    await pages[1].getByRole('button', { name: 'Voltar à mesa', exact: true }).click();
    await pages[1].getByRole('button', { name: 'Participar sem trocar', exact: true }).click();
    await pages[0].getByRole('button', { name: 'Participar sem trocar', exact: true }).click();
    for (let move = 0; move < 10; move++) {
      let active = -1;
      await expect.poll(async () => {
        active = (await Promise.all(pages.map(p => p.getByText('É a sua vez', { exact: true }).count()))).findIndex(Boolean);
        return active >= 0;
      }, { timeout: 15000 }).toBe(true);
      const page = pages[active];
      const revision = await page.locator('[data-testid^="table-"]').getAttribute('data-testid');
      await page.locator('[data-testid^="card-"]:not([aria-disabled="true"])').first().click();
      await expect(page.locator('[data-testid^="table-"]')).not.toHaveAttribute('data-testid', revision!);
    }
    await expect(pages[0].getByText('Mão concluída', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(pages[1].getByTestId('score-chart')).toBeVisible();
    for (const seat of [0, 1, 2, 3]) await expect(pages[1].getByTestId(`score-value-${seat}`)).toHaveText(/^\d+$/);
    await pages[1].getByTestId('score-chart').screenshot({ path: testInfo.outputPath('mobile-score-chart.png') });
    expect(await pages[1].evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await pages[1].reload();
    await pages[1].getByRole('button', { name: /^Conversa da sala/ }).click();
    await expect(pages[1].getByText('Olá, boa partida!', { exact: true })).toBeVisible();
  } finally { await Promise.all(contexts.map(c => c.close())); }
});
