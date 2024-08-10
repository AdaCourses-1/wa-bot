const { Client, LocalAuth } = require("whatsapp-web.js");
const puppeteer = require("puppeteer");

const CLIENT = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: puppeteer.executablePath(),
  },
});

module.exports = {
  CLIENT,
};
