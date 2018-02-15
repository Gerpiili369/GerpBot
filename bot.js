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

var online = false;
var settings = getJSON('settings');
var timeOf = {
    startUp: Date.now()
};

if (settings.servers === undefined) {
    settings.servers = {}
}

startLoops();

bot.on('ready', evt => {
    timeOf.connection = Date.now();

    logger.info(`${bot.username} (user ${bot.id}) ready for world domination!`);
    
    afterLogin();
});

bot.on('message', (user, userID, channelID, message, evt) => {
    let serverID = bot.channels[channelID].guild_id

    if (message.substring(0, 21) == `<@${bot.id}>` || message.substring(0,22) == `<@!${bot.id}>`) {
        bot.simulateTyping(channelID);

        if (message.substring(2,3) == '!') {
            var args = message.substring(23).split(' ');
        } else {
            var args = message.substring(22).split(' ');
        }
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
                        settings.servers[serverID].autoCompliment.enabled = true;
                        msg(channelID,'Automatic complimenting turned ON.');
                        break;
                    case 'off':
                        settings.servers[serverID].autoCompliment.enabled = false;
                        msg(channelID,'Automatic complimenting turned OFF.');
                        break;
                    case 'list':
                        msg(channelID,``,{
                            title: 'List of cool people:',
                            description: `${settings.servers[serverID].autoCompliment.targets.join('\n')}`
                        })
                        break;
                    case 'add':
                        if (args[1] != undefined) {
                            if (settings.servers[serverID].autoCompliment.targets.indexOf(args[1]) == -1) {
                                settings.servers[serverID].autoCompliment.targets.push(args[1]);
                                msg(channelID,`User ${args[1]} is now cool`)
                            } else {
                                msg(channelID,`User ${args[1]} is already cool!`)
                            }
                            break;
                        }
                    case 'remove':
                        if (args[1] != undefined) {
                            if (settings.servers[serverID].autoCompliment.targets.indexOf(args[1]) != -1) {
                                settings.servers[serverID].autoCompliment.targets.splice(settings.servers[serverID].
                                    utoCompliment.targets.indexOf(args[1]), 1);
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
            case 'effect':
                if (settings.servers[serverID].roleID != undefined) {
                    switch (args[0]) {
                        case 'rainbow':
                            if (settings.servers[serverID].effects.rainbow) {
                                settings.servers[serverID].effects.rainbow = false
                                msg(channelID,'Rainbow effect deactivated!')
                            } else {
                                settings.servers[serverID].effects.rainbow = true
                                msg(channelID,'Rainbow effect activated!')
                            }
                            break;
                        case 'shuffle':
                            if (settings.servers[serverID].effects.shuffle) {
                                settings.servers[serverID].effects.shuffle = false
                                msg(channelID,'Shuffle effect deactivated!')
                            } else {
                                settings.servers[serverID].effects.shuffle = true
                                msg(channelID,'Shuffle effect activated!')
                            }
                            break;
                        default:
                            msg(channelID,'Shuffle or rainbow?')
                            break;
                    }
                    updateSettings();
                } else {
                    msg(channelID,'Please create me my own role (with some permissions pls)');
                }
                break;
            default:
                msg(channelID,objectLib.defaultRes[Math.floor(Math.random()*objectLib.defaultRes.length)]);
                break;
        }
        timeOf.lastCommand = Date.now();
    } else if (settings.servers[serverID].autoCompliment.targets.indexOf(`<@!${userID}>`) != -1 && settings.servers[serverID].autoCompliment.enabled == true) {
        bot.simulateTyping(channelID);
        msg(channelID,`<@!${userID}> ${objectLib.compliments[Math.floor(Math.random()*objectLib.compliments.length)]}`);
    }

    if (userID == bot.id && typeof evt.d.embeds[0] != 'undefined') {
        if (typeof evt.d.embeds[0].footer != 'undefined' && evt.d.embeds[0].footer.text == 'Vote generated by your\'s truly') {
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
    online = false;
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
    let requests = Object.keys(bot.servers).map(server => {
        if (typeof settings.servers[server] == 'undefined') {
            settings.servers[server] = {
                autoCompliment: {
                    enabled: true,
                    targets: []
                },
                effects: {
                    rainbow: false,
                    shuffle: false
                },
                roleID: undefined
            }
        }

        bot.servers[server].members[bot.id].roles.forEach(role => {
            role = bot.servers[server].roles[role]
            if (role.name === bot.username) {
                settings.servers[server].roleID = role.id
            }
        });

        return new Promise(resolve => {
            resolve();
        });
    });

    Promise.all(requests).then(() => {
        online = true;
        updateSettings();
    });
}

function startLoops() {
    setInterval(() => {
        bot.setPresence({
            game: {
                name: objectLib.games[Math.floor(Math.random()*objectLib.games.length)],
                type: 0
            }
        });
    }, 60000)

    let colors = ['#ff0000','#ff6a00','#ffff00','#00ff00','#0000ff','#ff00ff'];
    let i = 0;
    setInterval(() => {
        if (online) {
            if (i >= colors.length) i = 0;
            let newName = bot.username.split('');
            newName.forEach(l => {
                random = Math.floor(Math.random()*newName.length);
                let help = newName[random];
                newName[random] = l;
                newName[newName.indexOf(l)] = help;
            });

            for (server in settings.servers) {
                if (typeof bot.servers[server] != 'undefined') {
                    if (settings.servers[server].effects.rainbow) {
                        editColor(server,colors[i]);
                    } else if (typeof settings.servers[server].roleID != 'undefined' && bot.servers[server].roles[settings.servers[server].roleID].color != 16738816) editColor(server,'#ff6a00');

                    if (settings.servers[server].effects.shuffle) {
                        editNick(server,newName.join(''));
                    } else if (typeof bot.servers[server].members[bot.id].nick != 'undefined' && bot.servers[server].members[bot.id].nick != null) editNick(server,bot.username);
                }
            }
            i++;
        }
    },2000);

    function editColor (server,color) {
        bot.editRole({
            serverID: server,
            roleID: settings.servers[server].roleID,
            color: color
        }, err => {if (err) logger.error(err,'');});
    }

    function editNick (server,newName) {
        bot.editNickname({
            serverID: server,
            userID: bot.id,
            nick: newName
        }, err => {if (err) logger.error(err,'');})
    }
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
    if (JSON.stringify(settings) != '') fs.writeFile('settings.json', JSON.stringify(settings), err => {if (err) logger.error(err)});
}
