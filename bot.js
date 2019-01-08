const
    // common
    {
        config,
        logger,
        Embed,
        colors,
    } = common = require('./scripts/common.js'),
    // node_modules
    Discord = require('discord.io'),
    fs = require('fs'),
    path = require('path'),
    io = require('socket.io-client'),
    isUrl = require('is-url'),
    { Uptime } = st = require('snowtime'),
    // scripts
    web = require('./scripts/web.js'),
    bs = config.canvasEnabled ? require('./scripts/bs.js') : null,
    GitHub = require('./scripts/github.js'),
    Ile = require('./scripts/ile.js'),
    Osu = require('./scripts/osu.js'),
    MusicHandler = require('./scripts/music.js'),
    permCheck = require('./scripts/permCheck.js'),
    // load objectLib
    objectLib = getJSON([
        'help', 'compliments', 'defaultRes', 'games', 'answers', 'ileAcronym'
    ], 'objectLib'),
    // constant variables
    Reminder = getReminderClass(),
    bot = new Discord.Client({ token: config.auth.token, autorun: true }),
    github = new GitHub(),
    ile = new Ile(getJSON('ile'), objectLib.ileAcronym),
    osu = new Osu(config.auth.osu),
    mh = new MusicHandler(bot, config.auth.tubeKey);
    bsga = config.canvasEnabled ? new bs.GameArea() : null,
    kps = {},
    timeOf = {
        startUp: Date.now()
    },
    // funky function stuff
    pc = permCheck(bot);

let
    // other variables
    startedOnce = false,
    online = false,
    settings = getJSON('settings');

if (!settings.servers) settings.servers = {};
if (!settings.tz) settings.tz = {};
if (!settings.reminders) settings.reminders = {};

settings.update = updateSettings;
common.settings = settings;

bot.getColor = getColor;
bot.pending = {};

startLoops();
updateColors();

if (config.web) web.activate.then(logger.info);

bot.on('ready', evt => {
    timeOf.connection = Date.now();

    updateObjectLib();
    startIle();
    startReminding();
    updateSettings();

    logger.info(startedOnce ? 'Reconnection successful!' : `${ bot.username } (user ${ bot.id }) ready for world domination!`);

    online = true;
    startedOnce = true;
});

bot.on('message', (user, userID, channelID, message, evt) => {
    let serverID, args = message.split(' '), fileReact = false;

    if (bot.channels[channelID]) serverID = bot.channels[channelID].guild_id;
    else if (!bot.directMessages[channelID]) return;

    if (!bot.pending[channelID]) bot.pending[channelID] = [];
    if (userID === bot.id && bot.pending[channelID].length > 0) {
        let pi = bot.pending[channelID].splice(0, 1)[0], string, embed;

        if (typeof pi === 'string') string = pi;
        else if (pi instanceof Embed) embed = pi;
        else if (pi instanceof Array) {
            string = pi[0];
            embed = pi[1];
        }
        msg(channelID, string, embed instanceof Embed && embed.errorIfInvalid());
    }

    if (evt.d.attachments.length > 0) for (file of evt.d.attachments) {
        // Messages with attachments
        const ext = file.url.substring(file.url.length - file.url.split('').reverse().join('').indexOf('.') - 1).toLowerCase();
        fileReact = true;
        switch (ext) {
            case '.osr':
                if (serverID && !pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                    return pc.missage(msg, channelID, ['Embed Links']);
                osu.readReplay(file.url).then(perf => osu.singlePlayEmbed(perf)).then(result => {
                    result.re.description = result.re.description.replace('<date>',
                        st.timeAt(st.findTimeZone(settings.tz, [userID, serverID]), new Date(result.date))
                    );
                    msg(channelID, userID == bot.id ? '' : 'osu! replay information:', result.re.errorIfInvalid());
                }).catch(err => msg(channelID, '', new Embed().error(err)));
                break;
            default: fileReact = true;
        }
    }

    if ((!serverID || st.stripNaNs(args[0]) == bot.id) && !bot.users[userID].bot) {
        // Messages with commands

        if (st.stripNaNs(args[0]) == bot.id) args.shift();
        const
            cmd = args.shift(),
            admin = serverID && pc.userHasPerm(serverID, userID, 'GENERAL_ADMINISTRATOR');

        switch (cmd) {
            case 'help':
                if (serverID && !pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                    return pc.missage(msg, channelID, ['Embed Links']);
                const help = new Embed((args[0] && objectLib.help[args[0]]) || objectLib.help.main);
                help.color = getColor(serverID, userID);
                if (!help.thumbnail.url) help.thumbnail.url = avatarUrl(bot);
                if (!help.image.url) help.image.url = `https://img.shields.io/badge/bot-${ bot.username.replace(' ', '_') }-${ help.color.toString(16).padStart(6, '0') }.png`;
                help.isValid();
                msg(channelID, '', help.pushToIfMulti(bot.pending[channelID]).errorIfInvalid());
                break;
            case 'server':
                if (!serverID) return msg(channelID, 'This is a private conversation!');
                if (!pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                    return pc.missage(msg, channelID, ['Embed Links']);

                const si = {
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
                    }
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

                const ie = new Embed(
                    `Information about "${ bot.servers[serverID].name }"`,
                    `**Created by:** <@${ bot.servers[serverID].owner_id }>\n` +
                    `**Creation date:** \`${ st.timeAt(st.findTimeZone(settings.tz, [userID, serverID]), st.sfToDate(serverID)) }\`\n` +
                    `**Age:** \`${ new Uptime(st.sfToDate(serverID)).toString() }\``,
                    {
                        color: getColor(serverID, userID),
                        timestamp: bot.servers[serverID].joined_at,
                        footer: {
                            icon_url: avatarUrl(bot),
                            text: `${ settings.servers[serverID].nick != null ? settings.servers[serverID].nick : bot.username } joined this server on`
                        },
                        thumbnail: {
                            url: `https://cdn.discordapp.com/icons/${ serverID }/${ bot.servers[serverID].icon }.png`
                        },
                    }
                );

                ie.addField(
                    'Members:',
                    `✅ Online: ${ si.members.online }\n💤 Idle: ${ si.members.idle }\n⛔ Do not disturb: ${ si.members.dnd }\n⚫ Offline: ${ si.members.offline }`,
                    true
                ).addField(
                    'Channels:',
                    `💬 Text: ${ si.channels[0] }\n🎙️ Voice: ${ si.channels[2] }\n📁 Category: ${ si.channels[4] }`,
                    true
                ).addField(
                    'More stuff:',
                    `Roles: ${ Object.keys(bot.servers[serverID].roles).length }, Emojis: ${ Object.keys(bot.servers[serverID].emojis).length }/50, Bots: ${ si.members.bots }`,
                    true
                )

                if (settings.tz[serverID]) ie.addDesc(`\n**Server time:** \`${ st.timeAt(settings.tz[serverID]) }\``);

                msg(channelID, 'Here you go:', ie.errorIfInvalid());
                break;
            case 'channel':
                if (serverID && !pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                    return pc.missage(msg, channelID, ['Embed Links']);

                if (args[0]) {
                    args[0] = st.stripNaNs(args[0]);
                    if (!bot.channels[args[0]]) return msg(channelID, 'Channel not found!');
                }

                const ci = {
                    id: args[0] || channelID,
                };

                if (bot.channels[ci.id]) ci.serverID = bot.channels[ci.id].guild_id;

                const ce = new Embed(
                    `Information about "${ ci.serverID ? '#' + bot.channels[ci.id].name : `@${ bot.username }" (DM channel)` }`,
                    { color: getColor(serverID, userID) }
                );

                if (ci.serverID) {
                    if (bot.channels[ci.id].topic) ce.addDesc(`**Topic:** ${ bot.channels[ci.id].topic }\n`);
                    ce.addDesc(`**Server:** ${ bot.servers[ci.serverID].name }\n`);
                    if (bot.channels[ci.id].parent_id) ce.addDesc(`**Channel group:** ${ bot.channels[bot.channels[ci.id].parent_id].name.toUpperCase() }\n`);
                } else ce.thumbnail.url = avatarUrl(bot);

                ce.addDesc(`**Channel created:** \`${ st.timeAt(st.findTimeZone(settings.tz, [userID, serverID]), st.sfToDate(ci.id)) }\`\n`);
                ce.addDesc(`**Age:** \`${ new Uptime(st.sfToDate(ci.id)).toString() }\`\n`);

                if (ci.serverID && bot.channels[ci.id].nsfw) ce.addDesc(`*Speaking of age, this channel is marked as NSFW, you have been warned.*\n`);

                ce.addDesc('**Members:** ');
                if (
                    !ci.serverID ||
                    Object.keys(bot.channels[ci.id].permissions.user).length > 0 ||
                    Object.keys(bot.channels[ci.id].permissions.role).length > 0
                ) {
                    ci.members = membersInChannel(ci.id);

                    if (!ci.serverID || ci.members.length !== Object.keys(bot.servers[ci.serverID].members).length)
                        for (const user of ci.members) ce.addDesc(`<@${ user }>`);
                    else ce.addDesc(' @everyone');
                } else ce.addDesc(' @everyone');

                ce.addDesc('\n');

                msg(channelID, 'channel info', ce.errorIfInvalid());
                break;
            case 'user':
                if (serverID && !pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                    return pc.missage(msg, channelID, ['Embed Links']);
                if (args[0]) {
                    args[0] = st.stripNaNs(args[0]);

                    if (!bot.users[args[0]]) {
                        msg(channelID, 'User not found!');
                        break;
                    }

                    const ui = {
                        id: args[0],
                        roles: []
                    };

                    ui.color = getColor(serverID, ui.id, false);

                    const ue = new Embed(
                        `Information about "${ bot.users[ui.id].username }#${ bot.users[ui.id].discriminator }"`,
                        `**Also known as:** "<@${ ui.id }>"\n` +
                        `**User created:** \`${ st.timeAt(st.findTimeZone(settings.tz, [userID, serverID]), st.sfToDate(ui.id)) }\`\n` +
                        `**Age:** \`${ new Uptime(st.sfToDate(ui.id)).toString() }\``,
                        {
                            color: ui.color,
                            thumbnail: {
                                url: avatarUrl(bot.users[ui.id])
                            },
                            image: {
                                url: encodeURI(`https://img.shields.io/badge/${ bot.users[ui.id].bot ? 'bot' : 'user' }-${ bot.users[ui.id].username }-${ ui.color.toString(16).padStart(6, '0') }.png`)
                            }
                        }
                    );

                    if (settings.tz[ui.id]) ue.addDesc(`\n**Local time:** \`${ st.timeAt(settings.tz[ui.id]) }\``);

                    let cleanRoll = [], status = '';
                    if (serverID) {
                        ue.timestamp = new Date(bot.servers[serverID].members[ui.id].joined_at);
                        ue.footer = {
                            icon_url: `https://cdn.discordapp.com/icons/${ serverID }/${ bot.servers[serverID].icon }.png`,
                            text: `${ bot.users[ui.id].username } joined this server on`
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
                        ue.addDesc(`\n**Status:** ${ status }`);

                        if (ui.roles.length > 0) ue.addDesc('\n**Roles:** ');
                        for (const role of ui.roles) ue.addDesc(` ${ role }`);
                    };

                    msg(channelID, 'High quality spying:', ue.errorIfInvalid());
                } else msg(channelID, 'I would give you the info you seek, but it is clear you don\'t even know what you want');
                break;
            case 'role':
                if (!serverID) return msg(channelID, 'Please wait a moment. Let me just check that role in this PM.');
                if (!pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                    return pc.missage(msg, channelID, ['Embed Links']);

                if (args[0]) {
                    args[0] = st.stripNaNs(args[0]);
                    let role = bot.servers[serverID].roles[args[0]];

                    if (!role) {
                        msg(channelID, 'Role not found!');
                        break;
                    }

                    const re = new Embed(
                        `Information about "${ role.name }"`,
                        `<@&${ role.id }>\n` +
                        `**Role created:** \`${ st.timeAt(st.findTimeZone(settings.tz, [userID, serverID]), st.sfToDate(role.id)) }\`\n` +
                        `**Age:** ${ new Uptime(st.sfToDate(role.id)) }\``,
                        { color: role.color }
                    );

                    let rollMembers = [];
                    for (const user in bot.servers[serverID].members)
                        if (bot.servers[serverID].members[user].roles.indexOf(role.id) != -1) rollMembers.push(user);

                    for (const user of rollMembers) re.addDesc(`\n<@${ user }>`);

                    msg(channelID, 'Here is the gang:', re.errorIfInvalid());
                } else msg(channelID, 'What is that supposed to be? It is called "role" not "roll"!');
                break;
            case 'changes':
                args.splice(1);
            case 'releases':
                if (serverID && !pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                    return pc.missage(msg, channelID, ['Embed Links']);

                const repo = {},
                    color = getColor(serverID, cmd === 'changes' ? '' : userID);
                let max = Infinity;

                switch (args.length) {
                    case 1:
                        max = args[0];
                    case 0:
                        if (common.pkg.repository && common.pkg.repository.url) {
                            const urlray = common.pkg.repository.url.split('/')
                            repo.host = urlray[2];
                            if (repo.host === 'github.com') {
                                repo.owner = urlray[3]
                                repo.name = urlray[4].slice(0, urlray[4].indexOf('.git'))
                            }
                        }
                        break;
                    case 3:
                        max = args[2];
                    case 2:
                        repo.owner = args[0];
                        repo.name = args[1];
                        break;
                    default: return msg(channelID, '', new Embed('Too many arguments!').error());
                }

                if (isNaN(max) || max < 1) return msg(channelID, '', new Embed('Release amount must be a number largen than 0!').error());

                github.getReleases(repo.owner, repo.name)
                    .then(data => {
                        if (data.message === 'Not Found') return msg(channelID, '', new Embed('Repository not found!').error());
                        if (data.length < 1) return msg(channelID, '', new Embed('No releases available.').error())

                        const titleEmbed = new Embed(`Releases for ${ data[0].html_url.split('/')[3] }/${ data[0].html_url.split('/')[4] }`, { color })
                        if (args.length < 2) bot.pending[channelID].push(titleEmbed);

                        for (let i = 0; i < data.length && i < max; i++)
                            bot.pending[channelID].push(new Embed(data[i].name, data[i].body, {
                                color,
                                timestamp: data[i].published_at,
                                author: {
                                    name: data[i].tag_name,
                                    url: data[i].html_url

                                },
                                footer: {
                                    text: 'Published by ' + data[i].author.login,
                                    icon_url: data[i].author.avatar_url
                                }
                            }));

                        if (args.length < 2) msg(channelID, '', new Embed('Current version: ' + common.pkg.version, { color }));
                        else msg(channelID, '', titleEmbed);
                    })
                    .catch(err => msg(channelID, '', new Embed().error(err)));
                break;
            case 'osu':
                if (serverID && !pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                    return pc.missage(msg, channelID, ['Embed Links']);
                if (!config.auth.osu) return msg(channelID, 'osu! API key not found!');

                switch (args.length) {
                    case 0:
                        msg(channelID, 'Please enter username or user ID');
                        break;
                    case 1:
                        osu.getUser(args[0])
                            .then(embed => msg(channelID, '', embed))
                            .catch(err => logger.error(err, ''));
                        break;
                    case 2:
                        if (serverID && !pc.userHasPerm(serverID, bot.id, 'TEXT_ATTACH_FILES', channelID))
                            return pc.missage(msg, channelID, ['Attach Files']);
                        osu.getBestReplay(...args)
                            .then(file => bot.uploadFile({
                                to: channelID,
                                file: file.toBuffer(),
                                filename: `replay-osu_${ args[0] }.osr`,
                                message: 'Here is some top play action!'
                            }, (err, res) => {
                                if (err) return Promise.reject(err);
                            }))
                            .catch(err => msg(channelID, '', new Embed().error(err)));
                    default:

                }
                break;
            case 'raffle':
                if (!serverID && !bot.channels[st.stripNaNs(args[0])]) {
                    msg(channelID, 'When you really think about it, how would that even work?');
                    break;
                }
                if (!pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                    return pc.missage(msg, channelID, ['Embed Links']);
                let target = args[0], raffleList = [], winnerAmt = args[1];
                if (!target) target = 'everyone';

                switch (target) {
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
                        target = st.stripNaNs(target);

                        if (serverID && bot.servers[serverID].roles[target]) {
                            for (const member in bot.servers[serverID].members) {
                                if (bot.servers[serverID].members[member].roles.indexOf(bot.servers[serverID].roles[target].id) != -1) raffleList.push(member);
                            }
                        } else if (bot.channels[target]) {
                            raffleList = membersInChannel(target);
                        } else {
                            msg(channelID, 'Role or channel not found!');
                            return;
                        }
                }

                if (winnerAmt && !isNaN(winnerAmt));
                else winnerAmt = 1;

                let winners = [];
                for (let i = 0; i < winnerAmt; i++)
                    winners = winners.concat(raffleList.splice(Math.floor(Math.random() * raffleList.length), 1));

                const re = new Embed('Winners', { color: getColor(serverID, userID) });

                if (bot.channels[target] && (!serverID || bot.channels[target].guild_id != serverID))
                    for (const winner of winners) re.addDesc(`\n${ bot.users[winner].username }`);
                else
                    for (const winner of winners) re.addDesc(`\n<@${ winner }>`);

                if (winners.length === 1) {
                    re.title = 'Winner';
                    re.color = getColor(bot.channels[target] ? bot.channels[target].guild_id : channelID, winners[0], false);
                    re.thumbnail.url = avatarUrl(bot.users[winners[0]])
                }

                msg(channelID, '', re);
                break;
            case 'ping':
                msg(channelID, 'Pong!');
                break;
            case 'pi':
                msg(channelID, `Here it is: \`${ Math.PI }...\``);
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
                    const uptime = new Uptime(timeOf[args[0]]);
                    msg(channelID, `Time since '${ args[0] }': ${ uptime.toString() }\``
                    );
                } else {
                    msg(channelID, `Missing arguments. Usage: \`@${ bot.username } uptime startUp | connection | lastCommand\`.`);
                }
                break;
            case 'ask':
                if (args[0]) msg(channelID, objectLib.answers[Math.floor(Math.random() * objectLib.answers.length)]);
                else msg(channelID, 'You didn\'t ask anything...');
                break;
            case 'vote':
                Promise.resolve(serverID ? pc.multiPerm(serverID, bot.id, [
                    'TEXT_MANAGE_MESSAGES',
                    'TEXT_EMBED_LINKS',
                    'TEXT_READ_MESSAGE_HISTORY',
                    'TEXT_ADD_REACTIONS'
                ], channelID) : '').then(() => {
                    const options = [], ve = new Embed({
                        color: getColor(serverID, userID),
                        footer: { text: 'Vote generated by your\'s truly.' }
                    });

                    switch (args[0]) {
                        case 'gold':
                            const goldUser = st.stripNaNs(args[1]);
                            ve.description = `**Let's vote for ${ args[1] }'s next golden gun!**`;
                            ve.color = getColor(serverID, goldUser);
                            if (bot.users[goldUser]) ve.thumbnail.url =
                                avatarUrl(bot.users[goldUser]);

                            options.push(...args.splice(2));

                            break;
                        default:
                            ve.description = '**Let\'s do a vote!**';
                            options.push(...args.splice(0));
                    }

                    ve.addDesc(`\n*requested by:\n<@${ userID }>*`);

                    if (options.length < 1) return msg(channelID, `Options were not included! Example: \`@${ bot.username } vote :thinking:=genius\`.`);

                    for (const option of options) {
                        const p = option.split('=');

                        if (p[0] != '') {
                            if (p[1]) ve.addField(
                                `Vote for ${ p[1] } with:`,
                                `${ p[0] }`,
                                true
                            );
                            else ve.addField(
                                `Vote with:`,
                                `${ p[0] }`,
                                true
                            );
                        } else return msg(channelID, `Some options not defined! Example: \`@${ bot.username } vote :thinking:=genius\`.`);
                    }

                    msg(channelID, '@everyone', ve.errorIfInvalid());
                }, missing => pc.missage(msg, channelID, missing)).catch(err => logger.error(err, ''));
                break;
            case 'music':
            case 'play':
                if (!serverID) return msg(channelID, '`<sassy message about this command being server only>`');
                mh.addServer(serverID);
                mh.servers[serverID].temp = channelID;

                if (cmd === 'music') switch (args[0]) {
                    case 'cancel':
                        if (args[1]) {
                            const index = Number(args[1]) - 1;
                            if (mh.servers[serverID].queue[index]) {
                                if (mh.servers[serverID].queue[index].request.id == userID) {
                                    mh.servers[serverID].queue.splice(index, 1);
                                    updateSettings();
                                    msg(channelID, 'Cancel successful!');
                                } else msg(channelID, 'That\'s not yours!');
                            } else msg(channelID, 'Song doesn\'t exist!');
                        } else msg(channelID, 'Nothing could be cancelled!');
                        break;
                    case 'skip':
                    case 'stop':
                        mh.servers[serverID].controls(args[0]).then(res => {
                            if (res) msg(channelID, res);
                        });
                        break;
                    case 'list':
                        if (!pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                            return pc.missage(msg, channelID, ['Embed Links']);
                        const qe = mh.servers[serverID].queueEmbed(userID);
                        qe.isValid();
                        msg(channelID, '', qe.pushToIfMulti(bot.pending[channelID]).errorIfInvalid());
                        break;
                    case 'channel':
                        const acID = st.stripNaNs(args[1]);
                        if (admin && bot.channels[acID] && bot.channels[acID].type == 0 && bot.channels[acID].guild_id == serverID) {
                            if (!pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', acID))
                                return pc.missage(msg, channelID, ['Embed Links']);
                            settings.servers[serverID].audio.channel = mh.servers[serverID].acID = acID;
                            updateSettings();
                            msg(channelID, 'Channel set!');
                        } else msg(channelID, 'Invalid channel or not admin.');
                        break;
                    default:
                } else pc.multiPerm(serverID, bot.id, [
                    'TEXT_READ_MESSAGES',
                    'VOICE_CONNECT',
                    'VOICE_SPEAK',
                ], bot.servers[serverID].members[userID].voice_channel_id)
                    .then(() => mh.servers[serverID]
                        .joinUser(userID)
                        .then(server => server.getStream())
                        .then(server => {
                            let result;
                            if (evt.d.attachments.length === 1) result = new mh.Song(evt.d.attachments[0].url, userID).update({
                                title: evt.d.attachments[0].filename,
                                description: 'File uploaded by ' + user,
                                thumbnail: avatarUrl(bot.users[userID]),
                                published: st.sfToDate(evt.d.attachments[0].id)
                            });
                            else if (args[0]) result = mh.searchSong(args, userID)
                            return result
                        })
                        .then(song => {
                            if (song instanceof mh.Song) return mh.servers[serverID].queueSong(song);
                        })
                        .then(() => {
                            if (!mh.servers[serverID].playing) mh.servers[serverID].playNext(channelID, getColor(channelID, userID));
                        }),
                    missing => pc.missage(msg, channelID, missing)
                )
                .catch(err => {
                    if (err instanceof Error) logger.error(err, '');
                    msg(channelID, '', new Embed().error(err));
                })
                break;
            case 'bs':
                if (!config.canvasEnabled) return msg(channelID, 'Bot owner has not enabled this feature.');
                Promise.resolve(serverID ? pc.multiPerm(serverID, bot.id, [
                    'TEXT_MANAGE_MESSAGES',
                    'TEXT_EMBED_LINKS',
                    'TEXT_READ_MESSAGE_HISTORY',
                    'TEXT_ADD_REACTIONS'
                ], channelID) : '').then(() => msg(channelID, '', new Embed(
                    'Blue Squares: The Game',
                    { color: 255 }
                )), missing => pc.missage(msg, channelID, missing)).catch(err => logger.error(err, ''));
                break;
            case 'kps':
                let url = 'https://plssave.help/kps';

                if (!kps[userID]) {
                    kps[userID] = {};
                    kps[userID].gameActive = false;
                    kps[userID].mem = { player: { theme: 'defeault', selection: null, result: null }, opponent: null };
                    kps[userID].socket = io('https://plssave.help', { path: '/socket2' });

                    kps[userID].socket.on('connect', () => {
                        kps[userID].socket.emit('setName', `${ bot.users[userID].username }#${ bot.users[userID].discriminator }`);
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
                        if (!kps[userID].socket.connected) msg(userID, '', new Embed().error(new Error('Could not connect!')));
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
                            msg(userID, `Starting a game: \`play | ai | friend <friendname>\`\nChoosing: \`rock | paper | scissors\`\nTheme selection: \`classic | horror | space | hand\`\nTo quit: \`quit\`\nDon't forget the @${ bot.username } kps!`);
                    }
                }

                /**
                 * @arg {String} msg
                 * @arg {Number} type
                 * @return {Embed}
                 */
                function kpsEmbed(msg, type) {
                    let player = kps[userID].mem.player;
                    const embed = new Embed(msg, {
                        author: {
                            name: 'KPS',
                            url: 'https://plssave.help/PlayKPS'
                        }
                    });

                    switch (player.theme) {
                        case 'defeault':
                            embed.author.icon_url = `${ url }/img/icon.png`;
                            embed.color = 3569575;
                            break;
                        case 'horror':
                            embed.author.icon_url = `${ url }/img/icon4.png`;
                            embed.color = 7667712;
                            break;
                        case 'fuckrulla':
                            embed.author.icon_url = `${ url }/img/icon3.png`;
                            embed.color = 32768;
                            break;
                        case 'hand':
                            embed.author.icon_url = `${ url }/img/icon2.png`;
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

                    return embed.errorIfInvalid();

                    /**
                     * @arg {String} img
                     */
                    function addThumb(img) {
                        embed.thumbnail.url = `${ url }/img/${ player.theme }/${ img }.png`;
                    }

                    /**
                     * @arg {Boolean} background
                     */
                    function addImage(background) {
                        if (background) {
                            embed.image.url = `${ url }/img/${ player.theme }/background${ player.theme === 'defeault' ? '' : 'new' }.${ player.theme === 'horror' ? 'png' : 'jpg' }`;
                        } else {
                            embed.image.url = `${ url }/img/${ player.theme }/${ player.result}.png`;
                        }
                    }

                    function addScore() {
                        let emojis = ['✅', '⚠️', '💢']

                        emojis[0] = emojis[0].repeat(Math.round(player.points.wins / player.games * 15));
                        emojis[1] = emojis[1].repeat(Math.round(player.points.draws / player.games * 15));
                        emojis[2] = emojis[2].repeat(Math.round(player.points.losses / player.games * 15));

                        embed.addField('Current score:', emojis.join(''));
                    }

                    function addFooter() {
                        embed.footer = {
                            icon_url: avatarUrl(bot.users[userID]),
                            text: `Wins: (${ player.total.wins }), Draws: (${ player.total.draws }), Losses: (${ player.total.losses })`
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
                        tzConv[1] = st.timeAt(st.findTimeZone(settings.tz, [userID, serverID]), new Date(tzConv[1]));
                        msg(channelID, tzConv.join(': '));
                        break;
                    default:
                        msg(channelID, `${ ile.getAcronym() }: command structure: \`ile join | leave | here | time\`.`);
                        break;
                }
                break;
            case 'remind':
                if (args[0]) {
                    switch (args[0]) {
                        case 'list':
                            if (serverID && !pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                                return pc.missage(msg, channelID, ['Embed Links']);

                            const rle = new Embed('List of your reminders', { color: getColor(serverID, userID) });

                            if (settings.reminders[userID]) for (const rem of settings.reminders[userID]) rle.addField(
                                `Reminder #${ settings.reminders[userID].indexOf(rem) }`,
                                `Time: ${ st.timeAt(st.findTimeZone(settings.tz, [userID, serverID]), new Date(rem.time)) }\n` +
                                `Channel: ${
                                    bot.channels[rem.channel] ?
                                        `<#${ rem.channel }> (${ bot.servers[bot.channels[rem.channel].guild_id].name })`
                                    : bot.directMessages[rem.channel] ?
                                        `<@${ bot.directMessages[rem.channel].recipient.id }> (DM)`
                                    : bot.users[rem.channel] ?
                                        `<@${ rem.channel }> (DM)`
                                    : rem.channel
                                } \n` +
                                `Message: ${ rem.message || '' }`
                            );

                            rle.isValid();
                            msg(channelID, '', rle.pushToIfMulti(bot.pending[channelID]).errorIfInvalid());
                            break;
                        case 'cancel':
                            if (settings.reminders[userID] && settings.reminders[userID][args[1]]) {
                                settings.reminders[userID].splice(args[1], 1);

                                updateSettings();
                                msg(channelID, 'Cancel successful!');
                            } else msg(channelID, 'Reminder doesn\'t exist!');
                            break;
                        default:
                            const rem = new Reminder({
                                owner: {
                                    id: userID,
                                    name: user
                                },
                                channel: st.stripNaNs(args[0]),
                                color: getColor(serverID, userID)
                            });

                            // reminder to other user or channel?
                            if (bot.users[rem.channel] || bot.channels[rem.channel]) args.shift();
                            else rem.channel = channelID;

                            // perms for receiving channel
                            if (bot.channels[rem.channel] && !pc.userHasPerm(bot.channels[rem.channel].guild_id, bot.id, 'TEXT_EMBED_LINKS', rem.channel))
                                return pc.missage(msg, channelID, ['Embed Links']);

                            if (isNaN(st.anyTimeToMs(args[0]))) {
                                rem.time = args.shift();

                                if (settings.tz[userID]) rem.time += settings.tz[userID];
                                else {
                                    if (serverID && settings.tz[serverID]) {
                                        rem.time += settings.tz[serverID];
                                        msg(channelID, `Using the server default UTC${ settings.tz[serverID]} timezone. You can change your timezone with "\`@${ bot.username } timezone\` -command".`);
                                    } else {
                                        rem.time += 'Z';
                                        msg(channelID, `Using the default UTC+00:00 timezone. You can change your timezone with "\`@${ bot.username } timezone\` -command".`);
                                    }
                                }
                                rem.time = st.stripNaNs(rem.time);
                                if (rem.time == 'Invalid Date') {
                                    msg(channelID, 'Time syntax: `([<amount>](ms|s|min|h|d|y))...` or `[<YYYY>-<MM>-<DD>T]<HH>:<MM>[:<SS>]`.');
                                    break;
                                } else rem.time = rem.time.getTime();
                            }

                            for (const arg of args) {
                                if (!isNaN(st.anyTimeToMs(arg))) rem.time += st.anyTimeToMs(arg);
                                else {
                                    args.splice(0, args.indexOf(arg));
                                    rem.message = args.join(' ');
                                    break;
                                }
                            }

                            for (const arg of args) {
                                if (arg === '@everyone' || arg === '@here') rem.mentions += arg;
                                else {
                                    let role = st.stripNaNs(arg);
                                    if (bot.channels[rem.channel] && bot.servers[bot.channels[rem.channel].guild_id].roles[role]) {
                                        rem.mentions += `<@&${ role }>`;
                                    } else if (serverID && bot.servers[serverID].roles[role]) {
                                        rem.message = rem.message.replace(arg, `@${ bot.servers[serverID].roles[role].name }`);
                                    } else if (isUrl(arg)) rem.links.push(arg);
                                }
                            }

                            if (bot.channels[rem.channel]) for (const mention of evt.d.mentions) {
                                if (mention.id != bot.id) rem.mentions += `<@${ mention.id }> `;
                            } else {
                                // Target Test Color
                                const ttc = getColor(serverID, rem.channel, false);
                                if (ttc != colors.default) rem.color = ttc;
                                rem.mentions = '';
                            }

                            addLatestMsgToEmbed(rem.toEmbed(), channelID)
                                .then(embed => {
                                    if (embed.image.url) {
                                        rem.image = embed.image.url;
                                        if (rem.links.indexOf(rem.image) > -1) rem.links.shift();
                                    }

                                    rem.activate();

                                    if (!settings.reminders[userID]) settings.reminders[userID] = [];
                                    settings.reminders[userID].push(rem);

                                    updateSettings();

                                    msg(channelID, 'I will remind when the time comes...');
                                })
                                .catch(err => logger.error(err, ''));
                    }
                } else if (serverID && !pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID)) {
                    pc.missage(msg, channelID, ['Embed Links']);
                } else new Reminder({
                    mentions: `<@${ userID }>`,
                    owner: {
                        name: bot.username,
                        id: bot.id
                    },
                    color: colors.error,
                    channel: channelID,
                    message: `**How to** \n` +
                        'Do stuff:\n' +
                        `\`@${ bot.username } remind list | (cancel <number>)\`\n` +
                        'Set reminder at a specific time:\n' +
                        `\`@${ bot.username } remind [<#channel>|<@mention>] [<YYYY>-<MM>-<DD>T]<HH>:<MM>[:<SS>] [<message>]...\`\n` +
                        'Set reminder after set amount of time:\n' +
                        `\`@${ bot.username } remind [<#channel>|<@mention>] ([<amount>]ms|[<amount>]s|[<amount>]min|[<amount>]h|[<amount>]d|[<amount>]y)... [<message>]...\``
                }).activate();
                break;
            case 'timezone':
            case 'tz':
                if (st.isValidTimezone(args[0])) {
                    switch (args[1]) {
                        case 'server':
                            if (serverID && admin) {
                                settings.tz[serverID] = args[0];
                                updateSettings();
                                msg(channelID, `Server timezone is set to: UTC${ args[0] }.`);
                            } else {
                                msg(channelID, 'Unauthorized timezoning command. Try to git gud instead.');
                            }
                            break;
                        default:
                            settings.tz[userID] = args[0];
                            updateSettings();
                            msg(channelID, `Your timezone is set to: UTC${ args[0] }.`);
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
                } else if (!settings.servers[serverID].autoCompliment) {
                    settings.servers[serverID].autoCompliment = {
                        enabled: true,
                        targets: []
                    }
                }

                if (args[1]) args[1] = st.stripNaNs(args[1]);

                switch (args[0]) {
                    case 'sample':
                        msg(channelID, `<@${ userID }> ${ objectLib.compliments[Math.floor(Math.random() * objectLib.compliments.length)] }`);
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
                        settings.servers[serverID].autoCompliment.targets.forEach((v, i) => list[i] = `<@${ v }>`)

                        if (!pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                            return msg(channelID, list.join('\n'));

                        msg(channelID, '', new Embed('List of cool people:', list.join('\n'), {
                            color: getColor(serverID, userID),
                        }).errorIfInvalid());
                        break;
                    case 'add':
                        if (args[1]) {
                            if (admin) {
                                if (settings.servers[serverID].autoCompliment.targets.indexOf(args[1]) == -1) {
                                    settings.servers[serverID].autoCompliment.targets.push(args[1]);
                                    msg(channelID, `User <@${ args[1] }> is now cool.`);
                                } else {
                                    msg(channelID, `User <@${ args[1] }> is already cool!`);
                                }
                            } else { msg(channelID, 'Request denied, not admin!'); }
                            break;
                        }
                    case 'remove':
                        if (args[1]) {
                            if (admin) {
                                if (settings.servers[serverID].autoCompliment.targets.indexOf(args[1]) != -1) {
                                    settings.servers[serverID].autoCompliment.targets.splice(settings.servers[serverID].autoCompliment.targets.indexOf(args[1]), 1);
                                    msg(channelID, `User <@${ args[1] }> ain't cool no more!`);
                                } else {
                                    msg(channelID, `User <@${ args[1] }> was never cool to begin with!`);
                                }
                            } else { msg(channelID, 'Request denied, not admin!'); }
                            break;
                        }
                    default:
                        msg(channelID, `Missing arguments. Usage: \`@${ bot.username } autoCompliment sample | on | off | add <@mention> | remove <@mention> | list\`.`);
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

                if (admin) pc.multiPerm(serverID, bot.id, [
                    'TEXT_READ_MESSAGE_HISTORY',
                    'TEXT_ADD_REACTIONS'
                ], channelID).then(() => {
                    switch (args[0]) {
                        case 'set':
                            if (args[1]) {
                                args[1] = st.stripNaNs(args[1]);
                                settings.servers[serverID].autoShit = args[1];
                                msg(channelID, `<@&${ args[1] }> has been chosen to be shit.`);
                            } else {
                                msg(channelID, `*Set hit the fan.*`);
                            }
                            break;
                        case 'clean':
                            settings.servers[serverID].autoShit = null;
                            msg(channelID, `Shit has been cleaned up...`);
                            break;
                        default:
                            msg(channelID, `Missing arguments. Usage: \`@${ bot.username } shit set <@role> | clean\`.`);
                            break;
                    }
                    updateSettings();
                }, missing => pc.missage(msg, channelID, missing)).catch(err => logger.error(err, ''));
                else msg(channelID, 'Request denied, not admin.');
                break;
            case 'color':
                if (serverID && !pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID))
                    return pc.missage(msg, channelID, ['Embed Links']);

                new Promise((resolve, reject) => {
                    const color = colorInput(args.join(' '));
                    if (color && serverID && admin) resolve(color);
                    else reject();
                })
                    .then(color => {
                        if (!settings.servers[serverID].color) settings.servers[serverID].color = {};
                        settings.servers[serverID].color.value = color;

                        addColorRole(serverID).catch(err => {
                            if (err.name === 'Missing permissions!') {
                                msg(channelID, 'Unable to add color role!')
                                pc.missage(msg, channelID, ['Manage Roles']);
                            } else logger.error(err, '');
                        }).then(() => {
                            updateSettings();
                            editColor(serverID, '#' + (color || colors.gerp).toString(16));
                            msg(channelID, '', new Embed('Color changed!', { color }));
                        })
                    })
                    .catch(err => msg(channelID, '', new Embed(
                        'Only color you will be seeing is red.',
                        'This command is server only, admin only AND requires one argument which must be hex or decimal color code or a color I know by name.',
                    ).error(err)));
                break;
            case 'effect':
                if (!serverID) return msg(channelID, 'I think that is a bad idea...');
                if (!admin) return msg(channelID, 'Request denied, not admin!');

                if (!settings.servers[serverID].color) settings.servers[serverID].color = {};
                if (!settings.servers[serverID].effects) settings.servers[serverID].effects = {
                    rainbow: false, shuffle: false
                }

                switch (args[0]) {
                    case 'rainbow':
                        addColorRole(serverID).then(() => {
                            if (settings.servers[serverID].effects.rainbow) {
                                settings.servers[serverID].effects.rainbow = false;
                                editColor(serverID, '#' + (settings.servers[serverID].color.value || colors.gerp).toString(16));
                                msg(channelID, 'Rainbow effect deactivated!');
                            } else {
                                settings.servers[serverID].effects.rainbow = true;
                                msg(channelID, 'Rainbow effect activated!');
                            }
                            updateSettings();
                        }).catch(err => {
                            if (err.name === 'Missing permissions!') {
                                pc.missage(msg, channelID, ['Manage Roles']);
                            } else logger.error(err, '');
                        });
                        break;
                    case 'shuffle':
                        if (!pc.userHasPerm(serverID, bot.id, 'GENERAL_CHANGE_NICKNAME'))
                            return pc.missage(msg, channelID, ['Change Nickname']);

                        if (settings.servers[serverID].effects.shuffle) setTimeout(() => {
                            settings.servers[serverID].effects.shuffle = false;
                            editNick(serverID, settings.servers[serverID].nick);
                            msg(channelID, 'Shuffle effect deactivated!');
                            updateSettings();
                        }, 1000);
                        else {
                            settings.servers[serverID].effects.shuffle = true;
                            settings.servers[serverID].nick = bot.servers[serverID].members[bot.id].nick || bot.username
                            msg(channelID, 'Shuffle effect activated!');
                            updateSettings();
                        }
                        break;
                    default:
                        msg(channelID, 'Shuffle or rainbow?');
                        break;
                }
                break;
            case '':
                if (fileReact) break;
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
        if (serverID && settings.servers[serverID].autoCompliment && settings.servers[serverID].autoCompliment.targets.indexOf(userID) != -1 && settings.servers[serverID].autoCompliment.enabled == true) {
            msg(channelID, `<@${ userID }> ${ objectLib.compliments[Math.floor(Math.random() * objectLib.compliments.length)] }`);
        }

        const mentionedChannels = [];
        for (const word of message.split(' ')) {
            const mChannel = st.stripNaNs(word);
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
                const me = new Embed(
                    `#${ bot.channels[channelID].name } (${ bot.servers[serverID].name })`,
                    `*Latest messages:*`,
                    { color: getColor(serverID, userID) }
                );

                addLatestMsgToEmbed(me, channelID)
                    .then(me => msg(channel, 'This channel was mentioned on another channel.', me.errorIfInvalid()))
                    .catch(err => logger.error(err, ''));
            }
        }
    }

    // All messages''
    if (serverID && typeof settings.servers[serverID].autoShit == 'string' &&
        bot.servers[serverID].members[userID] &&
        bot.servers[serverID].members[userID].roles.indexOf(settings.servers[serverID].autoShit) != -1 &&
        pc.userHasPerm(serverID, bot.id, 'TEXT_ADD_REACTIONS')
    ) emojiResponse('💩');

    if (userID == bot.id && evt.d.embeds[0]) {
        const reactionList = [];
        // vote embed
        if (evt.d.embeds[0].footer && evt.d.embeds[0].footer.text == 'Vote generated by your\'s truly.') {
            for (const field of evt.d.embeds[0].fields) {
                if (field.value.substring(field.value.length - 1) == '>') field.value = field.value.substring(0, field.value.length - 1);
                reactionList.push(field.value);
            }

            bot.pinMessage({
                channelID: channelID,
                messageID: evt.d.id
            }, err => { if (err) logger.error(err, ''); });
        }

        // bs embed
        if (evt.d.embeds[0].title == 'Blue Squares: The Game') {
            reactionList.push('🔼', '▶', '🔽', '◀', '❌');
        }

        // osu! embeds
        switch (osuEmbedIdentifier(evt.d.embeds[0])) {
            case 'profile':
                reactionList.push('🏆', '🕒');
                break;
            case 'top':
                reactionList.push('➕');
                break;
        }

        for (let i = 0; i < reactionList.length; i++)
            setTimeout(emojiResponse, i * 500, reactionList[i]);
    }

    // Word detection
    for (let word of message.split(' ')) {
        if (word.substring(0, 2) === 'r/') msg(channelID, 'https://reddit.com/' + word);
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

function osuEmbedIdentifier(embed) {
    if (embed && embed.title && embed.title.indexOf('osu!') > -1) for (const type of [
        'profile',
        'top',
    ]) if (embed.title.indexOf(type) > -1) return type;
}

function addOsuPlaysFromReaction(profOwner, evt, offset = 0) {
    offset = Number(offset)
    if (isNaN(offset)) return;
    osu.getUserBest(profOwner, offset + 5)
        .then(playList => {
            playList = playList.slice(offset);
            const promArr = [];
            for (const play of playList) promArr.push(
                osu.singlePlayEmbed(play).then(result => {
                    result.re.description = result.re.description.replace('<date>',
                        st.timeAt(st.findTimeZone(settings.tz, [evt.d.user_id, evt.d.guild_id]), new Date(result.date))
                    );
                    return result.re;
                }).catch(err => logger.error(err, ''))
            )
            return Promise.all(promArr);
        })
        .then(reList => {
            const reFirst = reList.shift();
            if (!bot.pending[evt.d.channel_id]) bot.pending[evt.d.channel_id] = [];
            bot.pending[evt.d.channel_id].push(...reList, new Embed(
                `Showing top ${ offset + 5 } osu! plays from ${ profOwner }`,
                { color: osu.searchColors.user }
            ));
            msg(evt.d.channel_id, '', reFirst);
        })
        .catch(err => msg(evt.d.channel_id, '', new Embed().error(err)));
}

function addLatestMsgToEmbed(me, channelID, limit = 5) {
    return new Promise((resolve, reject) => {
        bot.getMessages({ channelID, limit }, (err, msgList) => {
            if (err) reject(err);
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

                me.addField(
                    m.author.username + extra,
                    m.content || '`<attachment>`'
                );
            }
            me.fields.reverse();
            resolve(me);
        });
    });
}

bot.on('disconnect', (err, code) => {
    online = false;
    logger.warn(`Disconnected! error: ${ err }, code: ${ code } (uptime: ${ new Uptime(timeOf.connection).toString() }).`);
    setTimeout(() => {
        logger.info('Trying to reconnect...');
        bot.connect();
    }, 5000);
});

// Special events
bot.on('any', evt => {
    if (evt.t === 'GUILD_CREATE') {
        if (!settings.servers[evt.d.id]) settings.servers[evt.d.id] = {};
    }

    if (evt.t === 'MESSAGE_REACTION_ADD' && evt.d.user_id != bot.id) bot.getMessage({
        channelID: evt.d.channel_id,
        messageID: evt.d.message_id
    }, (err, message) => { if (!err) handleReactions(evt, message); });
});

function handleReactions(evt, message) {
    const embed = message.embeds[0];
    if (embed && message.author.id == bot.id) new Promise((resolve, reject) => {
        // osu! embeds
        // TODO: finish after sleep
        switch (osuEmbedIdentifier(embed)) {
            case 'profile':
                switch (evt.d.emoji.name) {
                    case '🏆':
                        addOsuPlaysFromReaction(embed.title.replace('\'s osu! profile', ''), evt);
                        break;
                    case '🕒':
                        console.log('recent');
                        break;
                }
                resolve();
                break;
            case 'top':
                if (evt.d.emoji.name === '➕') {
                    args = embed.title.replace('Showing top ', '').replace('osu! plays from ', '').split(' ');
                    addOsuPlaysFromReaction(args[1], evt, args[0]);
                    bot.deleteMessage({
                        channelID: evt.d.channel_id,
                        messageID: evt.d.message_id
                    });
                }
                break;
        }

        // Blue Squares game movement
        if (embed.title == 'Blue Squares: The Game') {
            if (!config.canvasEnabled) return msg(channelID, 'Bot owner has not enabled this feature.');
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
                .then(() => {
                    const bse = new Embed(embed);

                    bsga.extra = bsga.extra === 'a' ? 'b' : 'a';
                    bse.image.url = config.web.url + '/temp/bsga-image.png' +
                        `?${ bsga.extra }=${ Math.random() }`;

                    bot.editMessage({
                        channelID: evt.d.channel_id,
                        messageID: evt.d.message_id,
                        message: '',
                        embed: bse
                    }, (err, res) => err ? reject(err) : resolve(res));
                })
                .catch(reject);
        }
    })
        .then(() => bot.removeReaction({
            channelID: evt.d.channel_id,
            messageID: evt.d.message_id,
            userID: evt.d.user_id,
            reaction: evt.d.emoji.name
        }))
        .catch(err => logger.error(err, ''));
}

/**
 * @arg {Snowflake} channel
 * @arg {String} msg
 * @arg {Embed} [embed]
 */
function msg(channel, message, embed) {
    bot.sendMessage({
        to: channel,
        message: '{local}' + message,
        embed
    }, err => { if (err) {
        if (err.response && err.response.message === 'You are being rate limited.')
            setTimeout(msg, err.response.retry_after, channel, message, embed);
        else logger.error(err, '');
    }});
}

function updateObjectLib() {
    // help
    for (const page in objectLib.help) {
        for (const field of objectLib.help[page].fields) {
            field.name = field.name.split('GerpBot').join(bot.username);
            field.value = field.value.split('GerpBot').join(bot.username);
        }
        objectLib.help[page].description = objectLib.help[page].description.split('GerpBot').join(bot.username);
    }

    // help color
    for (const field of objectLib.help.color.fields) {
        const listOfColors = [];
        for (const color in colors) listOfColors.push(color);
        field.value = field.value.replace('<list of colors>', listOfColors.join('* • *'))
    }

    // games
    for (const game in objectLib.games) {
        objectLib.games[game] = objectLib.games[game].split('@GerpBot').join('@' + bot.username);
    }

    // defaultRes
    for (const res in objectLib.defaultRes) {
        objectLib.defaultRes[res] = objectLib.defaultRes[res].split('GerpBot').join(bot.username);
    }
}

function updateColors() {
    let color, colorD;
    for (colorD in Discord.Colors) {
        color = colorD.toLowerCase().replace('_', ' ');
        if (!colors[color]) colors[color] = Discord.Colors[colorD];
    }

    if (osu) {
        for (color in osu.rankColors) colors['osu ' + color] = osu.rankColors[color];
        for (color in osu.searchColors) colors['osu ' + color] = osu.searchColors[color];
    }
}

function startLoops() {
    setInterval(() => bot.setPresence({
        game: {
            name: objectLib.games[Math.floor(Math.random() * objectLib.games.length)],
            type: 0
        }
    }), 60000);

    const rainbowColors = ['#ff0000', '#ff6a00', '#ffff00', '#00ff00', '#0000ff', '#ff00ff'];
    let i = 0;
    setInterval(() => {
        if (online) {
            if (i >= rainbowColors.length) i = 0;

            for (const server in settings.servers) if (bot.servers[server]) {
                if (settings.servers[server].effects && settings.servers[server].effects.rainbow) {
                    editColor(server, rainbowColors[i]);
                }

                if (settings.servers[server].effects && settings.servers[server].effects.shuffle) {
                    let newName = settings.servers[server].nick.split('');
                    newName.forEach((v, i, a) => {
                        random = Math.floor(Math.random() * a.length);
                        let help = a[random];
                        a[random] = v;
                        a[i] = help;
                    });
                    editNick(server, newName.join(''));
                }
            }
            i++;
        }
    }, 2000);

    setInterval(startReminding, 86400000);
}

function startIle() {
    if (!ile.started) {
        ile.start();
        ile.on('msg', (channel, message, embed) => {
            let tzConv = message.split(': ');
            if (tzConv[0] === 'Next checkpoint') {
                tzConv[1] = st.timeAt(st.findTimeZone(settings.tz, [channel]), new Date(tzConv[1]));
                message = tzConv.join(': ');
            }

            if (embed) for (const field of embed.fields) {
                let id = field.name.substring(field.name.indexOf('.') + 2);
                field.name = field.name.replace(id, bot.users[id].username);
            } else {
                embed = new Embed(ile.getAcronym(), message);
                message = '';
            }
            embed.color = colors.gerp;

            msg(channel, message, embed.errorIfInvalid());
        });
        ile.on('save', data => {
            fs.writeFile('ile.json', JSON.stringify(data, null, 4), err => {
                if (err) logger.error(err, '');
            });
        });
    }
}

function startReminding() {
    const test = new Reminder();
    for (const user in settings.reminders) for (const rem of settings.reminders[user])
        if (test.ready(rem)) settings.reminders[user].splice(settings.reminders[user].indexOf(rem), 1, new Reminder(rem).activate());
}

function getReminderClass() {
    return class {
        constructor (obj = {}) {
            this.mentions = obj.mentions || '';
            this.links = obj.links || [];
            this.owner = obj.owner || {
                name: '',
                id: ''
            };
            this.message = obj.message || '';
            this.color = obj.color || '';
            this.image = obj.image || '';
            this.time = obj.time || Date.now();
            this.channel = obj.channel || '';
        }

        ready(rem = this) {
            return !rem.timeout && rem.time - Date.now() < 86400000;
        }

        activate() {
            if (this.ready()) this.timeout = setTimeout(() => {
                msg(this.channel, this.mentions, this.toEmbed())
                if (this.links.length > 0) setTimeout(msg, 500, this.channel, this.links.join('\n'));
                if (settings.reminders[this.owner.id] && settings.reminders[this.owner.id].indexOf(this) > -1) settings.reminders[this.owner.id].splice(settings.reminders[this.owner.id].indexOf(this), 1);
                updateSettings();
            }, this.time - Date.now());
            return this;
        }

        toEmbed(rem = this) {
            return new Embed('Reminder', rem.message, {
                color: rem.color,
                image: { url: rem.image },
                footer: { text: `Created by ${ rem.owner.name }` },
            });
        }
    }

}

function avatarUrl(user = {}) {
    return user.id && user.avatar ?
        `https://cdn.discordapp.com/avatars/${ user.id }/${ user.avatar }.png` :
        `https://cdn.discordapp.com/embed/avatars/${
            user.discriminator ? user.discriminator % 5 : Math.floor(Math.random() * 5)
        }.png`;
}

/**
 * @arg {Snowflake} channel
 * @return {Snowflake[] | String}
 */
function membersInChannel(channel) {
    channel = st.stripNaNs(channel);
    const members = [];
    let serverID;

    if (bot.channels[channel]) {
        serverID = bot.channels[channel].guild_id;
        for (const user in bot.servers[serverID].members) if (pc.userHasPerm(serverID, user, 'TEXT_READ_MESSAGES', channel)) members.push(user);
    }
    if (bot.directMessages[channel]) {
        members.push(bot.id);
        for (const user of bot.directMessages[channel].recipients) members.push(user.id);
    }

    return members;
}

/**
 * @arg {Snowflake} serverID
 * @arg {Number|String} color
 */
function editColor(serverID, color) {
    if (pc.userHasPerm(serverID, bot.id, 'GENERAL_MANAGE_ROLES')) bot.editRole({
        serverID,
        roleID: settings.servers[serverID].color.role,
        color
    }, err => { if (err) logger.error(err, ''); });
}

/**
 * @arg {Snowflake} serverID
 * @arg {String} newName
 */
function editNick(serverID, newName) {
    if (pc.userHasPerm(serverID, bot.id, 'GENERAL_CHANGE_NICKNAME')) bot.editNickname({
        serverID,
        userID: bot.id,
        nick: newName
    }, err => { if (err) logger.error(err, ''); });
}

function getBotRole(serverID) {
    for (const role of bot.servers[serverID].members[bot.id].roles)
        if (bot.servers[serverID].roles[role].name === bot.username) {
            settings.servers[serverID].roleID = bot.servers[serverID].roles[role].id;
            updateSettings();
            return settings.servers[serverID].roleID;
        }
}

function addColorRole(serverID) {
    // Check bot's permission to Manage Roles
    if (!pc.userHasPerm(serverID, bot.id, 'GENERAL_MANAGE_ROLES')) return Promise.reject({
        name: 'Missing permissions!', message: 'Manage Roles'
    });

    // Return if role is saved to settings, exists in the server and is assigned to the bot
    if (settings.servers[serverID].color.role &&
        bot.servers[serverID].roles[settings.servers[serverID].color.role] &&
        bot.servers[serverID].members[bot.id].roles.indexOf(settings.servers[serverID].color.role) > 0
    ) return Promise.resolve(settings.servers[serverID].color.role);

    // Make sure roleID is defined
    if (!settings.servers[serverID].roleID) getBotRole(serverID);

    // Fix the gaps
    return new Promise((resolve, reject) => {
        // Find existing role from server
        for (const role in bot.servers[serverID].roles) {
            if (
                bot.servers[serverID].roles[role].name === bot.username + ' color' &&
                bot.servers[serverID].roles[role].position <
                bot.servers[serverID].roles[settings.servers[serverID].roleID].position
            ) return resolve(bot.servers[serverID].roles[role].id);
        }

        // Create a new role for the bot
        bot.createRole(serverID, (err, res) => err ? reject(err) : bot.editRole({
            serverID,
            roleID: res.id,
            name: bot.username + ' color',
            color: colors.gerp
        }, (err, res) => err ? reject(err) : resolve(res.id)));
    // Assign the found role to the bot
    }).then(roleID => new Promise((resolve, reject) => bot.addToRole({
        serverID,
        userID: bot.id,
        roleID
    }, err => err ? reject(err) : resolve(roleID))))
    .then(roleID => settings.servers[serverID].color.role = roleID);
}

function getColor(serverID, targetID, fallBack = true) {
    let color;
    // Check target color
    if (bot.servers[serverID] && targetID) {
        // Check if targetID belongs to a member
        if (bot.servers[serverID].members[targetID]) color = bot.servers[serverID].members[targetID].color;
        // Check if targetID belongs to a role
        else if (bot.servers[serverID].roles[targetID]) color = bot.servers[serverID].roles[targetID].color;
    }

    // If target (user/role) color is not available, check fallBack option
    if (!color || color == 0) {
        // If fallBack is enabled: use bot's color (from server, settings or default Gerp orange).
        // Otherwise use Discord's default gray.
        if (fallBack) {
            if (bot.servers[serverID] && bot.servers[serverID].members[bot.id] && bot.servers[serverID].members[bot.id].color)
                color = bot.servers[serverID].members[bot.id].color;
            else if (settings.servers[serverID] && settings.servers[serverID].color && settings.servers[serverID].color.value)
                color = settings.servers[serverID].color.value;
            else color = colors.gerp;
        } else color = colors.default;
    }

    return color
}

function colorInput(input) {
    let color;
    // Decimal color input
    if (!isNaN(input)) color = Number(input);
    else if (typeof input === 'string') {
        // Hex color input
        if (input[0] === '#') color = parseInt(input.substring(1), 16);
        // Check if input is a color found in common.colors
        else if (colors[input]) color = colors[input];
    }
    return color;
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

function updateSettings(retry = false) {
    if (!config.saveSettings) return;
    json = JSON.stringify(settings, (key, value) => {
        switch (key) {
            case 'timeout':
                return;
        }
        return value;
    }, 4);
    if (json) fs.writeFile('settings.json', json, err => {
        if (err) logger.error(err, '');
        else fs.readFile('settings.json', 'utf8', (err, data) => {
            if (err) logger.error(err, '');
            try {
                JSON.parse(data);
                if (retry) logger.info('setting.json is no longer corrupted.');
            }
            catch (err) {
                logger.warn('setting.json was corrupted during update, retrying in 5 seconds.');
                setTimeout(updateSettings, 5000, true);
            }
        });
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
 */
