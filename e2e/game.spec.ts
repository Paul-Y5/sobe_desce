import { expect, test, type Page } from '@playwright/test';

test('four browsers play a complete match, reload a seat, and restart', async ({ browser }, testInfo) => {
  const contexts = await Promise.all(Array.from({ length: 4 }, (_, i) => browser.newContext(i === 3 ? { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } : {})));
  const pages = await Promise.all(contexts.map(c => c.newPage()));
  const errors: string[] = [];
  pages.forEach(p => p.on('pageerror', e => errors.push(e.message)));
  try {
    await Promise.all(pages.map(async (page, index) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Sim, já conheço', exact: true }).click();
      await page.getByLabel('O seu nome', { exact: true }).fill(['Ana', 'Bruno', 'Carla', 'Diogo'][index]);
    }));
    await pages[0].getByRole('button', { name: 'Criar sala', exact: true }).click();
    const code = await pages[0].getByTestId('room-code').innerText();
    for (const page of pages.slice(1)) {
      await page.getByLabel('Código da sala', { exact: true }).fill(code);
      await page.getByRole('button', { name: 'Entrar na sala', exact: true }).click();
    }
    await pages[0].getByRole('button', { name: 'Começar partida', exact: true }).click();
    await pages[1].getByRole('button', { name: '♥ Copas', exact: true }).click();
    await expect(pages[3].getByText('A sua mão', { exact: true })).toBeVisible();
    expect(await pages[3].evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await pages[3].screenshot({ path: testInfo.outputPath('mobile-table.png'), fullPage: true });
    await pages[0].screenshot({ path: testInfo.outputPath('desktop-table.png'), fullPage: true });
    await pages[2].reload();
    await expect(pages[2].getByText('A sua mão', { exact: true })).toBeVisible();
    for (const i of [1, 2, 3, 0]) {
      if (i === 1) {
        await pages[i].locator('[data-testid^="card-"]').first().click();
        await pages[i].getByRole('button', { name: 'Participar e trocar 1', exact: true }).click();
      } else await pages[i].getByRole('button', { name: 'Participar sem trocar', exact: true }).click();
    }
    async function playHand() {
      let moves = 0;
      while (!await pages[0].getByText('Mão concluída', { exact: true }).count() && !await pages[0].getByText(/^(Temos vencedor!|Vitória partilhada!)$/).count()) {
        let active: Page | undefined;
        await expect.poll(async () => {
          const current = await Promise.all(pages.map(p => p.getByText('É a sua vez', { exact: true }).count()));
          active = pages[current.findIndex(Boolean)];
          return !!active || !!(await pages[0].getByText(/^(Mão concluída|Temos vencedor!|Vitória partilhada!)$/).count());
        }).toBe(true);
        if (!active) break;
        const revision = await active.locator('[data-testid^="table-"]').getAttribute('data-testid');
        await active.locator('[data-testid^="card-"]:not([aria-disabled="true"])').first().click();
        // The same player can lead again; wait for the revision, not a turn change.
        await Promise.all(pages.map(p => expect(p.locator('[data-testid^="table-"]')).not.toHaveAttribute('data-testid', revision!)));
        if (++moves > 24) throw new Error('More than five tricks were played');
      }
    }
    await playHand();
    await expect(pages[0].getByText('Mão concluída', { exact: true })).toBeVisible();
    // Subsequent hands: only the chooser participates, guaranteeing eventual victory.
    for (let hand = 2; hand <= 15; hand++) {
      await pages[0].getByRole('button', { name: 'Próxima mão', exact: true }).click();
      const chooser = hand % 4;
      await pages[chooser].getByRole('button', { name: '♥ Copas', exact: true }).click();
      await pages[chooser].getByRole('button', { name: 'Participar sem trocar', exact: true }).click();
      for (let offset = 1; offset < 4; offset++) await pages[(chooser + offset) % 4].getByRole('button', { name: 'Ficar de fora', exact: true }).click();
      await playHand();
      if (await pages[0].getByText(/^(Temos vencedor!|Vitória partilhada!)$/).count()) break;
    }
    await expect(pages[0].getByText(/^(Temos vencedor!|Vitória partilhada!)$/)).toBeVisible();
    await pages[0].getByRole('button', { name: 'Nova partida', exact: true }).click();
    await pages[0].getByRole('button', { name: 'Continuar nesta partida', exact: true }).click();
    await expect(pages[0].getByText(/^(Temos vencedor!|Vitória partilhada!)$/)).toBeVisible();
    await pages[0].getByRole('button', { name: 'Nova partida', exact: true }).click();
    await pages[0].getByRole('button', { name: 'Sim, recomeçar', exact: true }).click();
    await expect(pages[0].getByTestId('room-code')).toHaveText(code);
    expect(errors).toEqual([]);
  } finally { await Promise.all(contexts.map(c => c.close())); }
});

test('narrow touch viewport: entry, rules and lobby fit', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sim, já conheço', exact: true }).click();
    await expect(page.getByLabel('O seu nome', { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('mobile-home.png'), fullPage: true });
    await page.getByRole('link', { name: 'Como jogar ↗' }).click();
    await expect(page.getByText('As regras da nossa mesa.')).toBeVisible();
    await page.goto('/');
    await page.getByLabel('O seu nome', { exact: true }).fill('Leonor');
    await page.getByRole('button', { name: 'Criar sala', exact: true }).click();
    await expect(page.getByTestId('room-code')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally { await context.close(); }
});

test('visual tutorial teaches with practice, remembers the answer and supports reduced motion', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  try {
    await page.goto('/');
    await expect(page.getByText('Já sabe jogar Sobe e Desce?', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Quero aprender', exact: true }).click();
    await expect(page.getByText('Ganhar é chegar a zero.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Ganhar 3 vazas', exact: true }).click();
    await expect(page.getByTestId('tutorial-score')).toHaveText('17');
    await page.getByRole('button', { name: 'Seguinte', exact: true }).click();
    await expect(page.getByText('O 7 vale mais do que o Rei.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Seguinte', exact: true }).click();
    await page.getByRole('button', { name: '♥ Copas', exact: true }).click();
    await expect(page.getByTestId('tutorial-hand').locator('[data-testid^="example-"]')).toHaveCount(5);
    await page.getByRole('button', { name: 'Seguinte', exact: true }).click();
    await page.getByTestId('tutorial-hand').getByRole('button').first().click();
    await page.getByRole('button', { name: 'Trocar 1 carta', exact: true }).click();
    await expect(page.getByText('Carta trocada. A descartada não volta ao baralho.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Seguinte', exact: true }).click();
    await page.getByRole('button', { name: 'Ás de Espadas', exact: true }).click();
    await expect(page.getByText('Ainda tem copas: tem de assistir ao naipe.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Ás de Copas', exact: true }).click();
    await expect(page.getByText('Certo! Assiste a copas e bate o 7 com o Ás.', { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('tutorial-practice.png'), fullPage: true });
    await page.getByRole('button', { name: 'Seguinte', exact: true }).click();
    await expect(page.getByText('Copas muda as contas.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Vamos jogar', exact: true }).click();
    await page.reload();
    await expect(page.getByLabel('O seu nome', { exact: true })).toBeVisible();
    await expect(page.getByText('Já sabe jogar Sobe e Desce?', { exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'Como jogar ↗' }).click();
    await page.getByRole('link', { name: 'Abrir tutorial visual', exact: true }).click();
    await expect(page.getByText('Ganhar é chegar a zero.', { exact: true })).toBeVisible();
  } finally { await context.close(); }
});

test('five-minute warning, one-minute grace and explicit return work in the browser', async ({ browser, request }) => {
  const contexts = await Promise.all(Array.from({ length: 4 }, () => browser.newContext()));
  const pages = await Promise.all(contexts.map(c => c.newPage()));
  try {
    for (let i = 0; i < 4; i++) {
      await pages[i].goto('/');
      await pages[i].getByRole('button', { name: 'Sim, já conheço', exact: true }).click();
      await pages[i].getByLabel('O seu nome', { exact: true }).fill(`Jogador ${i + 1}`);
    }
    await pages[0].getByRole('button', { name: 'Criar sala', exact: true }).click();
    const code = await pages[0].getByTestId('room-code').innerText();
    for (const p of pages.slice(1)) {
      await p.getByLabel('Código da sala', { exact: true }).fill(code);
      await p.getByRole('button', { name: 'Entrar na sala', exact: true }).click();
    }
    await pages[0].getByRole('button', { name: 'Começar partida', exact: true }).click();
    await expect(pages[1].getByTestId('turn-notice')).toContainText('Escolha o trunfo');
    await expect(pages[1].getByTestId('turn-timer')).toHaveText(/0[45]:\d\d/);
    let cards = await pages[1].locator('[data-testid^="card-"]').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-testid')));
    expect((await request.post('http://127.0.0.1:3102/advance', { data: { ms: 300_000 } })).ok()).toBe(true);
    await expect(pages[1].getByText('Já passaram cinco minutos. Tem mais um minuto para decidir antes de ser desligado por inatividade.', { exact: true })).toBeVisible();
    await expect(pages[1].getByTestId('turn-timer')).toHaveText('00:00');
    // Deciding during grace dismisses the obsolete warning and starts a fresh deadline.
    await pages[1].getByRole('button', { name: '♥ Copas', exact: true }).click();
    await expect(pages[1].getByText('Já passaram cinco minutos. Tem mais um minuto para decidir antes de ser desligado por inatividade.', { exact: true })).toHaveCount(0);
    await expect(pages[1].getByTestId('turn-timer')).toHaveText(/0[45]:\d\d/);
    cards = await pages[1].locator('[data-testid^="card-"]').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-testid')));
    expect((await request.post('http://127.0.0.1:3102/advance', { data: { ms: 300_000 } })).ok()).toBe(true);
    await expect(pages[1].getByTestId('turn-timer')).toHaveText('00:00');
    expect((await request.post('http://127.0.0.1:3102/advance', { data: { ms: 60_000 } })).ok()).toBe(true);
    await expect(pages[1].getByRole('button', { name: 'Voltar à partida', exact: true })).toBeVisible();
    await pages[1].reload();
    await expect(pages[1].getByRole('button', { name: 'Voltar à partida', exact: true })).toBeVisible();
    await pages[1].getByRole('button', { name: 'Voltar à partida', exact: true }).click();
    await expect(pages[1].getByTestId('turn-timer')).toHaveText(/0[45]:\d\d/);
    expect(await pages[1].locator('[data-testid^="card-"]').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-testid')))).toEqual(cards);
    await expect(pages[1].getByTestId('turn-notice')).toContainText('É o momento de trocar');
    await pages[1].getByRole('button', { name: 'Participar sem trocar', exact: true }).click();
    await expect(pages[2].getByTestId('turn-notice')).toContainText('É o momento de trocar');
  } finally { await Promise.all(contexts.map(c => c.close())); }
});
