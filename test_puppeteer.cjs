const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log("Navigating...");
  await page.goto('https://web-production-b66e7.up.railway.app/chatbot.html?v=1.2', {waitUntil: 'networkidle0'});

  console.log("Clicking btnLight...");
  await page.click('#btnLight');
  
  await new Promise(r => setTimeout(r, 1000));
  
  console.log("Taking screenshot...");
  await page.screenshot({path: 'pup_test.png'});

  await browser.close();
  console.log("Done");
})();
