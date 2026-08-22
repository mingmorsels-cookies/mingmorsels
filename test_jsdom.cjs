const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('dist/chatbot.html', 'utf-8');
const scriptCode = fs.readFileSync('dist/chatbot-script.js', 'utf-8');

const dom = new JSDOM(html, { runScripts: "outside-only" });
try {
    dom.window.eval(scriptCode);
    console.log("Is setTheme defined?", typeof dom.window.setTheme);
    console.log("Is buildOffscreenCard defined?", typeof dom.window.buildOffscreenCard);
} catch (e) {
    console.error("Error executing script:", e);
}
