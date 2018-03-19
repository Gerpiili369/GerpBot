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

const objectLib = getJSON(['help','compliments','defaultRes','games'],'objectLib/');
const bot = new Discord.Client({
    token: auth.token,
    autorun: true
});

var online = false;
var settings = getJSON('settings');
var timeOf = {
    startUp: Date.now()
};

if (settings.servers === undefined) settings.servers = {};

startLoops();

bot.on('ready', evt => {
    timeOf.connection = Date.now();

    logger.info(`${bot.username} (user ${bot.id}) ready for world domination!`);

    afterLogin();
});

bot.on('message', (user, userID, channelID, message, evt) => {
    let serverID, server = true;
    if (bot.channels[channelID]) serverID = bot.channels[channelID].guild_id;
    else if (bot.directMessages[channelID]) server = false;
    else return;

    if (snowmaker(message.split(' ')[0]) == bot.id && userID != bot.id) {
        bot.simulateTyping(channelID, err => {if (err) logger.error(err,'');});

        let admin = false;
        if (server) {
            if (userID == bot.servers[serverID].owner_id) admin = true;
            else bot.servers[serverID].members[userID].roles.forEach(v => {
                if (bot.servers[serverID].roles[v]._permissions.toString(2).split('').reverse()[3] == 1) admin = true;
            });
        }

        var args = message.split(' ');
        var cmd = args[1];
        args = args.splice(2);

        switch (cmd) {
            case 'help':
                let help = objectLib.help;
                help.color = server ? bot.servers[serverID].members[userID].color : 16738816;
                msg(channelID,'Some commands:',help);
                break;
            case 'server':
                if (!server) {
                    msg(channelID, 'This is a private conversation!')
                    break;
                }

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
                    age: calculateUptime(sfToDate(serverID))
                };

                for (member in bot.servers[serverID].members) {
                    if (!bot.users[member].bot) {
                        let status = bot.servers[serverID].members[member].status;
                        if (!status) status = 'offline'
                        si.members[status]++;
                    } else si.members.bots++;
                }

                for (channel in bot.servers[serverID].channels) {
                    let type = bot.servers[serverID].channels[channel].type;
                    if (type == 0 || type == 2 || type == 4) si.channels[type]++;
                }

                let ie = {
                    title: `Information about "${bot.servers[serverID].name}"`,
                    description: `**Created by:** <@${bot.servers[serverID].owner_id}>\n` +
                        `**Creation date:** \`${sfToDate(serverID)}\`\n` +
                        `**Age:** \`` +
                        `${(si.age.y > 0) ? `${si.age.y} year(s), ` : ''}` +
                        `${(si.age.d > 0) ? `${si.age.d} day(s), ` : ''}` +
                        `${(si.age.h > 0) ? `${si.age.h} hour(s), ` : ''}` +
                        `${si.age.min} min(s)\``,
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
                };

                msg(channelID,'Here you go:',ie);
                break;
            case 'user':
                if (args[0]) {
                    args[0] = snowmaker(args[0]);

                    if (!bot.users[args[0]]) {
                        msg(channelID, 'User not found!');
                        break;
                    }

                    let ui = {
                        id: args[0],
                        roles: [],
                        age: calculateUptime(sfToDate(args[0]))
                    };

                    let ue = {
                        title: `Information about "${bot.users[ui.id].username}#${bot.users[ui.id].discriminator}"`,
                        description: `**Also known as:** "<@${ui.id}>"\n` +
                            `**User created:** \`${sfToDate(ui.id)}\`\n` +
                            `**Age:** \`` +
                            `${(ui.age.y > 0) ? `${ui.age.y} year(s), ` : ''}` +
                            `${(ui.age.d > 0) ? `${ui.age.d} day(s), ` : ''}` +
                            `${(ui.age.h > 0) ? `${ui.age.h} hour(s), ` : ''}` +
                            `${ui.age.min} min(s)\``,
                        color: server ? bot.servers[serverID].members[ui.id].color : 16738816
                    };

                    ue.thumbnail = {
                        url: `https://cdn.discordapp.com/avatars/${ui.id}/${bot.users[ui.id].avatar}.png`
                    }

                    let cleanRoll = [], status = '';
                    if (server) {
                        ue.timestamp = new Date(bot.servers[serverID].members[ui.id].joined_at);
                        ue.footer = {
                            icon_url: `https://cdn.discordapp.com/icons/${serverID}/${bot.servers[serverID].icon}.png`,
                            text: `${bot.users[ui.id].username} joined this server on`
                        };

                        Object.keys(bot.servers[serverID].roles).forEach(v => {
                            if (bot.servers[serverID].members[ui.id].roles.indexOf(v) != -1)
                            ui.roles[bot.servers[serverID].roles[v].position] = '<@&'+v+'>';
                        });

                        ui.roles.forEach(v => {if (v) cleanRoll.push(v)});
                        ui.roles = cleanRoll.reverse();

                        switch (bot.servers[serverID].members[ui.id].status) {
                            case 'online':
                                status = '✅ Online';
                                break;
                            case 'idle':
                                status = '💤 Idle';
                                break;
                            case 'dnd':
                                status = '⛔ Do not disturb';
                                break;
                            default:
                                status = '⚫ Offline';
                                break;
                        }
                        ue.description += `\n**Status:** ${status}`;

                        if (ui.roles.length > 0) ue.description +='\n**Roles:** ';
                        ui.roles.forEach(v => ue.description += ` ${v}`);
                    };

                    msg(channelID,'High quality spying:',ue);
                } else msg(channelID,'I would give you the info you seek, but it is clear you don\'t even know what you want');
                break;
            case 'ping':
                msg(channelID,'Pong!');
                break;
            case 'pi':
                msg(channelID, `Here it is: \`${Math.PI}...\``);
                break;
            case 'nerfThis':
                msg(channelID,'<@305716128615759873> was the sole victim');
                break;
            case 'echo':
                msg(channelID,args.join(' '));
                break;
            case 'getGerp':
                msg(channelID,'<@217953472715292672>');
                break;
            case 'uptime':
                if (typeof timeOf[args[0]] != 'undefined') {
                    let uptime = calculateUptime(timeOf[args[0]]);
                    msg(channelID,`Time since '${args[0]}': \`` +
                        `${(uptime.y > 0) ? `${uptime.y} year(s), ` : ''}` +
                        `${(uptime.d > 0) ? `${uptime.d} day(s), ` : ''}` +
                        `${(uptime.h > 0) ? `${uptime.h} hour(s), ` : ''}` +
                        `${(uptime.min > 0) ? `${uptime.min} minute(s), ` : ''}` +
                        `${uptime.s} second(s)\``
                    );
                } else {
                    msg(channelID,'Missing arguments. Usage: `@GerpBot uptime [ startUp | connection | lastCommand ]`.');
                }
                break;
            case 'vote':
                let options = [];
                let ve = {
                    color: server ? bot.servers[serverID].members[userID].color : 16738816,
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

                ve.description += `\n*requested by:\n<@${userID}>*`;

                if (options.length < 1) {
                    msg(channelID,'Options were not included! Example: `@GerpBot vote def :thinking:=genius`');
                    break;
                }
                options.forEach(v => {
                    let p = v.split('=');

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
            case 'ile':
                switch (args[0]) {
                    case 'join':
                        if (typeof settings.ile.players[userID] == 'undefined') {
                            settings.ile.players[userID] = {
                                joined: false,
                                checkIn: false,
                                status: null,
                                delay: {}
                            }
                        }

                        if (!settings.ile.players[userID].joined) {
                            settings.ile.players[userID].joined = true;
                            msg(channelID, 'Welcome TO THE GAME!');
                        } else {
                            msg(channelID, 'Already here ya\'know.')
                        }
                        break;
                    case 'leave':
                        if (settings.ile.players[userID] && settings.ile.players[userID].joined) {
                            settings.ile.players[userID].joined = false;
                            msg(channelID, 'Freedom, I guess.');
                        } else {
                            msg(channelID, 'Nothing to leave!')
                        }
                        break;
                    case 'here':
                        if (settings.ile.players[userID] && settings.ile.players[userID].joined && Date.now() > settings.ile.end && settings.ile.players[userID].status != 'missed') {
                            settings.ile.players[userID].checkIn = true;
                            settings.ile.players[userID].delay = calculateUptime(settings.ile.end);
                            msg(channelID, `You have checked in with the status: ${settings.ile.players[userID].status}, and with the time of ${settings.ile.players[userID].delay.h}:${settings.ile.players[userID].delay.min}:${settings.ile.players[userID].delay.s}`);
                        } else {
                            msg(channelID, 'That is cheating!');
                        }
                        break;
                    default:
                        msg(channelID, 'Something is missing...');
                        break;
                }
                break;
            case 'autoCompliment':
                if (!server) {
                    msg(channelID, '**Feature not intended to be used in DM. Sending sample:**');
                    args[0] = 'sample'
                }

                switch (args[0]) {
                    case 'sample':
                        msg(channelID,`<@${userID}> ${objectLib.compliments[Math.floor(Math.random()*objectLib.compliments.length)]}`);
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
                        });
                        break;
                    case 'add':
                        if (args[1] != undefined) {
                            if (admin) {
                                if (settings.servers[serverID].autoCompliment.targets.indexOf(args[1]) == -1) {
                                    settings.servers[serverID].autoCompliment.targets.push(args[1]);
                                    msg(channelID,`User ${args[1]} is now cool`);
                                } else {
                                    msg(channelID,`User ${args[1]} is already cool!`);
                                }
                            } else {msg(channelID,'Request denied! Not admin');}
                            break;
                        }
                    case 'remove':
                        if (args[1] != undefined) {
                            if (admin) {
                                if (settings.servers[serverID].autoCompliment.targets.indexOf(args[1]) != -1) {
                                    settings.servers[serverID].autoCompliment.targets.splice(settings.servers[serverID].autoCompliment.targets.indexOf(args[1]), 1);
                                    msg(channelID,`User ${args[1]} ain't cool no more!`);
                                } else {
                                    msg(channelID,`User ${args[1]} was never cool to begin with!`);
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
                if (!server) {
                    msg(channelID, 'no u');
                    emojiResponse('💩');
                    break;
                }

                if (admin) {
                    switch (args[0]) {
                        case 'set':
                            if (args[1] != undefined) {
                                args[1] = snowmaker(args[1]);
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
                    }
                    updateSettings();
                } else msg(channelID,'Request denied! Not admin');
                break;
            case 'effect':
                if (!server) {
                    msg(channelID, 'I think that is a bad idea...');
                    break;
                }

                if (admin) {
                    if (settings.servers[serverID].roleID != undefined) {
                        switch (args[0]) {
                            case 'rainbow':
                                if (settings.servers[serverID].effects.rainbow) {
                                    settings.servers[serverID].effects.rainbow = false;
                                    msg(channelID,'Rainbow effect deactivated!');
                                } else {
                                    settings.servers[serverID].effects.rainbow = true;
                                    msg(channelID,'Rainbow effect activated!');
                                }
                                break;
                            case 'shuffle':
                                if (settings.servers[serverID].effects.shuffle) {
                                    settings.servers[serverID].effects.shuffle = false;
                                    msg(channelID,'Shuffle effect deactivated!');
                                } else {
                                    settings.servers[serverID].effects.shuffle = true;
                                    msg(channelID,'Shuffle effect activated!');
                                }
                                break;
                            default:
                                msg(channelID,'Shuffle or rainbow?');
                                break;
                        }
                        updateSettings();
                    } else {
                        msg(channelID,'Please create me my own role (with some permissions pls)');
                    }
                } else msg(channelID,'Request denied! Not admin');
                break;
            case 'handle':
                if (!server) {
                    msg(channelID, 'Fun fact: YOU CAN\'T HAVE NICKNAMES IN DM!!!')
                    break;
                }

                if (admin) {
                    if (args[0]) {
                        msg(channelID,`I will now be known as "${args[0]}"`);
                        settings.servers[serverID].nick = args[0];
                        editNick(serverID,args[0]);
                    } else msg(channelID,'Argument required!');
                } else msg(channelID,'Request denied! Not admin');
                break;
            default:
                msg(channelID,objectLib.defaultRes[Math.floor(Math.random()*objectLib.defaultRes.length)]);
                break;
        }
        timeOf.lastCommand = Date.now();
    } else if (server && settings.servers[serverID].autoCompliment.targets.indexOf(userID) != -1 && settings.servers[serverID].autoCompliment.enabled == true) {
        bot.simulateTyping(channelID, err => {if (err) logger.error(err,'');});
        msg(channelID,`<@${userID}> ${objectLib.compliments[Math.floor(Math.random()*objectLib.compliments.length)]}`);
    }

    if (server && typeof settings.servers[serverID].autoShit == 'string' && bot.servers[serverID].members[userID].roles.indexOf(settings.servers[serverID].autoShit) != -1) emojiResponse('💩');

    if (userID == bot.id && evt.d.embeds[0] && evt.d.embeds[0].footer && evt.d.embeds[0].footer.text == 'Vote generated by your\'s truly') {
        evt.d.embeds[0].fields.forEach((v,i) => {
            if (v.value.substring(v.value.length-1) == '>') v.value = v.value.substring(0,v.value.length-1);
            setTimeout(() => emojiResponse(v.value),i*500);
        });

        bot.pinMessage({
            channelID: channelID,
            messageID: evt.d.id
        }, err => {if (err) logger.error(err,'');});
    }

    /**
     * @arg {String} emoji
     */
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
    logger.warn(`Disconnected! error: ${err}, code: ${code} (uptime: ${calculateUptime(timeOf.connection)})`);
    setTimeout(() => {
        bot.connect();
    },5000);
});

/**
 * @arg {Snowflake} channel
 * @arg {String} msg
 * @arg {Embed} [embed]
 */
function msg(channel,msg,embed) {
    bot.sendMessage({
        to: channel,
        message: msg,
        embed: embed
    }, err => {if (err) logger.error(err,'');});
}

/**
 * @arg {Date} start
 * @arg {Date} [end]
 * @returns {Uptime}
 */
function calculateUptime(start,end = Date.now()) {
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

/**
 * @arg {Snowflake} id
 * @returns {Date}
 */
function sfToDate(id) {
    return new Date(id / Math.pow(2,22) + 1420070400000);
}

/**
 * @arg {String} input
 * @returns {Snowflake}
*/
function snowmaker(input) {
    let sf = [];

    input = input.split(' ').join('').split('');
    input.forEach((v,i,a) => {if (!isNaN(Number(v))) sf.push(v);});

    return sf.join('');
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
            };
        }

        bot.servers[server].members[bot.id].roles.forEach(v => {
            let role = bot.servers[server].roles[v];
            if (role.name === bot.username) {
                settings.servers[server].roleID = role.id;
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

    if (typeof settings.ile == 'undefined') settings.ile = {
        end: undefined,
        players: {},
        gameState: 'unactive', // unactive, waiting, lateWait, missingWait
        sendEndtime: (channelID = false) => {
            if (channelID) msg(channelID, `Next checkpoint: ${settings.ile.end}`)
            else for (var player in settings.ile.players) {
                if (settings.ile.players[player].joined) msg(player, `Next checkpoint: ${new Date(settings.ile.end)}`);
            }
        },
        newRound: (timeout = Math.floor(Math.random() * (10000 - 5000) + 5000)) => {
            for (var player in settings.ile.players) {
                settings.ile.players[player].checkIn = false;
            }
            settings.ile.gameState = 'waiting';
            settings.ile.end = Math.floor((Date.now()+timeout)/1000)*1000;
            settings.ile.sendEndtime();
        }
    }
}

function startLoops() {
    setInterval(() => {
        bot.setPresence({
            game: {
                name: objectLib.games[Math.floor(Math.random()*objectLib.games.length)],
                type: 0
            }
        });
    }, 60000);

    setInterval(() => {
        if (online && typeof settings.ile != 'undefined') {
            if (settings.ile.gameState != 'unactive') {
                if (settings.ile.gameState == 'waiting' && Math.floor(Date.now()) > settings.ile.end) {
                    for (var player in settings.ile.players) {
                        if (settings.ile.players[player].joined === true) {
                            settings.ile.players[player].status = 'on time';
                            msg(player, 'It is time');
                        }
                    }
                    settings.ile.gameState = 'lateWait';
                }

                if (settings.ile.gameState == 'lateWait' && Math.floor(Date.now()) > settings.ile.end + 5000) {
                    for (var player in settings.ile.players) {
                        if (settings.ile.players[player].joined === true && !settings.ile.players[player].checkIn) {
                            settings.ile.players[player].status = 'late';
                            msg(player, 'You are late');
                        }
                    }
                    settings.ile.gameState = 'missingWait';
                }

                if (settings.ile.gameState == 'missingWait' && Math.floor(Date.now()) > settings.ile.end + 10000) {
                    for (var player in settings.ile.players) {
                        if (settings.ile.players[player].joined === true && !settings.ile.players[player].checkIn) {
                            settings.ile.players[player].status = 'missed';
                            msg(player, 'You have missed the thing');
                        }
                    }
                    settings.ile.gameState = 'unactive';
                }
            } else {
                let activePlayers = false;
                for (var player in settings.ile.players) {
                    if (settings.ile.players[player].joined) activePlayers = true;
                }
                if (activePlayers) settings.ile.newRound();
            }
        }

    }, 1000);

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
                        newName.forEach((v,i,a) => {
                            random = Math.floor(Math.random()*a.length);
                            let help = a[random];
                            a[random] = v;
                            a[i] = help;
                        });
                        editNick(server,newName.join(''));
                    } else if (typeof bot.servers[server].members[bot.id].nick != 'undefined' && bot.servers[server].members[bot.id].nick != null) editNick(server,settings.servers[server].nick);
                }
            }
            i++;
        }
    },2000);

}

/**
 * @arg {Snowflake} server
 * @arg {Number|String} color
 */
function editColor (server,color) {
    bot.editRole({
        serverID: server,
        roleID: settings.servers[server].roleID,
        color: color
    }, err => {if (err) logger.error(err,'');});
}

/**
 * @arg {Snowflake} server
 * @arg {String} newName
 */
function editNick (server,newName) {
    bot.editNickname({
        serverID: server,
        userID: bot.id,
        nick: newName
    }, err => {if (err) logger.error(err,'');});
}

/**
 * @arg {String|String[]} file
 * @arg {String} [location]
 * @returns {Object}
 */
function getJSON(file,location = '') {
    let tempObj = {};

    switch (typeof file) {
        case 'object':
            file.forEach(v => {
                if (fs.existsSync(`${location}${v}.json`)) {
                    tempObj[v] = JSON.parse(fs.readFileSync(`${location}${v}.json`, 'utf-8', err => {if (err) logger.error(err,'');}));
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

/**
 * @typedef {String} Snowflake
 * @typedef {Object} Uptime
 * @property {number} ms
 * @property {number} s
 * @property {number} min
 * @property {number} h
 * @property {number} day
 * @property {number} year
 *
 * @typedef {Object} Embed
 * @property {String} [title]
 * @property {String} [description]
 * @property {String} [url]
 * @property {Number|String} [color]
 * @property {Date} [timestamp]
 * @property {{icon_url?: String, text?: String}} [footer]
 * @property {{url?: String]}} [thumbnail]
 * @property {{url?: String}} [image]
 * @property {{name: String, url?: String, icon_url?: String}} [author]
 * @property {{name: String, value: String, inline?: Boolean}[]} [fields]
 */
