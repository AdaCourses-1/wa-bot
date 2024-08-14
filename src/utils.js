const { DB_PATHS, BOT_SETTINGS_GROUP, KEYWORDS_TO_REMOVE } = require("./const");
const { loadCacheFromFile } = require("./saveGroups");

const destChats = loadCacheFromFile(DB_PATHS.BOT_SETTINGS)?.dest_chats || [];
const sourceChats =
  loadCacheFromFile(DB_PATHS.BOT_SETTINGS)?.source_chats || [];

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
  let sanitizedBody = body.toLowerCase();

  keywords.forEach((keyword) => {
    // Экранируем специальные символы в ключевых словах
    const escapedKeyword = keyword
      .toLowerCase()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedKeyword, "gi");
    sanitizedBody = sanitizedBody.replace(regex, "").trim();
  });

  // Убираем лишние пробелы и знаки препинания
  sanitizedBody = sanitizedBody.replace(/[\s,;]+/g, " ").trim();

  return sanitizedBody;
};

module.exports = {
  destChats,
  sourceChats,
  generateUniqueId,
  fileSizeInMb,
  isVideoOrImage,
  shouldBlockThread,
  sanitizeMessage,
};
