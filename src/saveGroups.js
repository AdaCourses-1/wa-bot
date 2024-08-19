const fs = require("fs");

const saveCacheToFile = (data, path) => {
  fs.writeFileSync(path, JSON.stringify(data), "utf-8");
};

const loadCacheFromFile = (path) => {
  if (fs.existsSync(path)) {
    const rawData = fs.readFileSync(path, "utf-8");
    return JSON.parse(rawData);
  }
  return null;
};

module.exports = { saveCacheToFile, loadCacheFromFile };
