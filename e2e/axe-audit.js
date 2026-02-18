import { chromium } from 'playwright';
import axe from 'axe-core';

(async () => {
  const url = process.env.AUDIT_URL || 'http://localhost:3000';
  console.log(`Running axe-core audit against ${url}`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    // Inject axe
    await page.addScriptTag({ content: axe.source });

    // Run axe
    const results = await page.evaluate(async () => {
      return await new Promise((resolve) => {
        // @ts-ignore
        axe.run(document, { runOnly: { type: 'tag', values: ['wcag2aa'] } }, (err, results) => {
          if (err) resolve({ error: err.message });
          else resolve(results);
        });
      });
    });

    // Save results to file
    const fs = await import('fs');
    const out = JSON.stringify(results, null, 2);
    fs.writeFileSync('axe-report.json', out);
    console.log('Axe report saved to axe-report.json');
    if (results.violations && results.violations.length > 0) {
      console.log(`Found ${results.violations.length} accessibility violations.`);
      results.violations.forEach((v) => {
        console.log(`- ${v.id}: ${v.help} (${v.impact})`);
      });
      process.exitCode = 2;
    } else {
      console.log('No violations found for wcag2aa.');
    }
  } catch (err) {
    console.error('Audit failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
