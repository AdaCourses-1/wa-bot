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

  let sanitizedBody = body.toLowerCase();

  KEYWORDS_TO_REMOVE.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, "gi");
    sanitizedBody = sanitizedBody.replace(regex, "");
  });

  console.log('unsanitizedBody:', body)

  // Удаляем лишние пробелы, если нужно
  sanitizedBody = sanitizedBody.replace(/\s{2,}/g, " ").trim();

  console.log('sanitizedBody:', sanitizedBody)

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
