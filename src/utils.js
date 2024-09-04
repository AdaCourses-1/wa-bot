const {
  DB_PATHS,
  BOT_SETTINGS_GROUP,
  KEYWORDS_TO_REMOVE,
  LINKS_TO_REMOVE,
} = require("./const");
const { loadCacheFromFile } = require("./saveGroups");

const destChats = loadCacheFromFile(DB_PATHS.BOT_SETTINGS)?.dest_chats || [];
const sourceChats =
  loadCacheFromFile(DB_PATHS.BOT_SETTINGS)?.source_chats || [];

const exactPaths = loadCacheFromFile(DB_PATHS.BOT_SETTINGS)?.exact_paths;

const generateUniqueId = () => Date.now() + Math.floor(Math.random() * 1000);

const fileSizeInMb = (fileSize) => fileSize / 1024 / 1024 || 0;

const isVideoOrImage = (mediaType) =>
  mediaType?.startsWith("image/") || mediaType?.startsWith("video/");

const shouldBlockThread = (chatId) =>
  !(
    (!destChats.includes(chatId) && sourceChats.includes(chatId)) ||
    BOT_SETTINGS_GROUP.ID === chatId
  );

const sanitizeMessage = (body) => {
  let sanitizedBody = body;

  KEYWORDS_TO_REMOVE.forEach((keyword) => {
    // Экранируем специальные символы в ключевых словах
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Создаем регулярное выражение для поиска ключевого слова с учетом пробелов или знаков препинания
    const regex = new RegExp(`(^|\\s|\\b)${escapedKeyword}(\\b|\\s|$)`, "gi");

    // Заменяем ключевое слово на пустую строку
    sanitizedBody = sanitizedBody.replace(regex, " ").trim();
  });

  // Убираем лишние пробелы
  // sanitizedBody = sanitizedBody.replace(/\s+/g, " ").trim();

  return sanitizedBody ? sanitizedBody : "Новое поступление!";
};

const removeLinksFromText = (body) => {
  let formattedBody = body;

  LINKS_TO_REMOVE.forEach((link) => {
    const regex = new RegExp(`${link}\\S*`, "gi");
    formattedBody = formattedBody.replace(regex, "").trim();
  });

  // Убираем лишние пробелы, которые могли остаться после удаления ссылок
  // formattedBody = formattedBody.replace(/\s{2,}/g, " ").trim();

  return formattedBody;
};

const getFormattedDate = () => {
  const now = new Date();

  // Добавляем 6 часов к времени сервера, чтобы получить время по Кыргызстану
  now.setHours(now.getUTCHours() + 6);

  const seconds = String(now.getSeconds()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');

  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Месяцы в JS считаются с 0
  const year = now.getFullYear();

  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

module.exports = {
  destChats,
  sourceChats,
  generateUniqueId,
  fileSizeInMb,
  isVideoOrImage,
  shouldBlockThread,
  sanitizeMessage,
  removeLinksFromText,
  exactPaths,
  getFormattedDate
};
