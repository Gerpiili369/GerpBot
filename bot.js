const Discord = require('discord.io');
const logger = require('winston');
const auth = require('./auth.json');
const fs = require('fs');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true,
    timestamp: true
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

    if ((message.substring(0, 21) == `<@${bot.id}>` || message.substring(0,22) == `<@!${bot.id}>`) && userID != bot.id) {
        bot.simulateTyping(channelID, err => {if (err) logger.error(err,'');});

        let admin = false;
        if (userID == bot.servers[serverID].owner_id) admin = true;
        else bot.servers[serverID].members[userID].roles.forEach(v => {
            if (bot.servers[serverID].roles[v]._permissions.toString(2).split('').reverse()[3] == 1) admin = true;
        });

        if (message.substring(2,3) == '!') {
            var args = message.substring(23).split(' ');
        } else {
            var args = message.substring(22).split(' ');
        }
        var cmd = args[0];
        args = args.splice(1);

        switch (cmd) {
            case 'help':
                let help = objectLib.help;
                help.color = bot.servers[serverID].members[userID].color;
                msg(channelID,'Some commands:',help);
                break;
            case 'server':
                let si = {
                    members: {
                        online: 0,
                        idle: 0,
                        dnd: 0,
                        offline: 0,
                        bots: 0
                    },
                    channels: {
                        0: 0,
                        2: 0,
                        4: 0
                    },
                    age: calculateUptime(sfToDate(serverID),new Date())
                }

                for (member in bot.servers[serverID].members) {
                    if (!bot.users[member].bot) {
                        let status = bot.servers[serverID].members[member].status;
                        if (!status) status = 'offline'
                        si.members[status]++
                    } else si.members.bots++
                }

                for (channel in bot.servers[serverID].channels) {
                    let type = bot.servers[serverID].channels[channel].type;
                    if (type == 0 || type == 2 || type == 4)
                    si.channels[type]++;
                }

                let ie = {
                    title: `Information about "${bot.servers[serverID].name}"`,
                    description: `**Created by:** <@!${bot.servers[serverID].owner_id}>
**Creation date:** \`${sfToDate(serverID)}\`
**Age:** \`${
    (si.age.y > 0) ? `${si.age.y} year(s), ` : ''
}${
    (si.age.d > 0) ? `${si.age.d} day(s), ` : ''
}${
    (si.age.h > 0) ? `${si.age.h} hour(s), ` : ''
}${
    si.age.min
} min(s)\``,
                    color: bot.servers[serverID].members[userID].color,
                    timestamp: bot.servers[serverID].joined_at,
                    footer: {
                        icon_url: `https://cdn.discordapp.com/avatars/${bot.id}/${bot.users[bot.id].avatar}.png`,
                        text: `${settings.servers[serverID].nick} joined this server on`
                    },
                    thumbnail: {
                        url: `https://cdn.discordapp.com/icons/${serverID}/${bot.servers[serverID].icon}.png`
                    },
                    fields: [
                        {
                            name: 'Members:',
                            value: `✅ Online: ${si.members.online}\n💤 Idle: ${si.members.idle}\n⛔ Do not disturb: ${si.members.dnd}\n⚫ Offline: ${si.members.offline}`
                        },
                        {
                            name: 'Channels:',
                            value: `💬 Text: ${si.channels[0]}\n🎙️ Voice: ${si.channels[2]}\n📁 Category: ${si.channels[4]}`
                        },
                        {
                            name: 'More stuff:',
                            value: `Roles: ${Object.keys(bot.servers[serverID].roles).length}, Emojis: ${Object.keys(bot.servers[serverID].emojis).length}/50, Bots: ${si.members.bots}`
                        }
                    ]
                }

                msg(channelID,'Here you go:',ie);
                break;
            case 'user':
                if (args[0]) {
                    if (args[0].substring(2,3) == '!') {
                        args[0] = args[0].substring(3,21);
                    } else {
                        args[0] = args[0].substring(2,20);
                    }
                    let ui = {
                        id: args[0],
                        roles: [],
                        age: calculateUptime(sfToDate(args[0]),new Date())
                    }

                    Object.keys(bot.servers[serverID].roles).forEach(e => {
                        if (bot.servers[serverID].members[ui.id].roles.indexOf(e) != -1)
                        ui.roles[bot.servers[serverID].roles[e].position] = '<@&'+e+'>'
                    });

                    let cleanRoll = [];
                    ui.roles.forEach(e => {if (e) cleanRoll.push(e)});
                    ui.roles = cleanRoll.reverse();

                    let ue = {
                        title: `Information about "${bot.users[ui.id].username}#${bot.users[ui.id].discriminator}"`,
                        description: `**Also known as:** "<@!${ui.id}>"
**User created:** \`${sfToDate(ui.id)}\`
**Age:** \`${
    (ui.age.y > 0) ? `${ui.age.y} year(s), ` : ''
}${
    (ui.age.d > 0) ? `${ui.age.d} day(s), ` : ''
}${
    (ui.age.h > 0) ? `${ui.age.h} hour(s), ` : ''
}${
    ui.age.min
} min(s)\``,
                        color: bot.servers[serverID].members[ui.id].color,
                        timestamp: new Date(bot.servers[serverID].members[ui.id].joined_at),
                        footer: {
                            icon_url: `https://cdn.discordapp.com/icons/${serverID}/${bot.servers[serverID].icon}.png`,
                            text: `${bot.users[ui.id].username} joined this server on`
                        },
                        thumbnail: {
                            url: `https://cdn.discordapp.com/avatars/${ui.id}/${bot.users[ui.id].avatar}.png`
                        }
                    }

                    let status = '';
                    switch (bot.servers[serverID].members[ui.id].status) {
                        case 'online':
                            status = '✅ Online'
                            break;
                        case 'idle':
                            status = '💤 Idle'
                            break;
                        case 'dnd':
                            status = '⛔ Do not disturb'
                            break;
                        default:
                            status = '⚫ Offline'
                            break;
                    }
                    ue.description += `\n**Status:** ${status}`

                    if (ui.roles.length > 0) ue.description +='\n**Roles:** '
                    ui.roles.forEach(e => {
                        ue.description += ` ${e}`
                    });

                    msg(channelID,'High quality spying:',ue);
                } else msg(channelID,'I would give you the info you seek, but it is clear you don\'t even know what you want')
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
                    msg(channelID,`Time since '${args[0]}':
\`${
    (uptime.y > 0) ? `${uptime.y} year(s), ` : ''
}${
    (uptime.d > 0) ? `${uptime.d} day(s), ` : ''
}${
    (uptime.h > 0) ? `${uptime.h} hour(s), ` : ''
}${
    (uptime.min > 0) ? `${uptime.min} minute(s), ` : ''
}${
    uptime.s
} second(s)\``);
                } else {
                    msg(channelID,'Missing arguments. Usage: `@GerpBot uptime [ startUp | connection | lastCommand ]`.');
                }
                break;
            case 'vote':
                let options = [];
                let ve = {
                    color: bot.servers[serverID].members[userID].color,
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
                        if (admin) {
                            settings.servers[serverID].autoCompliment.enabled = true;
                            msg(channelID,'Automatic complimenting turned ON.');
                        } else msg(channelID,'Request denied! Not admin');
                        break;
                    case 'off':
                        if (admin) {
                            settings.servers[serverID].autoCompliment.enabled = false;
                            msg(channelID,'Automatic complimenting turned OFF.');
                        } else msg(channelID,'Request denied! Not admin');
                        break;
                    case 'list':
                        msg(channelID,``,{
                            title: 'List of cool people:',
                            description: `${settings.servers[serverID].autoCompliment.targets.join('\n')}`
                        })
                        break;
                    case 'add':
                        if (args[1] != undefined) {
                            if (admin) {
                                if (settings.servers[serverID].autoCompliment.targets.indexOf(args[1]) == -1) {
                                    settings.servers[serverID].autoCompliment.targets.push(args[1]);
                                    msg(channelID,`User ${args[1]} is now cool`)
                                } else {
                                    msg(channelID,`User ${args[1]} is already cool!`)
                                }
                            } else {msg(channelID,'Request denied! Not admin');}
                            break;
                        }
                    case 'remove':
                        if (args[1] != undefined) {
                            if (admin) {
                                if (settings.servers[serverID].autoCompliment.targets.indexOf(args[1]) != -1) {
                                    settings.servers[serverID].autoCompliment.targets.splice(settings.servers[serverID].
                                    utoCompliment.targets.indexOf(args[1]), 1);
                                    msg(channelID,`User ${args[1]} ain't cool no more!`)
                                } else {
                                    msg(channelID,`User ${args[1]} was never cool to begin with!`)
                                }
                            } else {msg(channelID,'Request denied! Not admin');}
                            break;
                        }
                    default:
                        msg(channelID,'Missing arguments. Usage: `@GerpBot autoCompliment < sample | on | off | add | remove | list > [ @mention ]`.');
                        break;
                }
                updateSettings();
                break;
            case 'shit':
                if (admin) {
                    switch (args[0]) {
                        case 'set':
                            if (args[1] != undefined && args[1].length === 22) {
                                args[1] = args[1].substring(3,21);
                                settings.servers[serverID].autoShit = args[1];
                                msg(channelID,`<@&${args[1]}> has been chosen to be shit`);

                            } else {
                                msg(channelID,`*Set hit the fan*`);
                            }
                            break;
                        case 'clean':
                            settings.servers[serverID].autoShit = null;
                            msg(channelID,`Shit has been cleaned up...`);
                            break;
                        default:
                            msg(channelID,'Missing arguments. Usage: `@GerpBot autoShit < set [ @role ] | clean >`.');
                            break;
                    updateSettings();}
                } else msg(channelID,'Request denied! Not admin');
                break;
            case 'effect':
                if (admin) {
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
                } else msg(channelID,'Request denied! Not admin');
                break;
            case 'handle':
                if (admin) {
                    if (args[0]) {
                        msg(channelID,`I will now be known as "${args[0]}"`);
                        settings.servers[serverID].nick = args[0];
                        editNick(serverID,args[0]);
                    } else msg(channelID,'Argument required!')
                } else msg(channelID,'Request denied! Not admin');
                break;
            default:
                msg(channelID,objectLib.defaultRes[Math.floor(Math.random()*objectLib.defaultRes.length)]);
                break;
        }
        timeOf.lastCommand = Date.now();
    } else if (settings.servers[serverID].autoCompliment.targets.indexOf(`<@!${userID}>`) != -1 && settings.servers[serverID].autoCompliment.enabled == true) {
        bot.simulateTyping(channelID, err => {if (err) logger.error(err,'');});
        msg(channelID,`<@!${userID}> ${objectLib.compliments[Math.floor(Math.random()*objectLib.compliments.length)]}`);
    }

    if (typeof settings.servers[serverID].autoShit == 'string' && bot.servers[serverID].members[userID].roles.indexOf(settings.servers[serverID].autoShit) != -1) emojiResponse('💩');

    if (userID == bot.id && typeof evt.d.embeds[0] != 'undefined') {
        if (typeof evt.d.embeds[0].footer != 'undefined' && evt.d.embeds[0].footer.text == 'Vote generated by your\'s truly') {
            evt.d.embeds[0].fields.forEach(e => {
                if (e.value.substring(e.value.length-1) == '>') e.value = e.value.substring(0,e.value.length-1)

                setTimeout(() => {
                    emojiResponse(e.value);
                },evt.d.embeds[0].fields.indexOf(e)*500);
            });

            bot.pinMessage({
                channelID: channelID,
                messageID: evt.d.id
            }, err => {if (err) logger.error(err,'');});
        }
    }

    function emojiResponse(emoji) {
        bot.addReaction({
            channelID: channelID,
            messageID: evt.d.id,
            reaction: emoji
        }, err => {if (err) logger.error(err,'');});
    }
});

bot.on('disconnect', (err, code) => {
    online = false;
    logger.warn(`Disconnected! error: ${err}, code: ${code} (uptime: ${calculateUptime(timeOf.connection,Date.now())})`)
    setTimeout(() => {
        bot.connect();
    },5000)
});

function msg(channel,msg,embed) {
    bot.sendMessage({
        to: channel,
        message: msg,
        embed: embed
    }, err => {if (err) logger.error(err,'');});
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
    uptime.y = Math.floor(uptime.d / 365);
    uptime.d -= uptime.y * 365;

    return uptime;
}

function sfToDate(id) {
    return new Date(id / Math.pow(2,22) + 1420070400000)
}

function afterLogin() {
    let requests = Object.keys(bot.servers).map(server => {
        if (typeof settings.servers[server] == 'undefined') {
            settings.servers[server] = {
                autoCompliment: {
                    enabled: true,
                    targets: []
                },
                autoShit: undefined,
                effects: {
                    rainbow: false,
                    shuffle: false
                },
                nick: bot.username,
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

            for (server in settings.servers) {
                if (typeof bot.servers[server] != 'undefined') {
                    if (settings.servers[server].effects.rainbow) {
                        editColor(server,colors[i]);
                    } else if (typeof settings.servers[server].roleID != 'undefined' && bot.servers[server].roles[settings.servers[server].roleID].color != 16738816) editColor(server,'#ff6a00');

                    if (settings.servers[server].effects.shuffle) {
                        let newName = settings.servers[server].nick.split('');
                        newName.forEach(l => {
                            random = Math.floor(Math.random()*newName.length);
                            let help = newName[random];
                            newName[random] = l;
                            newName[newName.indexOf(l)] = help;
                        });
                        editNick(server,newName.join(''));
                    } else if (typeof bot.servers[server].members[bot.id].nick != 'undefined' && bot.servers[server].members[bot.id].nick != null) editNick(server,settings.servers[server].nick);
                }
            }
            i++;
        }
    },2000);

}

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

function getJSON(file,location = '') {
    let tempObj = {}

    switch (typeof file) {
        case 'object':
            file.forEach(file => {
                if (fs.existsSync(`${location}${file}.json`)) {
                    tempObj[file] = JSON.parse(fs.readFileSync(`${location}${file}.json`, 'utf-8', err => {if (err) logger.error(err,'');}));
                }
            });
            break;
        case 'string':
            if (fs.existsSync(`${location}${file}.json`)) {
                return JSON.parse(fs.readFileSync(`${location}${file}.json`, 'utf-8', err => {if (err) logger.error(err,'');}));
            }
            break;
        default:
    }
    return tempObj;
}

function updateSettings() {
    if (JSON.stringify(settings) != '') fs.writeFile('settings.json', JSON.stringify(settings), err => {if (err) logger.error(err,'')});
}
