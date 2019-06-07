const
    fs = require('fs'),
    path = require('path'),
    Ile = require('./ile.js'),
    common = require('./common'),
    settingsPath = path.join(__dirname, '..', 'settings.json'),
    objectLibPath = path.join(__dirname, '..', 'objectLib'),
    ilePath = path.join(__dirname, '..', 'ile.json');

async function initialize() {
    await initializeSettings();
    common.objectLib = await loadObjectLib();
    common.ile = new Ile(await common.loadJSON(ilePath) || {}, common.objectLib.ileAcronym);
}

async function initializeSettings() {
    common.settings = await common.loadJSON(settingsPath);

    if (!common.settings.servers) common.settings.servers = {};
    if (!common.settings.tz) common.settings.tz = {};
    if (!common.settings.reminders) common.settings.reminders = {};

    common.settings.update = retry => {
        if (!common.config.saveSettings) return;
        const json = JSON.stringify(common.settings, (key, value) => {
            switch (key) {
                case 'timeout':
                    return null;
                case 'bot':
                    return null;
                default:
                    return value;
            }
        }, 4);
        if (json) fs.writeFile('settings.json', json, err => {
            if (err) common.logger.error(err, { label: 'fs/settings' });
            else fs.readFile('settings.json', 'utf8', (err, data) => {
                if (err) common.logger.error(err, { label: 'fs/settings' });
                try {
                    JSON.parse(data);
                    if (retry) common.logger.info('setting.json is no longer corrupted.', { label: 'fs/settings' });
                }
                catch (error) {
                    common.logger.warn('setting.json was corrupted during update, retrying in 5 seconds.', { label: 'fs/settings' });
                    setTimeout(common.settings.update, 5000, true);
                }
            });
        });
    };
}

function loadObjectLib() {
    // Load objectLib
    return new Promise((resolve, reject) => fs.readdir(objectLibPath, (err, files) => {
        if (err) reject(err);
        else Promise.all(files.map(value => common.loadJSON(path.join(objectLibPath, value))))
            .then(dataList => {
                const objectLib = {};
                files.forEach((value, i) => (objectLib[value.substring(0, value.indexOf('.json'))] = dataList[i]));
                resolve(objectLib);
            })
            .catch(reject);
    }));
}

module.exports = initialize;
