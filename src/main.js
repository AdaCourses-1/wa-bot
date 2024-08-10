const qrcode = require("qrcode-terminal");
const { onMessageCreated } = require("./controller");
const { CLIENT_EVENTS, DB_PATHS } = require("./const");
const { CLIENT } = require("./config");
const { saveCacheToFile } = require("./saveGroups");

const listGroups = async () => {
  try {
    const chats = await CLIENT.getChats();
    const groups = chats.filter((chat) => chat.isGroup);

    if (groups.length === 0) {
      console.log("Бот не добавлен ни в одну группу.");
    } else {
      const mappedGroups = groups
        .filter((group) => group.isGroup)
        .map((gp) => ({
          name: gp.name,
          userId: gp.id.user,
          id: gp.id._serialized,
          createdAt: new Date(gp.timestamp * 1000),
          type: null,
        }));

      saveCacheToFile(mappedGroups, DB_PATHS.GROUPS);
    }
  } catch (err) {
    console.error("Ошибка при получении списка групп:", err);
  }
};

// When the CLIENT is ready, run this code (only once)
CLIENT.once(CLIENT_EVENTS.READY, () => {
  listGroups();
  console.log("CLIENT is ready!");
});

// When the CLIENT received QR-Code
CLIENT.on(CLIENT_EVENTS.QR, (qr) => {
  qrcode.generate(qr, { small: true });

  console.log("QR RECEIVED", qr);
});

CLIENT.on(CLIENT_EVENTS.MESSAGE_CREATE, (msg) => {
  setTimeout(() => onMessageCreated(msg), 20000);
});

CLIENT.on(CLIENT_EVENTS.AUTH_FAILURE, () => {
  console.error("Ошибка авторизации!");
});

// Start your CLIENT
CLIENT.initialize();
