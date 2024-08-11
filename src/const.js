const CLIENT_EVENTS = {
  MESSAGE_CREATE: "message_create",
  AUTH_FAILURE: "auth_failure",
  QR: "qr",
  READY: "ready",
};

const DB_PATHS = {
  GROUPS: "./db/groups.json",
  BOT_SETTINGS: "./db/bot_settings.json",
};

// ID тестовой группы куда скидываются товары

const BOT_SETTINGS_GROUP = {
  NAME: "Настройки Бота",
  ID: "120363321873527844@g.us",
  USER_ID: "120363321873527844",
};
const COMMANDS = {
  GET_CHATS: "Получить чаты",
  ADD_DEST_TYPE: "Куда скидывать",
  ADD_SOURCE_TYPE: "Откуда брать",
  DELETE_TYPE: "Удалить группу из системы бота",
  CLEAR_CHATS: "Удалить все чаты",
  LOG_OUT: "Выйти со всех чатов",
};

module.exports = {
  CLIENT_EVENTS,
  BOT_SETTINGS_GROUP,
  COMMANDS,
  DB_PATHS,
};
