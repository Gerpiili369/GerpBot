/* eslint-disable no-process-env */
module.exports = {
    "saveSettings": process.env.SAVESETTINGS,
    "canvasEnabled": process.env.CANVASENABLED,
    "auth": {
        "token": process.env.TOKEN,
        "tubeKey": process.env.TUBEKEY,
        "psn": process.env.PSN,
        "osu": process.env.OSU
    },
    "web": {
        "root": process.env.ROOT || '/discord',
        "host": process.env.HOST || "127.0.0.1",
        "port": process.env.PORT || 3000,
        "url": process.env.PORT || "http://localhost:3000/discord"
    },
    "test": {
        "token": process.env.TEST_TOKEN,
        "botID": process.env.TEST_BOTID,
        "serverID": process.env.SERVERID
    }
};
