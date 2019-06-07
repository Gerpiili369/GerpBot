const
    fs = require('fs'),
    path = require('path'),
    Ile = require('./ile.js'),
    common = require('./common');

async function initialize() {
    await initializeSettings();
    await initializeObjectLib();

    common.ile = new Ile(await common.getJSON('ile'), common.objectLib.ileAcronym);
}

async function initializeSettings() {
    common.settings = await common.getJSON('settings');

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

async function initializeObjectLib() {
    // Load objectLib
    common.objectLib = await common.getJSON([
        'help',
        'compliments',
        'defaultRes',
        'games',
        'answers',
        'ileAcronym'
    ], path.join('..', 'objectLib'));
}

module.exports = initialize;
