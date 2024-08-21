const { Client, LocalAuth } = require("whatsapp-web.js");
const puppeteer = require("puppeteer");

const CLIENT = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: [
       "--no-sandbox", // Запуск без песочницы (ускоряет запуск, но снижает безопасность)
       "--disable-setuid-sandbox", // Отключение песочницы setuid (нужно вместе с no-sandbox)
       "--disable-dev-shm-usage", // Использовать /tmp вместо /dev/shm (уменьшает использование памяти)
      //  "--disable-gpu", // Отключение использования GPU (может снизить потребление ресурсов)
       "--disable-infobars", // Отключение информационных панелей Chrome
       "--window-size=1280,1024", // Установка размера окна (помогает снизить использование ресурсов)
       "--no-zygote", // Отключает зиготу, уменьшает использование ресурсов
      //  "--single-process", // Запуск в одном процессе (может улучшить производительность)
      //  "--headless=new", // Использовать новый headless режим для лучшей производительности
      //  "--disable-software-rasterizer", // Отключение программного растрирования (уменьшает использование ресурсов)
       "--mute-audio", // Отключение аудио (если не нужно)
       "--ignore-certificate-errors", // Игнорирование ошибок сертификатов (если работа идет с нестандартными сертификатами)
       "--proxy-server='direct://'", // Отключение использования прокси (если не требуется)
       "--proxy-bypass-list=*", // Отключение прокси для всех адресов
       "--incognito", // Запуск в режиме инкогнито (уменьшает сохранение данных)
       "--disable-extensions", // Отключение всех расширений
       "--disable-background-networking", // Отключение фона работы сети
       "--disable-default-apps", // Отключение стандартных приложений
       "--disable-sync", // Отключение синхронизации (если не требуется)
       "--disable-translate", // Отключение функции перевода
    ],
    executablePath: puppeteer.executablePath(),
    // headless: true,
  }
});

module.exports = {
  CLIENT,
};
