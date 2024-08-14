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
  if (!body || typeof body !== "string") return '';
  // Разбиваем текст на слова
  const words = body.split(/\s+/);
  
  // Фильтруем слова, исключая те, которые присутствуют в наборе keywords
  const filteredWords = words.filter(word => !KEYWORDS_TO_REMOVE.has(word));
  
  // Объединяем отфильтрованные слова обратно в строку
  return filteredWords.join(" ");
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
