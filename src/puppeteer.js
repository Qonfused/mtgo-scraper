import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

const usePuppeteerStealth = async () => {
  puppeteer.use(StealthPlugin());
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const page = (await browser.pages())[0];
  await page.setDefaultNavigationTimeout(0); 

  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (request.resourceType() === 'image' || request.resourceType() === 'stylesheet')
      request.abort();
    else
      request.continue();
  });
  return { browser, page };
}

export default usePuppeteerStealth;