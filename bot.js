const
    // config file
    config = require('./config'),
    // node_modules
    Discord = require('discord.io'),
    logger = require('winston'),
    fs = require('fs'),
    path = require('path'),
    io = require('socket.io-client'),
    isUrl = require('is-url'),
    fetch = require('node-fetch'),
    ytdl = require('ytdl-core'),
    cp = require('child_process'),
    snowTime = require('snowtime'),
    // scripts
    web = require('./scripts/web.js'),
    bs = require('./scripts/bs.js'),
    Ile = require('./scripts/ile.js'),
    permCheck = require('./scripts/permCheck.js'),
    // load objectLib
    objectLib = getJSON([
        'help', 'compliments', 'defaultRes', 'games', 'answers', 'ileAcronym'
    ], 'objectLib'),
    // constant variables
    bot = new Discord.Client({ token: config.auth.token, autorun: true }),
    ile = new Ile(getJSON('ile'), objectLib.ileAcronym),
    bsga = new bs.GameArea(),
    kps = {},
    reminderTimeouts = [],
    timeOf = {
        startUp: Date.now()
    },
    color = {
        default: 16738816,  // GerpOrange
        error: 16711680     // ErrorRed
    },
    // funky function stuff
    pc = permCheck(bot);

let
    // other variables
    startedOnce = false,
    online = false,
    settings = getJSON('settings');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true,
    timestamp: true
});
logger.level = 'debug';

for (const func in snowTime) eval(`${func} = snowTime.${func}`);

startLoops();

web.activate('/discord').then(logger.info);

bot.on('ready', evt => {
    timeOf.connection = Date.now();

    updateHelp();
    startIle();
    startReminding();

    if (!settings.tz) settings.tz = {};
    if (!settings.servers) settings.servers = {};

    for (const server in bot.servers) {
        if (!settings.servers[server]) settings.servers[server] = {
            autoCompliment: {
                enabled: true,
                targets: []
            },
            effects: {
                rainbow: false,
                shuffle: false
            },
            nick: bot.username
        };

        for (const role of bot.servers[server].members[bot.id].roles)
            if (bot.servers[server].roles[role].name === bot.username)
                settings.servers[server].roleID = bot.servers[server].roles[role].id;
    }
    logger.info(startedOnce ? 'Reconnection succesful!' : `${bot.username} (user ${bot.id}) ready for world domination!`);

    online = true;
    startedOnce = true;
    updateSettings();

});

bot.on('message', (user, userID, channelID, message, evt) => {
    let serverID, admin = false, cmd, args = message.split(' ');

    if (bot.channels[channelID]) serverID = bot.channels[channelID].guild_id;
    else if (!bot.directMessages[channelID]) return;

    if ((!serverID || snowmaker(args[0]) == bot.id) && !bot.users[userID].bot) {
        // Messages with commands

        if (serverID) {
            if (userID == bot.servers[serverID].owner_id) admin = true;
            else for (const role of bot.servers[serverID].members[userID].roles) {
                if (bot.servers[serverID].roles[role]._permissions.toString(2).split('').reverse()[3] == 1) admin = true;
            }
        }

        if (snowmaker(args[0]) == bot.id) {
            cmd = args[1];
            args = args.splice(2);
        } else {
            cmd = args[0];
            args = args.splice(1);
        }

        switch (cmd) {
            case 'help':
                if (serverID && !pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                    return pc.missage(msg, channelID, ['Embed Links']);

                objectLib.help.color = serverID ? bot.servers[serverID].members[userID].color : color.default;
                msg(channelID, 'Some commands:', objectLib.help);
                break;
            case 'server':
                if (!serverID) return msg(channelID, 'This is a private conversation!');
                if (!pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                    return pc.missage(msg, channelID, ['Embed Links']);

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

                for (const member in bot.servers[serverID].members) {
                    if (!bot.users[member].bot) {
                        let status = bot.servers[serverID].members[member].status;
                        if (!status) status = 'offline'
                        si.members[status]++;
                    } else si.members.bots++;
                }

                for (const channel in bot.servers[serverID].channels) {
                    let type = bot.servers[serverID].channels[channel].type;
                    if (type == 0 || type == 2 || type == 4) si.channels[type]++;
                }

                let ie = {
                    title: `Information about "${bot.servers[serverID].name}"`,
                    description: `**Created by:** <@${bot.servers[serverID].owner_id}>\n` +
                        `**Creation date:** \`${timeAt(findTimeZone(settings.tz, [userID, serverID]), sfToDate(serverID))}\`\n` +
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
                            value: `✅ Online: ${si.members.online}\n💤 Idle: ${si.members.idle}\n⛔ Do not disturb: ${si.members.dnd}\n⚫ Offline: ${si.members.offline}`,
                            inline: true
                        },
                        {
                            name: 'Channels:',
                            value: `💬 Text: ${si.channels[0]}\n🎙️ Voice: ${si.channels[2]}\n📁 Category: ${si.channels[4]}`,
                            inline: true
                        },
                        {
                            name: 'More stuff:',
                            value: `Roles: ${Object.keys(bot.servers[serverID].roles).length}, Emojis: ${Object.keys(bot.servers[serverID].emojis).length}/50, Bots: ${si.members.bots}`,
                            inline: true
                        }
                    ]
                };

                if (settings.tz[serverID]) ie.description += `\n**Server time:** \`${timeAt(settings.tz[serverID])}\``

                msg(channelID, 'Here you go:', ie);
                break;
            case 'user':
                if (serverID && !pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                    return pc.missage(msg, channelID, ['Embed Links']);
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
                            `**User created:** \`${timeAt(findTimeZone(settings.tz, [userID, serverID]), sfToDate(ui.id))}\`\n` +
                            `**Age:** \`${uptimeToString(ui.age)}\``,
                        color: serverID ? bot.servers[serverID].members[ui.id].color : color.default
                    };

                    ue.thumbnail = {
                        url: `https://cdn.discordapp.com/avatars/${ui.id}/${bot.users[ui.id].avatar}.png`
                    }

                    if (settings.tz[ui.id]) ue.description += `\n**Local time:** \`${timeAt(settings.tz[ui.id])}\``

                    let cleanRoll = [], status = '';
                    if (serverID) {
                        ue.timestamp = new Date(bot.servers[serverID].members[ui.id].joined_at);
                        ue.footer = {
                            icon_url: `https://cdn.discordapp.com/icons/${serverID}/${bot.servers[serverID].icon}.png`,
                            text: `${bot.users[ui.id].username} joined this server on`
                        };

                        for (const role in bot.servers[serverID].roles)
                            if (bot.servers[serverID].members[ui.id].roles.indexOf(role) != -1)
                                ui.roles[bot.servers[serverID].roles[role].position] = '<@&' + role + '>';

                        for (const role of ui.roles) if (role) cleanRoll.push(role);
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

                        if (ui.roles.length > 0) ue.description += '\n**Roles:** ';
                        for (const role of ui.roles) ue.description += ` ${role}`;
                    };

                    msg(channelID, 'High quality spying:', ue);
                } else msg(channelID, 'I would give you the info you seek, but it is clear you don\'t even know what you want');
                break;
            case 'role':
                if (!serverID) return msg(channelID, 'Please wait a moment. Let me just check that role in this PM.');
                if (!pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                    return pc.missage(msg, channelID, ['Embed Links']);

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
                            `**Role created:** \`${timeAt(findTimeZone(settings.tz, [userID, serverID]), sfToDate(role.id))}\`\n` +
                            `**Age:** ${uptimeToString(calculateUptime(sfToDate(role.id)))}\``,
                        color: role.color
                    };

                    let rollMembers = [];
                    for (const user in bot.servers[serverID].members)
                        if (bot.servers[serverID].members[user].roles.indexOf(role.id) != -1) rollMembers.push(user);

                    for (const user of rollMembers) re.description += `\n<@${user}>`;

                    msg(channelID, 'Here is the gang:', re);
                } else msg(channelID, 'What is that supposed to be? It is called "role" not "roll"!');
                break;
            case 'raffle':
                if (!serverID && !bot.channels[snowmaker(args[0])]) {
                    msg(channelID, 'When you really think about it, how would that even work?');
                    break;
                }
                if (!pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                    return pc.missage(msg, channelID, ['Embed Links']);

                if (!args[0]) args[0] = 'everyone';
                let raffleList = [];

                switch (args[0]) {
                    case 'everyone':
                    case '@everyone':
                        raffleList = Object.keys(bot.servers[serverID].members)
                        break;
                    case 'here':
                    case '@here':
                        for (const member in bot.servers[serverID].members) {
                            let status = bot.servers[serverID].members[member].status;
                            if (status && status != 'offline') raffleList.push(member);
                        }
                        break;
                    default:
                        args[0] = snowmaker(args[0]);

                        if (serverID && bot.servers[serverID].roles[args[0]]) {
                            for (const member in bot.servers[serverID].members) {
                                if (bot.servers[serverID].members[member].roles.indexOf(bot.servers[serverID].roles[args[0]].id) != -1) raffleList.push(member);
                            }
                        } else if (bot.channels[args[0]]) {
                            raffleList = membersInChannel(args[0]);
                        } else {
                            msg(channelID, 'Role or channel not found!');
                            return;
                        }
                }

                if (args[1] && !isNaN(args[1]));
                else args[1] = 1;

                let winners = [];
                for (let i = 0; i < args[1]; i++) {
                    winners = winners.concat(raffleList.splice(Math.floor(Math.random() * raffleList.length), 1));
                }

                let re = {
                    title: 'Winners',
                    description: '',
                    color: serverID ? bot.servers[serverID].members[userID].color : color.default,
                }

                if (bot.channels[args[0]] && (!serverID || bot.channels[args[0]].guild_id != serverID)) {
                    for (const winner of winners) re.description += `\n${bot.users[winner].username}`;
                } else {
                    for (const winner of winners) re.description += `\n<@${winner}>`;
                }

                if (winners.length === 1) {
                    re.title = 'Winner';
                    if (bot.channels[args[0]]) {
                        re.color = bot.servers[bot.channels[args[0]].guild_id].members[winners[0]].color;
                    } else {
                        re.color = bot.servers[serverID].members[winners[0]].color;
                    }
                    re.thumbnail = {
                        url: `https://cdn.discordapp.com/avatars/${winners[0]}/${bot.users[winners[0]].avatar}.png`
                    }
                }

                msg(channelID, '', re);
                break;
            case 'ping':
                msg(channelID, 'Pong!');
                break;
            case 'pi':
                msg(channelID, `Here it is: \`${Math.PI}...\``);
                break;
            case 'rng':
                if (args[0]) {
                    let
                        max = Number(args[0].split('..')[1]),
                        min = Number(args[0].split('..')[0]),
                        result = [],
                        amount = 1;

                    if (args[0].indexOf('..') != -1) {
                        if (isNaN(max) || isNaN(min)) {
                            msg(channelID, 'Not a number!');
                            break;
                        }
                    } else {
                        max = Number(args[0]);
                        min = 0;
                        if (isNaN(max)) {
                            msg(channelID, 'Not a number!');
                            break;
                        }
                    }

                    if (max < min) {
                        let mem = min;
                        min = max;
                        max = mem;
                    }
                    max++

                    if (!isNaN(Number(args[1]))) amount = args[1];

                    for (let i = 0; i < amount; i++) {
                        result.push(Math.floor(Math.random() * (max - min)) + min);
                    }

                    msg(channelID, result.join(', '));
                } else msg(channelID, 'Syntax: `rng <number>[..<number>] [<amount>]`')
                break;
            case 'nerfThis':
            case 'nt':
                msg(channelID, 'Leenakop was the only one who died...');
                break;
            case 'echo':
                msg(channelID, args.join(' '));
                break;
            case 'uptime':
            case 'ut':
                if (timeOf[args[0]]) {
                    let uptime = calculateUptime(timeOf[args[0]]);
                    msg(channelID, `Time since '${args[0]}': ${uptimeToString(uptime)}\``
                    );
                } else {
                    msg(channelID, `Missing arguments. Usage: \`@${bot.username} uptime startUp | connection | lastCommand\`.`);
                }
                break;
            case 'ask':
                if (args[0]) msg(channelID, objectLib.answers[Math.floor(Math.random() * objectLib.answers.length)]);
                else msg(channelID, 'You didn\'t ask anything...');
                break;
            case 'vote':
                if (serverID &&
                    !pc.userHasPerm(serverID, bot.id, 'TEXT_MANAGE_MESSAGES', channelID) ||
                    !pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID) ||
                    !pc.userHasPerm(serverID, bot.id, 'TEXT_READ_MESSAGE_HISTORY', channelID) ||
                    !pc.userHasPerm(serverID, bot.id, 'TEXT_ADD_REACTIONS', channelID)
                ) return pc.missage(msg, channelID, ['Manage Messages', 'Embed Links', 'Read Message History', 'Add Reactions']);

                let options = [], ve = {
                    color: serverID ? bot.servers[serverID].members[userID].color : color.default,
                    footer: { text: 'Vote generated by your\'s truly.' },
                    fields: [],
                    error: false
                };

                switch (args[0]) {
                    case 'gold':
                        ve.description = `**Let's vote for ${args[1]}'s next golden gun!**`;
                        if (bot.users[snowmaker(args[1])]) ve.thumbnail = {
                            url: `https://cdn.discordapp.com/avatars/${snowmaker(args[1])}/${bot.users[snowmaker(args[1])].avatar}.png`
                        }
                        options = args.splice(2);

                        break;
                    default:
                        ve.description = '**Let\'s do a vote!**';
                        options = args.splice(0);
                }

                ve.description += `\n*requested by:\n<@${userID}>*`;

                if (options.length < 1) {
                    msg(channelID, `Options were not included! Example: \`@${bot.username} vote :thinking:=genius\`.`);
                    break;
                }
                for (const option of options) {
                    let p = option.split('=');

                    if (p[0] != '') {
                        if (p[1]) ve.fields.push({
                            name: `Vote for ${p[1]} with:`,
                            value: `${p[0]}`,
                            inline: true
                        });
                        else ve.fields.push({
                            name: `Vote with:`,
                            value: `${p[0]}`,
                            inline: true
                        });
                    } else {
                        msg(channelID, `Some options not defined! Example: \`@${bot.username} vote :thinking:=genius\`.`);
                        ve.error = true;
                    }
                }

                if (!ve.error) msg(channelID, '@everyone', ve);
                break;
            case 'music':
            case 'play':
                const
                    playNext = stream => {
                        if (settings.servers[serverID].audio.que.length > 0 && !bot.servers[serverID].stopped) {
                            const song = settings.servers[serverID].audio.que.shift();

                            settings.servers[serverID].audio.channel && msg(settings.servers[serverID].audio.channel, 'Now playing:', {
                                title: song.title,
                                description: song.description + '\n' +
                                    `Published at: ${timeAt(findTimeZone(settings.tz, [userID, serverID]), new Date(song.published))}`,
                                thumbnail: { url: song.thumbnail },
                                color: serverID ? bot.servers[serverID].members[userID].color : color.default
                            });

                            bot.servers[serverID].ccp = cp.spawn('ffmpeg', [
                                '-loglevel', '0',
                                '-i', song.url,
                                '-f', 's16le',
                                '-ar', '48000',
                                '-ac', '2',
                                'pipe:1'
                            ], { stdio: ['pipe', 'pipe', 'ignore'] });
                            bot.servers[serverID].ccp.stdout.once('readable', () => stream.send(bot.servers[serverID].ccp.stdout));
                            bot.servers[serverID].ccp.stdout.once('end', () => {
                                bot.servers[serverID].playing = false;
                                playNext(stream);
                                bot.servers[serverID].stopped = false;
                            });
                            bot.servers[serverID].playing = song;
                            updateSettings();
                        } else bot.leaveVoiceChannel(bot.servers[serverID].members[bot.id].voice_channel_id);
                    },
                    queueSong = song => new Promise((resolve, reject) => {
                        settings.servers[serverID].audio.que.push(song);
                        updateSettings();
                        msg(channelID, 'Added to queue:', {
                            title: song.title,
                            description: song.description + '\nPublished at: ' +
                                timeAt(findTimeZone(settings.tz, [userID, serverID]), new Date(song.published)),
                            thumbnail: { url: song.thumbnail },
                            color: serverID ? bot.servers[serverID].members[userID].color : color.default
                        });
                        resolve(song);
                    }),
                    addUrl2song = song => new Promise((resolve, reject) => ytdl.getInfo(`http://www.youtube.com/watch?v=${song.id}`, (err, info) => {
                        if (err) reject('URL machine broke.');
                        song.url = info.formats[info.formats.length - 1].url;
                        resolve(song);
                    })),
                    searchSong = keywords => fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${keywords.join('+')}&key=${config.auth.tubeKey}`)
                        .then(result => result.json())
                        .then(data => {
                            if (data.error) return Promise.reject(data.error.errors);
                            for (const item of data.items) if (item.id.kind === 'youtube#video') return {
                                id: item.id.videoId,
                                title: item.snippet.title,
                                description: item.snippet.description,
                                thumbnail: item.snippet.thumbnails.high.url,
                                published: item.snippet.publishedAt,
                                channel: {
                                    id: item.snippet.channelID,
                                    Title: item.snippet.channelTitle
                                },
                                request: {
                                    id: userID,
                                    time: Date.now()
                                }
                            };
                            return Promise.reject('Song not found!');
                        })
                        .then(addUrl2song)
                        .catch(err => Promise.reject({ type: 'msg', name: 'Search failed!', message: typeof err === 'string' ? err : 'Code bad' })),
                    joinVoice = (voiceChannelID = bot.servers[serverID].members[userID].voice_channel_id) => new Promise((resolve, reject) => voiceChannelID ?
                        bot.joinVoiceChannel(voiceChannelID, err => err && err.toString().indexOf('Voice channel already active') == -1 ? reject(err) : resolve(voiceChannelID)) :
                        reject({ type: 'msg', name: 'Could not join!', message: 'You are not in a voice channel!' })
                    ),
                    getStream = voiceChannelID => new Promise((resolve, reject) => bot.getAudioContext(voiceChannelID, (err, stream) => err ? reject(err) : resolve(stream)));

                if (!serverID) return msg(channelID, '`<sassy message about this command being server only>`');
                else if (!settings.servers[serverID].audio) settings.servers[serverID].audio = { que: [] };

                if (cmd === 'music') switch (args[0]) {
                    case 'cancel':
                        if (args[1]) {
                            args[1] = Number(args[1]) - 1;
                            if (typeof settings.servers[serverID].audio.que[args[1]] === 'object') {
                                if (settings.servers[serverID].audio.que[args[1]].request.id == userID) {
                                    settings.servers[serverID].audio.que.splice(args[1], 1);
                                    updateSettings();
                                    msg(channelID, 'Cancel succesful!');
                                } else msg(channelID, 'That\'s not yours!');
                            } else msg(channelID, 'Song doesn\'t exist!');
                        } else msg(channelID, 'Nothing could be cancelled!');
                        break;
                    case 'skip': case 'stop':
                        if (bot.servers[serverID].ccp) {
                            if (args[0] === 'stop') bot.servers[serverID].stopped = true;
                            bot.servers[serverID].ccp.kill();
                            msg(settings.servers[serverID].audio.channel || channelID, args[0] === 'skip' ? 'Skipped!' : 'Stopped!');
                        } else {
                            msg(settings.servers[serverID].audio.channel || channelID, `Failed to ${args[0]}.`);
                        }
                        break;
                    case 'list':
                        if (!pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                            return pc.missage(msg, channelID, ['Embed Links']);
                        let ale = {
                            title: 'No songs queued right now.',
                            fields: [],
                            color: serverID ? bot.servers[serverID].members[userID].color : color.default,
                        }

                        for (const song of settings.servers[serverID].audio.que) ale.fields.push({
                            name: ale.fields.length + 1 + ': ' + song.title,
                            value: `Requested by: <@${song.request.id}>\n${timeAt(findTimeZone(settings.tz, [userID, serverID]), new Date(song.request.time))}.`
                        });

                        if (ale.fields.length > 0) ale.title = 'Queued songs:';
                        if (bot.servers[serverID].playing) {
                            ale.title = 'Current song: ' + bot.servers[serverID].playing.title;
                            ale.description = `Requested by: <@${bot.servers[serverID].playing.request.id}>\n${timeAt(findTimeZone(settings.tz, [userID, serverID]), new Date(bot.servers[serverID].playing.request.time))}.`;
                            ale.thumbnail = { url: bot.servers[serverID].playing.thumbnail };

                            if (ale.fields.length > 0) ale.description += '\n\n**Queued songs:**';
                        }

                        msg(channelID, '', ale);
                        break;
                    case 'channel':
                        if (admin) {
                            args[1] = snowmaker(args[1]);
                            if (bot.channels[args[1]] && bot.channels[args[1]].type == 0 && bot.channels[args[1]].guild_id == serverID) {
                                if (!pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', args[1]))
                                    return pc.missage(msg, channelID, ['Embed Links']);
                                settings.servers[serverID].audio.channel = args[1];
                                updateSettings();
                                msg(channelID, 'Channel set!');
                            } else msg(channelID, 'Invalid channel!');
                        } else msg(channelID, 'Admin only command!');
                        break;
                    default:
                } else if (
                    !pc.userHasPerm(serverID, bot.id, 'TEXT_READ_MESSAGES', bot.servers[serverID].members[userID].voice_channel_id) ||
                    !pc.userHasPerm(serverID, bot.id, 'VOICE_CONNECT', bot.servers[serverID].members[userID].voice_channel_id) ||
                    !pc.userHasPerm(serverID, bot.id, 'VOICE_SPEAK', bot.servers[serverID].members[userID].voice_channel_id)
                ) {
                    pc.missage(msg, channelID, ['View Channel', 'Connect', 'Speak']);
                } else joinVoice()
                    .then(getStream)
                    .then(stream => new Promise((resolve, reject) => {
                        new Promise(resolveWithSong => {
                            if (evt.d.attachments.length === 1) resolveWithSong({
                                id: evt.d.attachments[0].id,
                                title: evt.d.attachments[0].filename,
                                description: 'File uploaded by ' + user,
                                thumbnail: `https://cdn.discordapp.com/avatars/${userID}/${bot.users[userID].avatar}.png`,
                                published: sfToDate(evt.d.attachments[0].id),
                                channel: {
                                    id: channelID,
                                    Title: bot.channels[channelID].name
                                },
                                request: {
                                    id: userID,
                                    time: Date.now()
                                },
                                url: evt.d.attachments[0].url
                            })
                            else if (args[0]) resolveWithSong(searchSong(args));
                            else resolve({ stream, action: 'next in queue' })

                        })
                            .then(queueSong)
                            .then(() => resolve({ stream, action: 'requested' }))
                            .catch(reject);
                    }))
                    .then(result => {
                        bot.servers[serverID].playing ? result.action = 'current' : playNext(result.stream);
                        if (settings.servers[serverID].audio.que.length > 0) msg(channelID, `Playing ${result.action}`);
                        else msg(channelID, 'No songs queued right now.');
                    })
                    .catch(err => err.type === 'msg' ? msg(channelID, '', { title: err.name, description: err.message, color: color.error }) : logger.error(err, ''));
                break;
            case 'bs':
                if (serverID &&
                    !pc.userHasPerm(serverID, bot.id, 'TEXT_MANAGE_MESSAGES', channelID) ||
                    !pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID) ||
                    !pc.userHasPerm(serverID, bot.id, 'TEXT_READ_MESSAGE_HISTORY', channelID) ||
                    !pc.userHasPerm(serverID, bot.id, 'TEXT_ADD_REACTIONS', channelID)
                ) return pc.missage(msg, channelID, ['Manage Messages', 'Embed Links', 'Read Message History', 'Add Reactions']);
                msg(channelID, '', {
                    title: 'Blue Squares: The Game',
                    color: serverID ? bot.servers[serverID].members[userID].color : color.default,
                    image: {}
                })
                break;
            case 'kps':
                let url = 'http://plssave.help/kps';

                if (!kps[userID]) {
                    kps[userID] = {};
                    kps[userID].gameActive = false;
                    kps[userID].mem = { player: { theme: 'defeault', selection: null, result: null }, opponent: null };
                    kps[userID].socket = io('http://plssave.help', { path: '/socket2' });

                    kps[userID].socket.on('connect', () => {
                        kps[userID].socket.emit('setName', `${bot.users[userID].username}#${bot.users[userID].discriminator}`);
                    });

                    kps[userID].socket.on('loginSucc', player => {
                        kps[userID].mem.player = player;
                    });

                    kps[userID].socket.on('loginFail', data => msg(userID, '', kpsEmbed(data, 0)));

                    kps[userID].socket.on('startGame', data => {
                        kps[userID].gameActive = true;
                        kps[userID].opponent = data;
                        msg(userID, '', kpsEmbed(data, 4));
                    });

                    kps[userID].socket.on('toMainMenu', data => {
                        kps[userID].gameActive = false;
                        msg(userID, '', kpsEmbed(data, 0));
                    });

                    kps[userID].socket.on('msgFromServer', data => msg(userID, '', kpsEmbed(data, 0)));

                    kps[userID].socket.on('result', (player, opponent) => {
                        kps[userID].mem.player = player;
                        kps[userID].mem.opponent = opponent;

                        msg(userID, '', kpsEmbed('Oppnent\'s choice', 5));
                    });
                }

                if (kps[userID].socket.connected) kpsEmit(args);
                else {
                    kps[userID].socket.on('connect', () => kpsEmit(args));

                    setTimeout(() => {
                        if (!kps[userID].socket.connected) msg(userID, 'Could not connect!');
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
                                msg(userID, 'This command is not available while in a game. Use `kps quit` to quit.');
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
                            msg(userID, '', kpsEmbed('Theme updated!', 3));
                            break;
                        case 'horror':
                            kps[userID].socket.emit('setTheme', data);
                            kps[userID].mem.player.theme = data;
                            msg(userID, '', kpsEmbed('Theme updated!', 3));
                            break;
                        case 'space':
                            kps[userID].socket.emit('setTheme', 'fuckrulla');
                            kps[userID].mem.player.theme = 'fuckrulla';
                            msg(userID, '', kpsEmbed('Theme updated!', 3));
                            break;
                        case 'hand':
                            kps[userID].socket.emit('setTheme', data);
                            kps[userID].mem.player.theme = data;
                            msg(userID, '', kpsEmbed('Theme updated!', 3));
                            break;
                        case 'quit':
                            msg(userID, '', kpsEmbed('You left.', 0));
                            kps[userID].socket.disconnect();
                            kps[userID] = null;
                            break;
                        default:
                            msg(userID, `Starting a game: \`play | ai | friend <friendname>\`\nChoosing: \`rock | paper | scissors\`\nTheme selection: \`classic | horror | space | hand\`\nTo quit: \`quit\`\nDon't forget the @${bot.username} kps!`);
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
                        embed.thumbnail = { url: `${url}/img/${player.theme}/${img}.png` };
                    }

                    /**
                     * @arg {Boolean} background
                     */
                    function addImage(background) {
                        if (background) {
                            embed.image = { url: `${url}/img/${player.theme}/background${player.theme === 'defeault' ? '' : 'new'}.${player.theme === 'horror' ? 'png' : 'jpg'}` };
                        } else {
                            embed.image = { url: `${url}/img/${player.theme}/${player.result}.png` };
                        }
                    }

                    function addScore() {
                        let emojis = ['✅', '⚠️', '💢']

                        emojis[0] = emojis[0].repeat(Math.round(player.points.wins / player.games * 15));
                        emojis[1] = emojis[1].repeat(Math.round(player.points.draws / player.games * 15));
                        emojis[2] = emojis[2].repeat(Math.round(player.points.losses / player.games * 15));

                        embed.fields.push({ name: 'Current score:', value: emojis.join('') });
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
                        msg(channelID, ile.join(userID));
                        break;
                    case 'leave':
                        msg(channelID, ile.leave(userID));
                        break;
                    case 'here':
                        msg(channelID, ile.attend(userID));
                        break;
                    case 'time':
                        let tzConv = ile.getCheckpoint().split(': ');
                        tzConv[1] = timeAt(findTimeZone(settings.tz, [userID, serverID]), new Date(tzConv[1]));
                        msg(channelID, tzConv.join(': '));
                        break;
                    default:
                        msg(channelID, `${ile.getAcronym()}: command structure: \`ile join | leave | here | time\`.`);
                        break;
                }
                break;
            case 'remind':
                if (args[0]) {
                    switch (args[0]) {
                        case 'list':
                            if (serverID && !pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                                return pc.missage(msg, channelID, ['Embed Links']);

                            let rle = {
                                title: 'List of your reminders',
                                color: serverID ? bot.servers[serverID].members[userID].color : color.default,
                                fields: []
                            };

                            settings.reminders.forEach((v, i, a) => {
                                if (typeof v == 'object' && v.creator.id == userID) {
                                    let target;
                                    if (bot.channels[v.channel]) {
                                        target = `<#${v.channel}> (${bot.servers[bot.channels[v.channel].guild_id].name})`;
                                    } else if (bot.directMessages[v.channel]) {
                                        target = `<@${bot.directMessages[v.channel].recipient.id}> (DM)`;
                                    } else if (bot.users[v.channel]) {
                                        target = `<@${v.channel}> (DM)`;
                                    } else {
                                        target = v.channel;
                                    }

                                    rle.fields.push({
                                        name: `Reminder #${i}`,
                                        value:
                                            `Time: ${timeAt(findTimeZone(settings.tz, [userID, serverID]), new Date(v.time))} \n` +
                                            `Channel: ${target} \n` +
                                            `${v.message ? `Message: ${v.message}` : ''}`
                                    });
                                }
                            });

                            msg(channelID, '', rle);
                            break;
                        case 'cancel':
                            if (typeof settings.reminders[args[1]] == 'object') {
                                if (settings.reminders[args[1]].creator.id == userID) {
                                    delete settings.reminders[args[1]];
                                    clearTimeout(reminderTimeouts[args[1]]);
                                    updateSettings();
                                    msg(channelID, 'Cancel succesful!');
                                } else msg(channelID, 'That\'s not yours!');
                            } else msg(channelID, 'Reminder doesn\'t exist!');
                            break;
                        default:
                            let reminder = {
                                mentions: '',
                                creator: {
                                    name: user,
                                    id: userID
                                },
                                color: serverID ? bot.servers[serverID].members[userID].color : color.default,
                                time: Date.now()
                            };

                            reminder.channel = snowmaker(args[0]);
                            if (
                                bot.users[reminder.channel] ||
                                bot.channels[reminder.channel]
                            ) args.shift();
                            else reminder.channel = channelID;

                            if (bot.channels[reminder.channel] && !pc.userHasPerm(bot.channels[reminder.channel].guild_id, bot.id, 'TEXT_EMBED_LINKS', reminder.channel))
                                return pc.missage(msg, channelID, ['Embed Links']);

                            reminder.time += anyTimeToMs(args[0]);
                            if (isNaN(reminder.time)) {
                                if (settings.tz[userID]) args[0] += settings.tz[userID];
                                else {
                                    if (serverID && settings.tz[serverID]) {
                                        args[0] += settings.tz[serverID];
                                        msg(channelID, `Using the server default UTC${settings.tz[serverID]} timezone. You can change your timezone with "\`@${bot.username} timezone\` -command".`);
                                    } else {
                                        args[0] += 'Z';
                                        msg(channelID, `Using the default UTC+00:00 timezone. You can change your timezone with "\`@${bot.username} timezone\` -command".`);
                                    }
                                }
                                reminder.time = datemaker([args[0]]);
                                if (reminder.time == 'Invalid Date') {
                                    msg(channelID, 'Time syntax: `([<amount>](ms|s|min|h|d|y))...` or `[<YYYY>-<MM>-<DD>T]<HH>:<MM>[:<SS>]`.');
                                    break;
                                } else reminder.time = reminder.time.getTime();
                            }

                            for (let i = 1; i < args.length; i++) {
                                if (!isNaN(anyTimeToMs(args[i]))) reminder.time += anyTimeToMs(args[i]);
                                else {
                                    args.splice(0, i);

                                    if (args.length > 0) reminder.message = args.join(' ');
                                    break;
                                }
                            }

                            for (const arg of args) {
                                if (arg === '@everyone' || arg === '@here') reminder.mentions += arg;
                                else {
                                    let role = snowmaker(arg);
                                    if (bot.channels[reminder.channel] && bot.servers[bot.channels[reminder.channel].guild_id].roles[role]) {
                                        reminder.mentions += `<@&${role}>`;
                                    } else if (serverID && bot.servers[serverID].roles[role]) {
                                        reminder.message = reminder.message.replace(arg, `@${bot.servers[serverID].roles[role].name}`);
                                    }
                                }
                            }

                            if (bot.channels[reminder.channel]) for (const mention of evt.d.mentions) {
                                if (mention.id != bot.id) reminder.mentions += `<@${mention.id}> `;
                            } else reminder.mentions = '';

                            settings.reminders.push(reminder);
                            updateSettings();
                            remindTimeout(reminder);

                            msg(channelID, 'I will remind when the time comes...');
                    }
                } else if (serverID && !pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID)) {
                    pc.missage(msg, channelID, ['Embed Links']);
                } else remindTimeout({
                    mentions: `<@${userID}>`,
                    creator: {
                        name: bot.username,
                        id: bot.id
                    },
                    color: serverID ? bot.servers[serverID].members[userID].color : color.default,
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
            case 'tz':
                if (isValidTimezone(args[0])) {
                    switch (args[1]) {
                        case 'server':
                            if (serverID && admin) {
                                settings.tz[serverID] = args[0];
                                updateSettings();
                                msg(channelID, `Server timezone is set to: UTC${args[0]}.`);
                            } else {
                                msg(channelID, 'Unauthorized timezoning command. Try to git gud instead.');
                            }
                            break;
                        default:
                            settings.tz[userID] = args[0];
                            updateSettings();
                            msg(channelID, `Your timezone is set to: UTC${args[0]}.`);
                    }
                } else msg(channelID, 'NA timezoning command. Try `+HH:MM` or `-HH:MM` instead.');
                break;
            case 'autoAnswer':
            case 'aa':
                if (serverID) {
                    if (settings.servers[serverID].disableAnswers) {
                        settings.servers[serverID].disableAnswers = false;
                        msg(channelID, 'Nothing can stop me now!');
                    } else {
                        settings.servers[serverID].disableAnswers = true;
                        msg(channelID, 'You weren\'t asking me? Well, ok then.');
                    }
                    updateSettings()
                } else msg(channelID, 'You can\'t escape me here!')
                break;
            case 'autoCompliment':
            case 'ac':
                if (!serverID) {
                    msg(channelID, '**Feature not intended to be used in DM. Sending sample:**');
                    args[0] = 'sample'
                }

                if (args[1]) args[1] = snowmaker(args[1]);

                switch (args[0]) {
                    case 'sample':
                        msg(channelID, `<@${userID}> ${objectLib.compliments[Math.floor(Math.random() * objectLib.compliments.length)]}`);
                        break;
                    case 'on':
                        if (admin) {
                            settings.servers[serverID].autoCompliment.enabled = true;
                            msg(channelID, 'Automatic complimenting turned ON.');
                        } else msg(channelID, 'Request denied, not admin!');
                        break;
                    case 'off':
                        if (admin) {
                            settings.servers[serverID].autoCompliment.enabled = false;
                            msg(channelID, 'Automatic complimenting turned OFF.');
                        } else msg(channelID, 'Request denied, not admin!');
                        break;
                    case 'list':
                        let list = []
                        settings.servers[serverID].autoCompliment.targets.forEach((v, i) => list[i] = `<@${v}>`)
                        msg(channelID, '', {
                            title: 'List of cool people:',
                            description: list.join('\n'),
                            color: bot.servers[serverID].members[userID].color
                        });
                        break;
                    case 'add':
                        if (args[1]) {
                            if (admin) {
                                if (settings.servers[serverID].autoCompliment.targets.indexOf(args[1]) == -1) {
                                    settings.servers[serverID].autoCompliment.targets.push(args[1]);
                                    msg(channelID, `User <@${args[1]}> is now cool.`);
                                } else {
                                    msg(channelID, `User <@${args[1]}> is already cool!`);
                                }
                            } else { msg(channelID, 'Request denied, not admin!'); }
                            break;
                        }
                    case 'remove':
                        if (args[1]) {
                            if (admin) {
                                if (settings.servers[serverID].autoCompliment.targets.indexOf(args[1]) != -1) {
                                    settings.servers[serverID].autoCompliment.targets.splice(settings.servers[serverID].autoCompliment.targets.indexOf(args[1]), 1);
                                    msg(channelID, `User <@${args[1]}> ain't cool no more!`);
                                } else {
                                    msg(channelID, `User <@${args[1]}> was never cool to begin with!`);
                                }
                            } else { msg(channelID, 'Request denied, not admin!'); }
                            break;
                        }
                    default:
                        msg(channelID, `Missing arguments. Usage: \`@${bot.username} autoCompliment sample | on | off | add <@mention> | remove <@mention> | list\`.`);
                        break;
                }
                updateSettings();
                break;
            case 'shit':
                if (!serverID) {
                    msg(channelID, 'no u');
                    emojiResponse('💩');
                    break;
                }

                if (admin) {
                    switch (args[0]) {
                        case 'set':
                            if (args[1]) {
                                args[1] = snowmaker(args[1]);
                                settings.servers[serverID].autoShit = args[1];
                                msg(channelID, `<@&${args[1]}> has been chosen to be shit.`);
                            } else {
                                msg(channelID, `*Set hit the fan.*`);
                            }
                            break;
                        case 'clean':
                            settings.servers[serverID].autoShit = null;
                            msg(channelID, `Shit has been cleaned up...`);
                            break;
                        default:
                            msg(channelID, `Missing arguments. Usage: \`@${bot.username} shit set <@role> | clean\`.`);
                            break;
                    }
                    updateSettings();
                } else msg(channelID, 'Request denied, not admin.');
                break;
            case 'color':
                if (serverID && !pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                    return pc.missage(msg, channelID, ['Embed Links']);

                new Promise((resolve, reject) => {
                    if (serverID && admin && args[0]) {
                        if (args[0][0] === '#') resolve(parseInt(args[0].substring(1), 16));
                        else if (!isNaN(args[0])) resolve(Number(args[0]));
                        else if (args[0] === 'default') resolve(null);
                        else reject({});
                    } else reject({});
                })
                    .then(color => {
                        settings.servers[serverID].color = color;
                        updateSettings();
                        msg(channelID, '', { title: 'Color changed!', color });
                    })
                    .catch(err => msg(channelID, '', {
                        title: err.name || 'Only color you will be seeing is red.',
                        description: err.message || 'This command is server only, admin only AND requires one argument which must be hex or decimal color code or "default".',
                        color: color.error
                    }));
                break;
            case 'effect':
                if (!serverID) return msg(channelID, 'I think that is a bad idea...');
                if (!admin) return msg(channelID, 'Request denied, not admin!');

                switch (args[0]) {
                    case 'rainbow':
                        if (!pc.userHasPerm(serverID, bot.id, 'GENERAL_MANAGE_ROLES'))
                            return pc.missage(msg, channelID, ['Manage Roles']);

                        if (settings.servers[serverID].effects.rainbow) {
                            settings.servers[serverID].effects.rainbow = false;
                            msg(channelID, 'Rainbow effect deactivated!');
                        } else {
                            settings.servers[serverID].effects.rainbow = true;
                            msg(channelID, 'Rainbow effect activated!');
                        }
                        break;
                    case 'shuffle':
                        if (!pc.userHasPerm(serverID, bot.id, 'GENERAL_CHANGE_NICKNAME'))
                            return pc.missage(msg, channelID, ['Change Nickname']);

                        if (settings.servers[serverID].effects.shuffle) {
                            settings.servers[serverID].effects.shuffle = false;
                            msg(channelID, 'Shuffle effect deactivated!');
                        } else {
                            settings.servers[serverID].effects.shuffle = true;
                            msg(channelID, 'Shuffle effect activated!');
                        }
                        break;
                    default:
                        msg(channelID, 'Shuffle or rainbow?');
                        break;
                }
                updateSettings();
                break;
            case 'handle':
                if (!serverID) return msg(channelID, 'Fun fact: YOU CAN\'T HAVE NICKNAMES IN DM!!!');

                if (admin) {
                    if (!pc.userHasPerm(serverID, bot.id, 'GENERAL_CHANGE_NICKNAME'))
                        return pc.missage(msg, channelID, ['Change Nickname']);

                    if (args[0]) {
                        msg(channelID, `I will now be known as "${args[0]}"!`);
                    } else {
                        args[0] = null;
                        msg(channelID, 'Nickname reset.');
                    }

                    settings.servers[serverID].nick = args[0];
                    updateSettings();
                    editNick(serverID, args[0]);
                } else msg(channelID, 'Request denied, not admin!');
                break;
            default:
                if (message.indexOf('?') != -1 && (!serverID || !settings.servers[serverID].disableAnswers)) {
                    msg(channelID, objectLib.answers[Math.floor(Math.random() * objectLib.answers.length)]);
                } else {
                    msg(channelID, objectLib.defaultRes[Math.floor(Math.random() * objectLib.defaultRes.length)]);
                }
                break;
        }
        timeOf.lastCommand = Date.now();
    } else {
        // Messages without commands
        if (serverID && settings.servers[serverID].autoCompliment.targets.indexOf(userID) != -1 && settings.servers[serverID].autoCompliment.enabled == true) {
            msg(channelID, `<@${userID}> ${objectLib.compliments[Math.floor(Math.random() * objectLib.compliments.length)]}`);
        }

        const mentionedChannels = [];
        for (const word of message.split(' ')) {
            const mChannel = snowmaker(word);
            if (
                bot.channels[mChannel] &&
                channelID != mChannel &&
                mentionedChannels.indexOf(mChannel) < 0
            ) mentionedChannels.push(mChannel);
        }

        for (const channel of mentionedChannels) {
            if (bot.channels[channel] && !pc.userHasPerm(bot.channels[channel].guild_id, bot.id, 'TEXT_EMBED_LINKS', channel))
                pc.missage(msg, channel, ['Embed Links']);
            else {
                const me = {
                    title: `#${bot.channels[channelID].name} (${bot.servers[serverID].name})`,
                    description: `*Latest messages:*`,
                    color: serverID ? bot.servers[serverID].members[userID].color : color.default,
                    thumbnail: {},
                    image: {},
                    fields: []
                };

                bot.getMessages({ channelID, limit: 5 }, (err, msgList) => {
                    if (err) logger.error(err, '');
                    else for (const m of msgList) {
                        let extra = '';
                        if (!me.image.url) for (const ext of ['.gif', '.jpg', '.jpeg', '.png']) {
                            if (m.attachments[0] && m.attachments[0].url.indexOf(ext) > -1) {
                                me.image.url = m.attachments[0].url;
                                extra = ' (image below)';
                            } else for (const url of m.content.split(' ')) if (url.indexOf(ext) > -1 && isUrl(url)) {
                                me.image.url = url;
                                extra = ' (image below)';
                            }
                        }

                        me.fields.push({
                            name: m.author.username + extra,
                            value: m.content || '`<attachment>`'
                        });
                    }
                    me.fields.reverse();
                    msg(channel, 'This channel was mentioned on another channel.', me);
                });
            }
        }
    }

    // All messages
    if (serverID && typeof settings.servers[serverID].autoShit == 'string' && bot.servers[serverID].members[userID].roles.indexOf(settings.servers[serverID].autoShit) != -1) emojiResponse('💩');

    if (userID == bot.id && evt.d.embeds[0]) {
        if (evt.d.embeds[0].footer && evt.d.embeds[0].footer.text == 'Vote generated by your\'s truly.') {
            evt.d.embeds[0].fields.forEach((v, i) => {
                if (v.value.substring(v.value.length - 1) == '>') v.value = v.value.substring(0, v.value.length - 1);
                setTimeout(() => emojiResponse(v.value), i * 500);
            });

            bot.pinMessage({
                channelID: channelID,
                messageID: evt.d.id
            }, err => { if (err) logger.error(err, ''); });
        }

        if (evt.d.embeds[0].title == 'Blue Squares: The Game') {
            ['🔼', '▶', '🔽', '◀', '❌']
                .forEach((v, i) => setTimeout(() => emojiResponse(v), i * 500));
        }
    }

    /**
     * @arg {String} emoji
     */
    function emojiResponse(emoji) {
        bot.addReaction({
            channelID: channelID,
            messageID: evt.d.id,
            reaction: emoji
        }, err => { if (err) logger.error(err, ''); });
    }
});

bot.on('disconnect', (err, code) => {
    online = false;
    logger.warn(`Disconnected! error: ${err}, code: ${code} (uptime: ${uptimeToString(calculateUptime(timeOf.connection))}).`);
    setTimeout(() => {
        logger.info('Trying to reconnect...');
        bot.connect();
    }, 5000);
});

// Special events
bot.on('any', evt => {
    // Blue Squares game movement
    if (evt.t === 'MESSAGE_REACTION_ADD' && evt.d.user_id != bot.id) bot.getMessage({
        channelID: evt.d.channel_id,
        messageID: evt.d.message_id
    }, (err, message) => {
        if (err) logger.error(err, '');
        else if (message.embeds[0] && message.embeds[0].title == 'Blue Squares: The Game') {
            if (bsga.players[evt.d.user_id]) bsga.players[evt.d.user_id].online = true;
            else bsga.players[evt.d.user_id] = new bs.Player(evt.d.user_id, bot.users[evt.d.user_id].username);
            switch (evt.d.emoji.name) {
                case '🔼': bsga.players[evt.d.user_id].move('up');        break;
                case '▶': bsga.players[evt.d.user_id].move('right');     break;
                case '🔽': bsga.players[evt.d.user_id].move('down');      break;
                case '◀': bsga.players[evt.d.user_id].move('left');      break;
                case '❌': bsga.players[evt.d.user_id].online = false;   break;
            }

            web.addTemp('bsga-image.png', bsga.update().toBuffer())
                .then(file => new Promise((resolve, reject) => {
                    const bse = message.embeds[0];

                    bsga.extra = bsga.extra === 'a' ? 'b' : 'a';
                    bse.image = {
                        url: settings.url + '/temp/bsga-image.png' + `?${bsga.extra}=${Math.random()}`
                    };

                    bot.editMessage({
                        channelID: evt.d.channel_id,
                        messageID: evt.d.message_id,
                        message: '',
                        embed: bse
                    }, (err, res) => {
                        if (err) reject(err);

                        bot.removeReaction({
                            channelID: evt.d.channel_id,
                            messageID: evt.d.message_id,
                            userID: evt.d.user_id,
                            reaction: evt.d.emoji.name
                        }, (err, res) => err ? reject(err) : resolve(res));
                    });
                }))
                .catch(err => logger.error(err, ''));
        }
    });
});

/**
 * @arg {Snowflake} channel
 * @arg {String} msg
 * @arg {Embed} [embed]
 */
function msg(channel, msg, embed) {
    bot.sendMessage({
        to: channel,
        message: msg,
        embed: embed
    }, err => { if (err) logger.error(err, ''); });
}

function updateHelp() {
    objectLib.help.thumbnail.url = `https://cdn.discordapp.com/avatars/${bot.id}/${bot.users[bot.id].avatar}.png`;
    for (const field of objectLib.help.fields) {
        field.name = field.name.replace('GerpBot', bot.username);
        field.value = field.value.replace('GerpBot', bot.username);
    }
}

function startLoops() {
    setInterval(() => bot.setPresence({
        game: {
            name: objectLib.games[Math.floor(Math.random() * objectLib.games.length)],
            type: 0
        }
    }), 60000);

    let colors = ['#ff0000', '#ff6a00', '#ffff00', '#00ff00', '#0000ff', '#ff00ff'];
    let i = 0;
    setInterval(() => {
        if (online) {
            if (i >= colors.length) i = 0;

            for (const server in settings.servers) if (bot.servers[server]) {
                if (settings.servers[server].effects.rainbow) {
                    editColor(server, colors[i]);
                } else if (
                    settings.servers[server].roleID &&
                    bot.servers[server].roles[settings.servers[server].roleID].color !=
                    (settings.servers[server].color || color.default)
                ) editColor(server, '#' + (settings.servers[server].color || color.default).toString(16));

                if (settings.servers[server].effects.shuffle) {
                    let newName = settings.servers[server].nick.split('');
                    newName.forEach((v, i, a) => {
                        random = Math.floor(Math.random() * a.length);
                        let help = a[random];
                        a[random] = v;
                        a[i] = help;
                    });
                    editNick(server, newName.join(''));
                } else if (bot.servers[server].members[bot.id].nick && bot.servers[server].members[bot.id].nick != settings.servers[server].nick) editNick(server, settings.servers[server].nick);
            }
            i++;
        }
    }, 2000);
}

function startIle() {
    if (!ile.started) {
        ile.start();
        ile.on('msg', (channel, message, embed) => {
            let tzConv = message.split(': ');
            if (tzConv[0] === 'Next checkpoint') {
                tzConv[1] = timeAt(findTimeZone(settings.tz, [channel]), new Date(tzConv[1]));
                message = tzConv.join(': ');
            }

            if (embed) for (const field of embed.fields) {
                let id = field.name.substring(field.name.indexOf('.') + 2);
                field.name = field.name.replace(id, bot.users[id].username);
            } else {
                embed = {
                    title: ile.getAcronym(),
                    description: message
                };
                message = '';
            }
            embed.color = color.default;

            msg(channel, message, embed);
        });
        ile.on('save', data => {
            fs.writeFile('ile.json', JSON.stringify(data, null, 4), err => {
                if (err) logger.error(err, '');
            });
        });
    }
}

function startReminding() {
    if (!startedOnce) if (settings.reminders) {
        for (let v, i = settings.reminders.length - 1; i >= 0; i--) {
            v = settings.reminders[i];
            if (v == null) settings.reminders.splice(i, 1);
            else remindTimeout(v, i);
        }
        updateSettings();
    } else settings.reminders = [];
}

/**
 * @arg {Object} reminder
 * @arg {String} reminder.mentions
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

        msg(reminder.channel, reminder.mentions, re);
    }, reminder.time - Date.now());
}

/**
 * @arg {Snowflake} channel
 * @return {Snowflake[] | String}
 */
function membersInChannel(channel) {
    channel = snowmaker(channel);
    if (!bot.channels[channel]) return 'Channel not found!';
    let members = [], serverID = bot.channels[channel].guild_id;
    for (const user in bot.servers[serverID].members) if (pc.userHasPerm(serverID, user, 'TEXT_READ_MESSAGES', channel)) members.push(user);
    return members;
}

/**
 * @arg {Snowflake} serverID
 * @arg {Number|String} color
 */
function editColor(serverID, color) {
    bot.editRole({
        serverID,
        roleID: settings.servers[serverID].roleID,
        color: color
    }, err => { if (err) logger.error(err, ''); });
}

/**
 * @arg {Snowflake} serverID
 * @arg {String} newName
 */
function editNick(serverID, newName) {
    bot.editNickname({
        serverID,
        userID: bot.id,
        nick: newName
    }, err => { if (err) logger.error(err, ''); });
}

/**
 * @arg {String|String[]} file
 * @arg {String} [location]
 * @returns {Object}
 */
function getJSON(file, location = '') {
    const tempObj = {};
    let fullPath;

    if (typeof file === 'string') {
        fullPath = path.join(__dirname, location, file);
        if (fs.existsSync(fullPath + '.json')) return require(fullPath);
    }

    if (typeof file === 'object') for (const key of file) {
        fullPath = path.join(__dirname, location, key);
        if (fs.existsSync(fullPath + '.json')) tempObj[key] = require(fullPath);
    }
    return tempObj;
}

function updateSettings() {
    if (!config.saveSettings) return;
    json = JSON.stringify(settings, null, 4);
    if (json) fs.writeFile('settings.json', json, err => {
        if (err) logger.error(err, '');
        else try {
            require('./settings');
        }
        catch (err) {
            logger.warn(err, '');
            logger.warn('Updated settings.json was corrupted during update, updating again in 5 seconds.');
            setTimeout(updateSettings, 5000);
        }
    });
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
