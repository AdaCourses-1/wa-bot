const TelegramBot = require("node-telegram-bot-api");
const path = require("path");
const qrcode = require("qrcode");

const TELEGRAM_BOT_TOKEN = `7146727173:AAHTa_ZkUtBbMBYdEItPF3ZH8nsukUtpZEs`;
const CHAT_ID = "-4557233673";

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

const sendQr = async (qr) => {
  try {
    const qrCodeFilePath = path.join(__dirname, "qrcode.png");

    // Генерация изображения QR-кода и сохранение его на диск
    await qrcode.toFile(qrCodeFilePath, qr);

    // Отправка изображения QR-кода в Telegram
    await bot.sendPhoto(CHAT_ID, qrCodeFilePath, {
      caption: `Ваше соединение с Ботом WhatsApp для работы на рынке Дордой истекла \n\nСканируйте этот QR-код для авторизации и восстановления работы бота\n\nУ вас имеется 20секунд`,
    });
    console.log("QR-код отправлен в Telegram!");
  } catch (error) {
    console.error("Ошибка при отправке QR-кода:", error);
    await bot.sendMessage(
      CHAT_ID,
      `Требуется вмешательство специалиста\n\nНе получилось отправить QR-CODE по причине: ${error.essage}`
    );
  }
};

const whatsAppBotReady = async () => {
  try {
    await bot.sendMessage(
      CHAT_ID,
      `Соединение с WhatsApp ботом восстановлено!\n\nВ скором времени бот продолжит свою работу!`
    );
  } catch (err) {
    await bot.sendMessage(
      CHAT_ID,
      `Соединение с ботом WhatsApp временно потеряно, пытаюсь восстановить...`
    );
  }
};

const whatsAppBotLostConnection = async () => {
  try {
    await bot.sendMessage(
      CHAT_ID,
      `Соединение с ботом WhatsApp временно потеряно, пытаюсь восстановить...`
    );
  } catch (err) {
    await bot.sendMessage(
      CHAT_ID,
      `Не удается восстановить соединение с WhatsApp ботом, требуется вмешательство специалиста, код ошибки: ${err.message}`
    );
  }
};

module.exports = {
  sendQr,
  whatsAppBotReady,
  whatsAppBotLostConnection,
};
