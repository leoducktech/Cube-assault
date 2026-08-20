const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const results = { console: [], errors: [], steps: [] };
  const filePath = path.resolve(process.cwd(), 'fps-game-js', 'home.html');
  const fileUrl = 'file://' + filePath.replace(/\\/g, '/');
  const storageKey = 'cube_assault_account';
  const purchasedPerksKey = 'cube_assault_purchased_perks';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => results.console.push(msg.text()));
  page.on('pageerror', err => results.errors.push(err.message));

  try {
      // Prepare a logged-in account with ample score: 100 Cubotics => 100*100 = 10000
      const initialAccount = { username: 'test_user', email: 'test@example.com', score: 10000 };

      // Inject account before any page scripts run so the UI reads it on startup
      await context.addInitScript((acct) => {
        try { localStorage.setItem('cube_assault_account', JSON.stringify(acct)); } catch(e) {}
        try { localStorage.setItem('cube_assault_purchased_perks', JSON.stringify([])); } catch(e) {}
      }, initialAccount);

      results.steps.push(`Navigate to ${fileUrl}`);
      await page.goto(fileUrl, { waitUntil: 'load' });

    // wait for perks to render
    await page.waitForSelector('#perk-items .perk-item');
    results.steps.push('Perk items rendered');

    // re-query Fortified Frame card and its button after injecting account
    const perkHandles = await page.$$('#perk-items .perk-item');
    let targetBtn = null;
    for (const h of perkHandles) {
      const title = await h.$eval('h4', n => n.innerText).catch(() => '');
      if (/Fortified Frame/i.test(title)) {
        targetBtn = await h.$('button.perk-select');
        break;
      }
    }

    if (!targetBtn) {
      results.steps.push('ERROR: could not find Fortified Frame button');
    } else {
      results.steps.push('Clicking Purchase on Fortified Frame');
      // diagnostic: capture button disabled state and account/purchased info
      const diag = await page.evaluate((btn) => {
        function safeParse(k, fallback) {
          try {
            const v = localStorage.getItem(k);
            if (v === null) return fallback;
            return JSON.parse(v);
          } catch (e) { return fallback; }
        }
        return {
          btnText: btn ? btn.innerText : null,
          btnDisabled: btn ? btn.disabled : null,
          account: safeParse('cube_assault_account', null),
          purchased: safeParse('cube_assault_purchased_perks', [])
        };
      }, targetBtn);
      results.steps.push(`diag: ${JSON.stringify(diag)}`);

      // wait until the button becomes enabled (not disabled) before clicking
      const btnHandle = targetBtn;
      try {
        await page.waitForFunction((el) => !el.disabled, btnHandle, { timeout: 5000 });
      } catch (e) {
        results.steps.push('Button did not become enabled in time');
      }
      try {
        await btnHandle.click();
      } catch (e) {
        results.steps.push('click failed: ' + e.message);
      }

      // wait for confirm modal
      await page.waitForSelector('#confirm-modal', { state: 'visible', timeout: 3000 });
      results.steps.push('Confirm modal visible');

      // click confirm
      await page.click('#confirm-ok');
      results.steps.push('Clicked confirm');

      // wait for toast
      await page.waitForSelector('#toast-container > div', { timeout: 3000 });
      results.steps.push('Toast appeared');

      // inspect localStorage for purchase and account changes
      const stored = await page.evaluate(({ pKey, aKey }) => {
        return {
          purchased: JSON.parse(localStorage.getItem(pKey) || '[]'),
          account: JSON.parse(localStorage.getItem(aKey) || 'null')
        };
      }, { pKey: purchasedPerksKey, aKey: storageKey });

      results.steps.push('Read localStorage after purchase');
      results.steps.push(`purchased includes fortified: ${Array.isArray(stored.purchased) && stored.purchased.includes('fortified')}`);
      results.steps.push(`account activePerk: ${stored.account && stored.account.activePerk}`);
      results.steps.push(`account score: ${stored.account && stored.account.score}`);
    }

  } catch (err) {
    results.errors.push(err.message);
  } finally {
    await browser.close();
  }

  console.log('--- HEADLESS REPRO RESULTS ---');
  console.log(JSON.stringify(results, null, 2));
})();
