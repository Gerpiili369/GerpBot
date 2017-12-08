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

var objectLib = {};
getObjectFromJSON('help')

bot.on('ready', evt => {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', (user, userID, channelID, message, evt) => {
    if (message.substring(0, 3) == 'gb!') {
        var args = message.substring(4).split(' ');
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
                    message: 'Leenakop died'
                });
                break;
            case 'echo':
                bot.sendMessage({
                    to: channelID,
                    message: args
                });
                break;
            case 'getGerp':
                bot.sendMessage({
                    to: channelID,
                    message: '<@!217953472715292672>'
                });
                break;
        }
    }
});

function getObjectFromJSON (file) {
    if (!fs.access('objectLib/' + file + '.json', err => {return err})) {
        fs.readFile('objectLib/' + file + '.json', 'utf-8', (err, data) => {
            objectLib[file] = JSON.parse(data)
        });
    }
}
