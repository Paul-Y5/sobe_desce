import { expect, test } from '@playwright/test';

test('match modes: configure competitive lines and finish infinite play below zero', async ({ browser }, testInfo) => {
  const contexts = await Promise.all(Array.from({ length: 4 }, (_, i) => browser.newContext(i === 0 ? { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } : {})));
  const pages = await Promise.all(contexts.map(c => c.newPage()));
  try {
    for (let i = 0; i < 4; i++) {
      await pages[i].goto('/'); await pages[i].getByRole('button', { name: 'Sim, já conheço', exact: true }).click();
      await pages[i].getByLabel('O seu nome', { exact: true }).fill(['Ana', 'Bruno', 'Carla', 'Diogo'][i]);
    }
    const host = pages[0];
    await host.getByRole('button', { name: 'Criar sala', exact: true }).click();
    const code = await host.getByTestId('room-code').innerText();
    for (const page of pages.slice(1)) {
      await page.getByLabel('Código da sala', { exact: true }).fill(code);
      await page.getByRole('button', { name: 'Entrar na sala', exact: true }).click();
    }
    await host.getByRole('button', { name: 'Competitivo', exact: true }).click();
    for (let i = 0; i < 2; i++) await host.getByRole('button', { name: 'Mais uma linha', exact: true }).click();
    await expect(host.getByTestId('competition-target')).toHaveText('3 linhas · Primeiro a 12 vitórias');
    await expect(pages[1].getByRole('button', { name: 'Infinito', exact: true })).toBeDisabled();
    await host.getByRole('button', { name: 'Começar partida', exact: true }).click();
    async function solo(hand: number) {
      const chooser = hand % 4;
      await pages[chooser].getByRole('button', { name: '♥ Copas', exact: true }).click();
      await pages[chooser].getByRole('button', { name: 'Participar sem trocar', exact: true }).click();
      for (let offset = 1; offset < 4; offset++) await pages[(chooser + offset) % 4].getByRole('button', { name: 'Ficar de fora', exact: true }).click();
      for (let i = 0; i < 5; i++) {
        const active = pages[chooser];
        const revision = await active.locator('[data-testid^="table-"]').getAttribute('data-testid');
        await active.locator('[data-testid^="card-"]:not([aria-disabled="true"])').first().click();
        await expect(active.locator('[data-testid^="table-"]')).not.toHaveAttribute('data-testid', revision!);
      }
    }
    for (let hand = 1; hand <= 5; hand++) {
      await solo(hand);
      if (hand < 5) await host.getByRole('button', { name: 'Próxima mão', exact: true }).click();
    }
    await expect(host.getByText('Jogo concluído', { exact: true })).toBeVisible();
    await expect(host.getByTestId('game-wins-1')).toHaveText('1 / 12');
    await host.getByRole('button', { name: 'Jogo seguinte', exact: true }).click();
    await host.getByRole('button', { name: 'Ver pontuações', exact: true }).click();
    await expect(host.getByTestId('game-wins-1')).toHaveText('1 / 12');
    await expect(host.getByTestId('score-value-1')).toHaveText('20');
    await host.getByRole('button', { name: 'Voltar à mesa', exact: true }).click();
    await host.getByRole('button', { name: 'Recomeçar competição', exact: true }).click();
    await host.getByRole('button', { name: 'Sim, recomeçar', exact: true }).click();
    await host.getByRole('button', { name: 'Infinito', exact: true }).click();
    await host.getByRole('button', { name: 'Começar partida', exact: true }).click();
    for (let hand = 1; hand <= 9; hand++) {
      await solo(hand);
      await expect(host.getByText('Mão concluída', { exact: true })).toBeVisible();
      if (hand < 9) await host.getByRole('button', { name: 'Próxima mão', exact: true }).click();
    }
    await expect(host.getByTestId('score-value-1')).toHaveText('-10');
    await host.getByTestId('score-chart').screenshot({ path: testInfo.outputPath('infinite-negative-chart.png') });
    expect(await host.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await host.getByRole('button', { name: 'Terminar modo Infinito', exact: true }).click();
    await host.getByRole('button', { name: 'Continuar a jogar', exact: true }).click();
    await expect(host.getByText('Mão concluída', { exact: true })).toBeVisible();
    await host.getByRole('button', { name: 'Terminar modo Infinito', exact: true }).click();
    await host.getByRole('button', { name: 'Sim, terminar', exact: true }).click();
    await expect(host.getByText('Temos vencedor!', { exact: true })).toBeVisible();
    await expect(host.getByText('Bruno terminou com a menor pontuação.', { exact: true })).toBeVisible();
    await expect(host.getByTestId('score-value-1')).toHaveText('-10');
  } finally { await Promise.all(contexts.map(c => c.close())); }
});
