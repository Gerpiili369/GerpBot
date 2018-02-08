const Discord = require('discord.io');
const logger = require('winston');
const auth = require('./auth.json');
const fs = require('fs');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

const objectLib = getJSON(['help','compliments','defaultRes','games'],'objectLib/')
const bot = new Discord.Client({
    token: auth.token,
    autorun: true
});

var settings = getJSON('settings');
var timeOf = {
    startUp: Date.now()
};

bot.on('ready', evt => {
    timeOf.connection = Date.now();

    logger.info(`${bot.username} (user ${bot.id}) ready for world domination!`);
    
    afterLogin();
});

bot.on('message', (user, userID, channelID, message, evt) => {
    if (settings.autoCompliment.targets.indexOf(`<@!${userID}>`) != -1 && settings.autoCompliment.enabled == true) {
        bot.simulateTyping(channelID);
        msg(channelID,`<@!${userID}> ${objectLib.compliments[Math.floor(Math.random()*objectLib.compliments.length)]}`);
    }

    if (message.substring(0, 21) == '<@388670149127045121>') {
        bot.simulateTyping(channelID);

        var args = message.substring(22).split(' ');
        var cmd = args[0];

        args = args.splice(1);
        switch (cmd) {
            case 'help':
                msg(channelID,'Some commands:',objectLib.help);
                break;
            case 'ping':
                msg(channelID,'Pong!');
                break;
            case 'nerfThis':
                msg(channelID,'<@!305716128615759873> was the sole victim');
                break;
            case 'echo':
                msg(channelID,args.join(' '));
                break;
            case 'getGerp':
                msg(channelID,'<@!217953472715292672>');
                break;
            case 'uptime':
                if (typeof timeOf[args[0]] != 'undefined') {
                    let uptime = calculateUptime(timeOf[args[0]],Date.now());
                    msg(channelID,`Time since '${args[0]}':\t \`${uptime.d} day(s), ${uptime.h} hour(s), ${uptime.min} minute(s), ${uptime.s} second(s)\``);
                } else {
                    msg(channelID,'Missing arguments. Usage: `@GerpBot uptime [ startUp | connection | lastCommand ]`.');
                }
                break;
            case 'vote':
                let options = [];
                let ve = {
                    color: 16738816,
                    footer: { text: 'Vote generated by your\'s truly' },
                    fields: [],
                    error: false
                };

                if (args[0] == 'def') {
                    ve.description = '**Let\'s do a vote!**';
                    options = args.splice(1);
                } else if (args[0] == 'gold') {
                    ve.description = `**Let's vote for ${args[1]}'s next golden gun!**`;
                    options = args.splice(2);
                } else {
                    msg(channelID,`${args[0]} not allowed. Use 'def' or 'gold'`);
                    break;
                }

                ve.description += `\n*requested by:\n<@${userID}>*`

                if (options.length < 1) {
                    msg(channelID,'Options were not included! Example: `@GerpBot vote def :thinking:=genius`');
                    break;
                }
                options.forEach(e => {
                    let p = e.split('=');

                    if (p[0] != '') {
                        if (p[1] != undefined) {
                            ve.fields.push({
                                name: `Vote for ${p[1]} with:`,
                                value: `${p[0]}`
                            });
                        } else {
                            ve.fields.push({
                                name: `Vote with:`,
                                value: `${p[0]}`
                            });
                        }
                    } else {
                        msg(channelID,'Some options not defined! Example: `@GerpBot vote def :thinking:=genius`');
                        ve.error = true;
                    }
                });

                if (!ve.error) {
                    msg(channelID,'@everyone',ve);
                }
                break;
            case 'autoCompliment':
                switch (args[0]) {
                    case 'sample':
                        msg(channelID,`<@!${userID}> ${objectLib.compliments[Math.floor(Math.random()*objectLib.compliments.length)]}`);
                        break;
                    case 'on':
                        settings.autoCompliment.enabled = true;
                        msg(channelID,'Automatic complimenting turned ON.');
                        break;
                    case 'off':
                        settings.autoCompliment.enabled = false;
                        msg(channelID,'Automatic complimenting turned OFF.');
                        break;
                    case 'list':
                        msg(channelID,`List of cool people: ${settings.autoCompliment.targets.join(', ')}`)
                        break;
                    case 'add':
                        if (args[1] != undefined) {
                            if (settings.autoCompliment.targets.indexOf(args[1]) == -1) {
                                settings.autoCompliment.targets.push(args[1]);
                                msg(channelID,`User ${args[1]} is now cool`)
                            } else {
                                msg(channelID,`User ${args[1]} is already cool!`)
                            }
                            break;
                        }
                    case 'remove':
                        if (args[1] != undefined) {
                            if (settings.autoCompliment.targets.indexOf(args[1]) != -1) {
                                settings.autoCompliment.targets.splice(settings.autoCompliment.targets.indexOf(args[1]), 1);
                                msg(channelID,`User ${args[1]} ain't cool no more!`)
                            } else {
                                msg(channelID,`User ${args[1]} was never cool to begin with!`)
                            }
                            break;
                        }
                    default:
                        msg(channelID,'Missing arguments. Usage: `@GerpBot autoCompliment < sample | on | off | add | remove | list > [ @mention ]`.');
                        break;
                }
                updateSettings();
                break;
            default:
                msg(channelID,objectLib.defaultRes[Math.floor(Math.random()*objectLib.defaultRes.length)]);
                break;
        }
        timeOf.lastCommand = Date.now();
    }

    if (userID == bot.id && typeof evt.d.embeds[0] != 'undefined') {
        if (evt.d.embeds[0].footer.text == 'Vote generated by your\'s truly') {
            evt.d.embeds[0].fields.forEach(e => {
                if (e.value.substring(e.value.length-1) == '>') e.value = e.value.substring(0,e.value.length-1)

                setTimeout(() => {
                    bot.addReaction({
                        channelID: channelID,
                        messageID: evt.d.id,
                        reaction: e.value
                    }, (err, res) => {
                        // if (err) console.log(err);
                    });
                },evt.d.embeds[0].fields.indexOf(e)*500);
            });

            bot.pinMessage({
                channelID: channelID,
                messageID: evt.d.id
            });
        }
    }
});

bot.on('disconnect', (err, code) => {
    logger.warn(`Disconnected! error: ${err}, code: ${code} (uptime: ${calculateUptime(timeOf.connection,Date.now())})`)
    bot.connect();
});

function msg(channel,msg,embed) {
    bot.sendMessage({
        to: channel,
        message: msg,
        embed: embed
    });
}

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
    setInterval(() => {
        bot.setPresence({
            game: {
                name: objectLib.games[Math.floor(Math.random()*objectLib.games.length)],
                type: 0
            }
        });
    }, 60000)
}

function getJSON(file,location = '') {
    let tempObj = {}

    switch (typeof file) {
        case 'object':
            file.forEach(file => {
                if (fs.existsSync(`${location}${file}.json`)) {
                    tempObj[file] = JSON.parse(fs.readFileSync(`${location}${file}.json`, 'utf-8', err => {if (err) logger.error(err);}));
                }
            });
            break;
        case 'string':
            if (fs.existsSync(`${location}${file}.json`)) {
                return JSON.parse(fs.readFileSync(`${location}${file}.json`, 'utf-8', err => {if (err) logger.error(err);}));
            }
            break;
        default:
    }
    return tempObj;
}

function updateSettings() {
    fs.writeFile('settings.json', JSON.stringify(settings), err => {if (err) console.log(err)});
}
