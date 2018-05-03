const
    Discord = require('discord.io'),
    logger = require('winston'),
    auth = require('./auth.json'),
    fs = require('fs'),
    io = require('socket.io-client'),

    snowTime = require('./scripts/snowTime.js'),
    Ile = require('./scripts/ile.js');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true,
    timestamp: true
});
logger.level = 'debug';


for (var func in snowTime) eval(`function ${snowTime[func]}`);

const
    objectLib = getJSON(['help','compliments','defaultRes','games','answers','ileAcronym'],'objectLib/'),
    bot = new Discord.Client({
        token: auth.token,
        autorun: true
    });

var
    online = false,
    startedOnce = false;
    settings = getJSON('settings'),
    reminderTimeouts = [],
    timeOf = {
        startUp: Date.now()
    },
    kps = {};
    ile = new Ile(getJSON('ile'),objectLib.ileAcronym);

if (settings.servers === undefined) settings.servers = {};
if (settings.tz === undefined) settings.tz = {};

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

    if ((!server || snowmaker(message.split(' ')[0]) == bot.id) && userID != bot.id) {
        bot.simulateTyping(channelID, err => {if (err) logger.error(err,'');});

        let admin = false;
        if (server) {
            if (userID == bot.servers[serverID].owner_id) admin = true;
            else bot.servers[serverID].members[userID].roles.forEach(v => {
                if (bot.servers[serverID].roles[v]._permissions.toString(2).split('').reverse()[3] == 1) admin = true;
            });
        }

        var args = message.split(' ');

        if (snowmaker(message.split(' ')[0]) == bot.id) {
            var cmd = args[1];
            args = args.splice(2);
        } else {
            var cmd = args[0];
            args = args.splice(1);
        }

        switch (cmd) {
            case 'help':
                objectLib.help.color = server ? bot.servers[serverID].members[userID].color : 16738816;
                msg(channelID,'Some commands:',objectLib.help);
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
                        `**Age:** \`${uptimeToString(si.age)}\``,
                    color: bot.servers[serverID].members[userID].color,
                    timestamp: bot.servers[serverID].joined_at,
                    footer: {
                        icon_url: `https://cdn.discordapp.com/avatars/${bot.id}/${bot.users[bot.id].avatar}.png`,
                        text: `${settings.servers[serverID].nick != null ? settings.servers[serverID].nick : bot.username} joined this server on`
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

                if (settings.tz[serverID]) ie.description += `\n**Server time:** \`${timeAt(settings.tz[serverID])}\``

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
                            `**Age:** \`${uptimeToString(ui.age)}\``,
                        color: server ? bot.servers[serverID].members[ui.id].color : 16738816
                    };

                    ue.thumbnail = {
                        url: `https://cdn.discordapp.com/avatars/${ui.id}/${bot.users[ui.id].avatar}.png`
                    }

                    if (settings.tz[ui.id]) ue.description += `\n**Local time:** \`${timeAt(settings.tz[ui.id])}\``

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
            case 'role':
                if (!server) {
                    msg(channelID, 'Please wait a moment. Let me just check that role in this PM.');
                    break;
                }

                if (args[0]) {
                    args[0] = snowmaker(args[0]);
                    let role = bot.servers[serverID].roles[args[0]];

                    if (!role) {
                        msg(channelID, 'Role not found!');
                        break;
                    }

                    let re = {
                        title: `Information about "${role.name}"`,
                        description: `<@&${role.id}>\n` +
                            `**Role created:** \`${sfToDate(role.id)}\`\n` +
                            `**Age:** ${uptimeToString(calculateUptime(sfToDate(role.id)))}\``,
                        color: role.color
                    };

                    let rollMembers = [];
                    for (var member in bot.servers[serverID].members) {
                        if (bot.servers[serverID].members[member].roles.indexOf(role.id) != -1) rollMembers.push(member);
                    }

                    rollMembers.forEach(v => {
                        re.description += `\n<@${v}>`;
                    });

                    msg(channelID,'Here is the gang:',re);
                } else msg(channelID,'What is that supposed to be? It is called "role" not "roll"!');
                break;
            case 'raffle':
                if (!server) {
                    msg(channelID, 'When you really think about it, how would that even work?');
                    break;
                }

                if (!args[0]) args[0] = 'everyone';
                let raffleList = [];

                switch (args[0]) {
                    case 'everyone':
                        for (var member in bot.servers[serverID].members) raffleList.push(member);
                        break;
                    case 'here':
                        for (var member in bot.servers[serverID].members) {
                            let status = bot.servers[serverID].members[member].status;
                            if (status && status != 'offline') raffleList.push(member);
                        }
                        break;
                    default:
                        args[0] = snowmaker(args[0]);
                        let role = bot.servers[serverID].roles[args[0]];

                        if (!role) {
                            msg(channelID, 'Role not found!');
                            return;
                        }

                        for (var member in bot.servers[serverID].members) {
                            if (bot.servers[serverID].members[member].roles.indexOf(role.id) != -1) raffleList.push(member);
                        }
                }

                if (args[1] && !isNaN(args[1])) ;
                else args[1] = 1;

                let winners = [];
                for (var i = 0; i < args[1]; i++) {
                    winners = winners.concat(raffleList.splice(Math.floor(Math.random()*raffleList.length),1));
                }

                let re = {
                    title: 'Winners',
                    description: '',
                    color: server ? bot.servers[serverID].members[userID].color : 16738816,
                }

                winners.forEach(v => {
                    re.description += `\n<@${v}>`
                });

                if (winners.length === 1) {
                    re.title = 'Winner';
                    re.description = bot.users[winners[0]].username + re.description;
                    re.color = bot.servers[serverID].members[winners[0]].color;
                    re.thumbnail = {
                        url: `https://cdn.discordapp.com/avatars/${winners[0]}/${bot.users[winners[0]].avatar}.png`
                    }
                }

                msg(channelID,'',re);
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
                    msg(channelID,`Time since '${args[0]}': ${uptimeToString(uptime)}\``
                    );
                } else {
                    msg(channelID,`Missing arguments. Usage: \`@${bot.username} uptime startUp | connection | lastCommand\`.`);
                }
                break;
            case 'ask':
                if (args[0]) {
                    msg(channelID,objectLib.answers[Math.floor(Math.random()*objectLib.answers.length)]);
                } else msg(channelID, 'You didn\'t ask anything...');
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
                    ve.thumbnail = {
                        url: `https://cdn.discordapp.com/avatars/${snowmaker(args[1])}/${bot.users[snowmaker(args[1])].avatar}.png`
                    }
                    options = args.splice(2);
                } else {
                    msg(channelID,`${args[0]} not allowed. Use 'def' or 'gold'`);
                    break;
                }

                ve.description += `\n*requested by:\n<@${userID}>*`;

                if (options.length < 1) {
                    msg(channelID,`Options were not included! Example: \`@${bot.username} vote def :thinking:=genius\``);
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
                        msg(channelID,`Some options not defined! Example: \`@${bot.username} vote def :thinking:=genius\``);
                        ve.error = true;
                    }
                });

                if (!ve.error) {
                    msg(channelID,'@everyone',ve);
                }
                break;
            case 'kps':
                let url = 'http://plssave.help/kps';

                if (typeof kps[userID] == 'undefined') {
                    kps[userID] = {};
                    kps[userID].gameActive = false;
                    kps[userID].mem = {player: {theme: 'defeault', selection: null, result: null}, opponent: null};
                    kps[userID].socket = io('http://plssave.help', {path: '/socket2'});

                    kps[userID].socket.on('connect', () => {
                        kps[userID].socket.emit('setName', `${bot.users[userID].username}#${bot.users[userID].discriminator}`);
                    });

                    kps[userID].socket.on('loginSucc', player => {
                        kps[userID].mem.player = player;
                    });

                    kps[userID].socket.on('loginFail', data => msg(userID,'',kpsEmbed(data,0)));

                    kps[userID].socket.on('startGame', data => {
                        kps[userID].gameActive = true;
                        kps[userID].opponent = data;
                        msg(userID,'',kpsEmbed(data,4));
                    });

                    kps[userID].socket.on('toMainMenu', data => {
                        kps[userID].gameActive = false;
                        msg(userID,'',kpsEmbed(data,0));
                    });

                    kps[userID].socket.on('msgFromServer', data => msg(userID,'',kpsEmbed(data,0)));

                    kps[userID].socket.on('result', (player, opponent) => {
                        kps[userID].mem.player = player;
                        kps[userID].mem.opponent = opponent;

                        msg(userID,'',kpsEmbed('Oppnent\'s choice',5));
                    });
                }

                if (kps[userID].socket.connected) kpsEmit(args);
                else {
                    kps[userID].socket.on('connect', () => kpsEmit(args));

                    setTimeout(() => {
                        if (!kps[userID].socket.connected) msg(userID,'Could not connect');
                    }, 10000);
                }

                /**
                 * @arg {String[]} args
                 */
                function kpsEmit(args) {
                    let data = args[0];
                    switch (data) {
                        case 'play':
                            data = 'other';
                        case 'ai':
                        case 'friend':
                            if (!kps[userID].gameActive) {
                                kps[userID].socket.emit('setMode', data, args[1]);
                            } else {
                                msg(userID,'This command is not available while in a game. Use `kps quit` to quit');
                            }
                            break;
                        case 'rock':
                        case 'paper':
                        case 'scissors':
                            if (!kps[userID].gameActive) kps[userID].socket.emit('setMode', 'ai');
                            kps[userID].socket.emit('choose', data);
                            break;
                        case 'classic':
                            kps[userID].socket.emit('setTheme', 'defeault');
                            kps[userID].mem.player.theme = 'defeault';
                            msg(userID,'',kpsEmbed('Theme updated',3));
                            break;
                        case 'horror':
                            kps[userID].socket.emit('setTheme', data);
                            kps[userID].mem.player.theme = data;
                            msg(userID,'',kpsEmbed('Theme updated',3));
                            break;
                        case 'space':
                            kps[userID].socket.emit('setTheme', 'fuckrulla');
                            kps[userID].mem.player.theme = 'fuckrulla';
                            msg(userID,'',kpsEmbed('Theme updated',3));
                            break;
                        case 'hand':
                            kps[userID].socket.emit('setTheme', data);
                            kps[userID].mem.player.theme = data;
                            msg(userID,'',kpsEmbed('Theme updated',3));
                            break;
                        case 'quit':
                            msg(userID,'',kpsEmbed('You left',0));
                            kps[userID].socket.disconnect();
                            kps[userID] = undefined;
                            break;
                        default:
                            msg(userID,`Starting a game: \`play | ai | friend <friendname>\`\nChoosing: \`rock | paper | scissors\`\nTheme selection: \`classic | horror | space | hand\`\nTo quit: \`quit\`\nDon't forget the @${bot.username} kps`);
                    }
                }

                /**
                 * @arg {String} msg
                 * @arg {Number} type
                 * @return {Embed}
                 */
                function kpsEmbed(msg, type) {
                    let player = kps[userID].mem.player;
                    let embed = {
                        title: msg,
                        author: {
                            name: 'KPS',
                            url: 'http://plssave.help/PlayKPS'
                        },
                        fields: []
                    };

                    switch (player.theme) {
                        case 'defeault':
                            embed.author.icon_url = `${url}/img/icon.png`;
                            embed.color = 3569575;
                            break;
                        case 'horror':
                            embed.author.icon_url = `${url}/img/icon4.png`;
                            embed.color = 7667712;
                            break;
                        case 'fuckrulla':
                            embed.author.icon_url = `${url}/img/icon3.png`;
                            embed.color = 32768;
                            break;
                        case 'hand':
                            embed.author.icon_url = `${url}/img/icon2.png`;
                            embed.color = 13027014;
                            break;
                    }

                    switch (type) {
                        case 5:
                            addThumb(kps[userID].mem.opponent);
                            addImage(false);
                            // addScore();
                            addFooter();
                            break;
                        case 4:
                            addThumb('vs');
                            addImage(true);
                            addFooter()
                            break;
                        case 3:
                            addThumb('vs');
                            addImage(true);
                            break;
                        case 2:
                            addThumb('vs');
                            addFooter()
                            break;
                        case 1:
                            addFooter();
                            break;
                    }

                    return embed;

                    /**
                     * @arg {String} img
                     */
                    function addThumb(img) {
                        embed.thumbnail = {url: `${url}/img/${player.theme}/${img}.png`};
                    }

                    /**
                     * @arg {Boolean} background
                     */
                    function addImage(background) {
                        if (background) {
                            embed.image = {url: `${url}/img/${player.theme}/background${player.theme === 'defeault' ? '' : 'new'}.${player.theme === 'horror' ? 'png' : 'jpg'}`};
                        } else {
                            embed.image = {url: `${url}/img/${player.theme}/${player.result}.png`};
                        }
                    }

                    function addScore() {
                        let emojis = ['✅','⚠️','💢']

                        emojis[0] = emojis[0].repeat(Math.round(player.points.wins/player.games*15));
                        emojis[1] = emojis[1].repeat(Math.round(player.points.draws/player.games*15));
                        emojis[2] = emojis[2].repeat(Math.round(player.points.losses/player.games*15));

                        embed.fields.push({name: 'Current score:', value: emojis.join('')});
                    }

                    function addFooter() {
                        embed.footer = {
                            icon_url: `https://cdn.discordapp.com/avatars/${userID}/${bot.users[userID].avatar}.png`,
                            text: `Wins: (${player.total.wins}), Draws: (${player.total.draws}), Losses: (${player.total.losses})`
                        };
                    }
                }
                break;
            case 'ile':
                switch (args[0]) {
                    case 'join':
                        msg(channelID,ile.join(userID));
                        break;
                    case 'leave':
                        msg(channelID,ile.leave(userID));
                        break;
                    case 'here':
                        msg(channelID,ile.attend(userID));
                        break;
                    case 'time':
                        msg(channelID,ile.getCheckpoint());
                        break;
                    default:
                        msg(channelID,`${ile.getAcronym()}: command structure: \`ile join | leave | here | time\``);
                        break;
                }
                break;
            case 'remind':
                if (args[0]) {
                    switch (args[0]) {
                        case 'list':
                            let rle = {
                                title: 'List of your reminders',
                                color: server ? bot.servers[serverID].members[userID].color : 16738816,
                                fields: []
                            };

                            settings.reminders.forEach((v,i,a) => {
                                if (typeof v == 'object'
                                    && v.creator.id == userID
                                ) rle.fields.push({
                                    name: `Reminder #${i}`,
                                    value:
                                        `Time: ${new Date(v.time)} \n` +
                                        `Channel: ${v.channel} \n` +
                                        `Message: ${v.message}`
                                });
                            });

                            msg(channelID, '', rle);
                            break;
                        case 'cancel':
                            if (typeof settings.reminders[args[1]] == 'object') {
                                if (settings.reminders[args[1]].creator.id == userID) {
                                    delete settings.reminders[args[1]];
                                    clearTimeout(reminderTimeouts[args[1]]);
                                    updateSettings();
                                    msg(channelID,'Cancel succesful!')
                                } else msg(channelID,'That\'s not yours!')
                            } else msg(channelID,'Reminder doesn\'t exist!');
                            break;
                        default:
                            let reminder = {
                                mentions: '',
                                creator: {
                                    name: user,
                                    id: userID
                                },
                                color: server ? bot.servers[serverID].members[userID].color : 16738816,
                                time: Date.now()
                            };

                            reminder.channel = snowmaker(args[0]);
                            if (
                                Object.keys(bot.users).indexOf(reminder.channel) != -1 ||
                                Object.keys(bot.channels).indexOf(reminder.channel) != -1
                            ) {
                                args.shift()
                            } else {
                                reminder.channel = channelID;
                            }

                            evt.d.mentions.forEach(v => {
                                if (v.id != bot.id && v.id != reminder.channel) reminder.mentions += `<@${v.id}> `;
                            });

                            if (reminder.mentions === '' && bot.channels[reminder.channel]) reminder.mentions = `<@${reminder.creator.id}>`;

                            reminder.time += anyTimeToMs(args[0]);
                            if (isNaN(reminder.time)) {
                                if (settings.tz[userID]) args[0] += settings.tz[userID];
                                else {
                                    if (server && settings.tz[serverID]) {
                                        args[0] += settings.tz[serverID];
                                        msg(channelID,`Using the server default UTC${settings.tz[serverID]} timezone. You can change your timezone with "\`@${bot.username} timezone\` -command"`);
                                    } else {
                                        args[0] += 'Z';
                                        msg(channelID,`Using the default UTC+00:00 timezone. You can change your timezone with "\`@${bot.username} timezone\` -command"`);
                                    }
                                }
                                reminder.time = datemaker([args[0]]);
                                if (reminder.time == 'Invalid Date') {
                                    msg(channelID,'Time syntax: `([<amount>]ms|[<amount>]s|[<amount>]min|[<amount>]h|[<amount>]d|[<amount>]y)...` or `[<YYYY>-<MM>-<DD>T]<HH>:<MM>[:<SS>]`');
                                    break;
                                } else reminder.time = reminder.time.getTime();
                            }

                            for (let i = 1; i < args.length; i++) {
                                if (!isNaN(anyTimeToMs(args[i]))) reminder.time += anyTimeToMs(args[i]);
                                else {
                                    args.splice(0,i);

                                    if (args.length > 0) reminder.message = args.join(' ');
                                    break;
                                }
                            }

                            settings.reminders.push(reminder);
                            updateSettings();
                            remindTimeout(reminder);

                            msg(channelID,'I will remind when the time comes...')
                    }
                } else remindTimeout({
                    creator: {
                        name: bot.username,
                        id: bot.id
                    },
                    color: server ? bot.servers[serverID].members[userID].color : 16738816,
                    time: Date.now(),
                    channel: channelID,
                    message: `**How to** \n` +
                        'Do stuff:\n' +
                        `\`@${bot.username} remind list | (cancel <number>)\`\n` +
                        'Set reminder at a specific time:\n' +
                        `\`@${bot.username} remind [<#channel>|<@mention>] [<YYYY>-<MM>-<DD>T]<HH>:<MM>[:<SS>] [<message>]...\`\n` +
                        'Set reminder after set amount of time:\n' +
                        `\`@${bot.username} remind [<#channel>|<@mention>] ([<amount>]ms|[<amount>]s|[<amount>]min|[<amount>]h|[<amount>]d|[<amount>]y)... [<message>]...\``
                });
                break;
            case 'timezone':
                if (isValidTimezone(args[0])) {
                    switch (args[1]) {
                        case 'server':
                            if (server && admin) {
                                settings.tz[serverID] = args[0];
                                updateSettings();
                                msg(channelID,`Server timezone is set to: UTC${args[0]}`);
                            } else {
                                msg(channelID,'Unauthorized timezoning command. Try to git gud instead');
                            }
                            break;
                        default:
                            settings.tz[userID] = args[0];
                            updateSettings();
                            msg(channelID,`Your timezone is set to: UTC${args[0]}`);
                    }
                } else {
                    msg(channelID,'NA timezoning command. Try `+HH:MM` or `-HH:MM` instead');
                }
                break;
            case 'autoAnswer':
                if (server) {
                    if (settings.servers[serverID].disableAnswers) {
                        settings.servers[serverID].disableAnswers = false;
                        msg(channelID,'Nothing can stop me now!');
                    } else {
                        settings.servers[serverID].disableAnswers = true;
                        msg(channelID,'You weren\'t asking me? Well, ok then.');
                    }
                    updateSettings()
                } else msg(channelID,'You can\'t escape me here!')
                break;
            case 'autoCompliment':
                if (!server) {
                    msg(channelID, '**Feature not intended to be used in DM. Sending sample:**');
                    args[0] = 'sample'
                }

                if (args[1] != undefined) args[1] = snowmaker(args[1]);

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
                        let list = []
                        settings.servers[serverID].autoCompliment.targets.forEach((v,i) => list[i] = `<@${v}>`)
                        msg(channelID,``,{
                            title: 'List of cool people:',
                            description: list.join('\n'),
                            color: bot.servers[serverID].members[userID].color
                        });
                        break;
                    case 'add':
                        if (args[1] != undefined) {
                            if (admin) {
                                if (settings.servers[serverID].autoCompliment.targets.indexOf(args[1]) == -1) {
                                    settings.servers[serverID].autoCompliment.targets.push(args[1]);
                                    msg(channelID,`User <@${args[1]}> is now cool`);
                                } else {
                                    msg(channelID,`User <@${args[1]}> is already cool!`);
                                }
                            } else {msg(channelID,'Request denied! Not admin');}
                            break;
                        }
                    case 'remove':
                        if (args[1] != undefined) {
                            if (admin) {
                                if (settings.servers[serverID].autoCompliment.targets.indexOf(args[1]) != -1) {
                                    settings.servers[serverID].autoCompliment.targets.splice(settings.servers[serverID].autoCompliment.targets.indexOf(args[1]), 1);
                                    msg(channelID,`User <@${args[1]}> ain't cool no more!`);
                                } else {
                                    msg(channelID,`User <@${args[1]}> was never cool to begin with!`);
                                }
                            } else {msg(channelID,'Request denied! Not admin');}
                            break;
                        }
                    default:
                        msg(channelID,`Missing arguments. Usage: \`@${bot.username} autoCompliment sample | on | off | add <@mention> | remove <@mention> | list\`.`);
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
                            msg(channelID,`Missing arguments. Usage: \`@${bot.username} shit set <@role> | clean\`.`);
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
                    } else {
                        args[0] = null;
                        msg(channelID,'Nickname reset.');
                    }

                    settings.servers[serverID].nick = args[0];
                    updateSettings();
                    editNick(serverID,args[0]);
                } else msg(channelID,'Request denied! Not admin');
                break;
            default:
                if (message.indexOf('?') != -1 && (!server || !settings.servers[serverID].disableAnswers)) {
                    msg(channelID,objectLib.answers[Math.floor(Math.random()*objectLib.answers.length)]);
                } else {
                    msg(channelID,objectLib.defaultRes[Math.floor(Math.random()*objectLib.defaultRes.length)]);
                }
                break;
        }
        timeOf.lastCommand = Date.now();
    } else {
        if (server && settings.servers[serverID].autoCompliment.targets.indexOf(userID) != -1 && settings.servers[serverID].autoCompliment.enabled == true) {
            bot.simulateTyping(channelID, err => {if (err) logger.error(err,'');});
            msg(channelID,`<@${userID}> ${objectLib.compliments[Math.floor(Math.random()*objectLib.compliments.length)]}`);
        }
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
    logger.warn(`Disconnected! error: ${err}, code: ${code} (uptime: ${uptimeToString(calculateUptime(timeOf.connection))})`);
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

function afterLogin() {
    updateHelp();
    startIle();
    startReminding();
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
        startedOnce = true;
        updateSettings();
    });
}

function updateHelp() {
    objectLib.help.thumbnail.url = `https://cdn.discordapp.com/avatars/${bot.id}/${bot.users[bot.id].avatar}.png`;
    objectLib.help.fields.forEach(v => {
        v.name = v.name.replace('GerpBot', bot.username);
        v.value = v.value.replace('GerpBot', bot.username);
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
    }, 60000);

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
                    } else if (typeof bot.servers[server].members[bot.id].nick != 'undefined' && bot.servers[server].members[bot.id].nick != null && bot.servers[server].members[bot.id].nick != settings.servers[server].nick) editNick(server,settings.servers[server].nick);
                }
            }
            i++;
        }
    },2000);

}

function startIle() {
    if (!ile.started) {
        ile.start();
        ile.on('msg', (channel, message, embed) => {
            if (typeof embed != 'undefined') embed.fields.forEach(v => {
                let id = v.name.substring(v.name.indexOf('.') + 2);
                v.name = v.name.replace(id,bot.users[id].username);
            });
            msg(channel, message, embed);
        });
        ile.on('save', data => {
            fs.writeFile('ile.json', JSON.stringify(data, null, 4), err => {
                if (err) logger.error(err,'');
            });
        });
    }
}

function startReminding() {
    if (!startedOnce) {
        if (settings.reminders) {
            for (let v, i = settings.reminders.length-1; i >= 0; i--) {
                v = settings.reminders[i];
                if (v == null) settings.reminders.splice(i,1);
                else remindTimeout(v,i);
            }
            updateSettings();
        } else {
            settings.reminders = [];
        }
    }
}

/**
 * @arg {Object} reminder
 * @arg {Object} reminder.creator
 * @arg {Object} reminder.creator.name
 * @arg {Object} reminder.creator.id
 * @arg {String|Number} reminder.color
 * @arg {Number} reminder.time
 * @arg {Snowflake} reminder.channel
 * @arg {String} reminder.message
 */
function remindTimeout(reminder, i = settings.reminders.indexOf(reminder)) {
    let re = {
        title: 'Reminder',
        description: reminder.message,
        color: reminder.color,
        footer: {
            text: `Created by ${reminder.creator.name}`
        }
    };

    reminderTimeouts[i] = setTimeout(() => {
        delete settings.reminders[i];
        updateSettings();

        msg(reminder.channel, reminder.mentions, re)
    }, reminder.time - Date.now());
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
    if (JSON.stringify(settings) != '') {
        fs.writeFile(`settings.json`, JSON.stringify(settings, null, 4), err => {
            if (err) logger.error(err,'');
            else try {
                JSON.parse(fs.readFileSync('settings.json', 'utf-8', err => {if (err) logger.error(err,'');}));
            }
            catch(err) {
                updateSettings();
            }
        });
    }
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
