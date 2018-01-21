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

var objectLib = getLib(['help','compliments'])

var autoComplimentOn = true;

bot.on('ready', evt => {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');

    afterLogin();
});

bot.on('message', (user, userID, channelID, message, evt) => {
    if (userID == 327577082500743168 && autoComplimentOn == true) {
        let lenght = objectLib.compliments.length;

        bot.sendMessage({
            to: channelID,
            message: `<@!${userID}> ` + objectLib.compliments[Math.floor(Math.random()*lenght)]
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
                        message: "Missing arguments. Usage: `gb! autoCompliment <on || off> `."
                    });
                }
                break;
        }
    }
});

function afterLogin() {
    bot.setPresence({
        game: {
            name: 'gb! help',
            type: 0
        }
    });
}

function getLib(list) {
    let tempLib = {}
    list.forEach(p => {
        getObjectFromJSON(p,tempLib);
    });
    return tempLib;
}

function getObjectFromJSON (file,tempLib) {
    if (!fs.access('objectLib/' + file + '.json', err => {if (err) logger.error(err);})) {
        fs.readFile('objectLib/' + file + '.json', 'utf-8', (err, data) => {
            if (err) logger.error(err);
            else tempLib[file] = JSON.parse(data);
        });
    }
}
