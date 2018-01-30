var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
const fs = require('fs');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

var bot = new Discord.Client({
    token: auth.token,
    autorun: true
});

var objectLib = getLib(['help','compliments','defaultRes',"games"])

var autoComplimentOn = true;

var timeOf = {
    startUp: new Date()
};

bot.on('ready', evt => {
    timeOf.connection = new Date();

    logger.info(`
        Connected
        Logged in as:
        ${bot.username} - (${bot.id})
    `);

    afterLogin();
});

bot.on('message', (user, userID, channelID, message, evt) => {
    if (userID == 327577082500743168 && autoComplimentOn == true) {
        let lenght = objectLib.compliments.length;

        bot.sendMessage({
            to: channelID,
            message: `<@!${userID}> ${objectLib.compliments[Math.floor(Math.random()*lenght)]}`
        });
    }

    if (message.substring(0, 21) == '<@388670149127045121>') {
        var args = message.substring(22).split(' ');
        var cmd = args[0];

        args = args.splice(1);
        switch (cmd) {
            case 'help':
                bot.sendMessage({
                    to: channelID,
                    message: 'Some commands:',
                    embed: objectLib.help
                });
                break;
            case 'ping':
                bot.sendMessage({
                    to: channelID,
                    message: 'Pong!'
                });
                break;
            case 'nerfThis':
                bot.sendMessage({
                    to: channelID,
                    message: '<@!305716128615759873> was the sole victim'
                });
                break;
            case 'echo':
                bot.sendMessage({
                    to: channelID,
                    message: args.join(' ')
                });
                break;
            case 'getGerp':
                bot.sendMessage({
                    to: channelID,
                    message: '<@!217953472715292672>'
                });
                break;
            case 'uptime':
                if (typeof timeOf[args[0]] != 'undefined') {
                    let uptime = calculateUptime(timeOf[args[0]],new Date());
                    bot.sendMessage({
                        to: channelID,
                        message: `Time since "${args[0]}":\t \`${uptime.d} day(s), ${uptime.h} hour(s), ${uptime.min} minute(s), ${uptime.s} second(s)\``
                    });
                } else {
                    bot.sendMessage({
                        to: channelID,
                        message: "Missing arguments. Usage: `@GerpBot uptime [ startUp | connection | lastCommand ]`."
                    });
                }
                break;
            case 'autoCompliment':
                switch (args[0]) {
                    case "on":
                        autoComplimentOn = true;
                        bot.sendMessage({
                            to: channelID,
                            message: "Automatic complimenting turned ON."
                        });
                        break;
                    case "off":
                        autoCompliment = false;
                        bot.sendMessage({
                            to: channelID,
                            message: "Automatic complimenting turned OFF."
                        });
                        break;
                    default:
                        bot.sendMessage({
                            to: channelID,
                            message: "Missing arguments. Usage: `@GerpBot autoCompliment [ on | off ]`."
                        });
                        break;
                }
                break;
            default:
                let lenght = objectLib.defaultRes.length;
                bot.sendMessage({
                    to: channelID,
                    message: objectLib.defaultRes[Math.floor(Math.random()*lenght)]
                });
                break;
        }
        timeOf.lastCommand = new Date();
    }
});

bot.on('disconnect', (err, code) => {
    logger.warn(`Disconnected! error: ${err}, code: ${code} (uptime: ${calculateUptime(timeOf.connection,new Date())})`)
    bot.connect();
});

function calculateUptime(start,end) {
    let uptime = {};

    uptime.ms = end - start;
    uptime.s = Math.floor(uptime.ms / 1000);
    uptime.ms -= uptime.s * 1000;
    uptime.min = Math.floor(uptime.s / 60);
    uptime.s -= uptime.min * 60;
    uptime.h = Math.floor(uptime.min / 60);
    uptime.min -= uptime.h * 60;
    uptime.d = Math.floor(uptime.h / 24);
    uptime.h -= uptime.d * 24;

    return uptime;
}

function afterLogin() {
    let lenght = objectLib.games.length;
    setInterval(() => {
        bot.setPresence({
            game: {
                name: objectLib.games[Math.floor(Math.random()*lenght)],
                type: 0
            }
        });
    }, 60000)
}

function getLib(list) {
    let tempLib = {}
    list.forEach(file => {
        if (!fs.access(`objectLib/${file}.json`, err => {if (err) logger.error(err);})) {
            fs.readFile(`objectLib/${file}.json`, 'utf-8', (err, data) => {
                if (err) logger.error(err);
                else tempLib[file] = JSON.parse(data);
            });
        }
    });
    return tempLib;
}
