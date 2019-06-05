const
    // Common
    common = require('./scripts/common.js'),
    {
        config,
        logger,
        colors,
        avatarUrl,
    } = common,
    // Node modules
    Discord = require('discord.io'),
    fs = require('fs'),
    path = require('path'),
    isUrl = require('is-url'),
    st = require('snowtime'),
    // Scripts
    web = require('./scripts/web.js'),
    bs = config.canvasEnabled ? require('./scripts/bs.js') : null,
    Ile = require('./scripts/ile.js'),
    Osu = require('./scripts/osu.js'),
    Embed = require('./scripts/embed'),
    MusicHandler = require('./scripts/music'),
    Reminder = require('./scripts/reminder'),
    permCheck = require('./scripts/permCheck.js'),
    // Load objectLib
    objectLib = getJSON([
        'help',
        'compliments',
        'defaultRes',
        'games',
        'answers',
        'ileAcronym'
    ], 'objectLib'),
    // Constant variables
    commands = require('./commands'),
    settings = getJSON('settings'),
    bot = new Discord.Client({ token: config.auth.token, autorun: true }),
    osu = new Osu(config.auth.osu),
    bsga = config.canvasEnabled ? new bs.GameArea() : null,
    // Funky function stuff
    pc = permCheck(bot);

let
    // Other variables
    startedOnce = false,
    online = false;

if (!settings.servers) settings.servers = {};
if (!settings.tz) settings.tz = {};
if (!settings.reminders) settings.reminders = {};

settings.update = updateSettings;
common.settings = settings;
common.objectLib = objectLib;
common.msg = msg;
common.timeOf.startUp = Date.now();
common.ile = new Ile(getJSON('ile'), objectLib.ileAcronym);
common.mh = new MusicHandler(bot, config.auth.tubeKey);

bot.getColor = getColor;
bot.addLatestMsgToEmbed = addLatestMsgToEmbed;
bot.pending = {};

startLoops();
updateColors();

if (config.web) web.activate.then(logger.info);

bot.on('ready', evt => {
    common.timeOf.connection = Date.now();

    updateObjectLib();
    startIle();
    startReminding();
    updateSettings();

    logger.info(startedOnce ? 'Reconnection successful!' : `${ evt.d.user.username } (user ${ evt.d.user.id }) ready for world domination!`);

    online = true;
    startedOnce = true;
});

bot.on('message', (user, userID, channelID, message, evt) => {
    const args = message.split(' ');
    let
        serverID = null,
        fileReact = false;

    if (bot.channels[channelID]) serverID = bot.channels[channelID].guild_id;
    else if (!bot.directMessages[channelID]) return;

    if (!bot.pending[channelID]) bot.pending[channelID] = [];
    if (userID === bot.id && bot.pending[channelID].length > 0) {
        const pi = bot.pending[channelID].splice(0, 1)[0];
        let
            str = '',
            embed = null;

        if (typeof pi === 'string') str = pi;
        else if (pi instanceof Embed) embed = pi;
        else if (pi instanceof Array) {
            str = pi[0];
            embed = pi[1];
        }
        msg(channelID, str, embed instanceof Embed && embed.errorIfInvalid());
    }

    if (evt.d.attachments.length > 0) for (const file of evt.d.attachments) {
        // Messages with attachments
        const ext = file.url.substring(file.url.length - file.url.split('').reverse()
            .join('')
            .indexOf('.') - 1).toLowerCase();
        fileReact = true;
        switch (ext) {
            case '.osr':
                if (serverID && !pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID)) return pc.missage(msg, channelID, ['Embed Links']);
                osu.readReplay(file.url).then(perf => osu.singlePlayEmbed(perf))
                    .then(result => {
                        result.re.description = result.re.description.replace('<date>',
                            st.timeAt(st.findTimeZone(settings.tz, [userID, serverID]), new Date(result.date))
                        );
                        msg(channelID, userID == bot.id ? '' : 'osu! replay information:', result.re.errorIfInvalid());
                    })
                    .catch(err => msg(channelID, '', new Embed().error(err)));
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

        if (commands[cmd]) new commands[cmd](bot, { user, userID, channelID, message, evt }).execute();
        else switch (cmd) {
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
                    updateSettings();
                } else msg(channelID, 'You can\'t escape me here!');
                break;
            case 'autoCompliment':
            case 'ac':
                if (!serverID) {
                    msg(channelID, '**Feature not intended to be used in DM. Sending sample:**');
                    args[0] = 'sample';
                } else if (!settings.servers[serverID].autoCompliment) {
                    settings.servers[serverID].autoCompliment = {
                        enabled: true,
                        targets: []
                    };
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
                        const list = settings.servers[serverID].autoCompliment.targets.map(value => `<@${ value }>`);

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
                                if (settings.servers[serverID].autoCompliment.targets.indexOf(args[1]) > -1) {
                                    msg(channelID, `User <@${ args[1] }> was never cool to begin with!`);
                                } else {
                                    settings.servers[serverID].autoCompliment.targets.splice(settings.servers[serverID].autoCompliment.targets.indexOf(args[1]), 1);
                                    msg(channelID, `User <@${ args[1] }> ain't cool no more!`);
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

                        addColorRole(serverID)
                            .catch(err => {
                                if (err.name === 'Missing permissions!') {
                                    msg(channelID, 'Unable to add color role!');
                                    pc.missage(msg, channelID, ['Manage Roles']);
                                } else logger.error(err, '');
                            })
                            .then(() => {
                                updateSettings();
                                editColor(serverID, `#${ (color || colors.gerp).toString(16) }`);
                                msg(channelID, '', new Embed('Color changed!', { color }));
                            });
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
                };

                switch (args[0]) {
                    case 'rainbow':
                        addColorRole(serverID)
                            .then(() => {
                                if (settings.servers[serverID].effects.rainbow) {
                                    settings.servers[serverID].effects.rainbow = false;
                                    editColor(serverID, `#${ (settings.servers[serverID].color.value || colors.gerp).toString(16) }`);
                                    msg(channelID, 'Rainbow effect deactivated!');
                                } else {
                                    settings.servers[serverID].effects.rainbow = true;
                                    msg(channelID, 'Rainbow effect activated!');
                                }
                                updateSettings();
                            })
                            .catch(err => {
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
                            settings.servers[serverID].nick = bot.servers[serverID].members[bot.id].nick || bot.username;
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
        common.timeOf.lastCommand = Date.now();
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
        // Only vote embed
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

        // Only bs embed
        if (evt.d.embeds[0].title == 'Blue Squares: The Game') {
            reactionList.push('🔼', '▶', '🔽', '◀', '❌');
        }

        // Only osu! embeds
        switch (osuEmbedIdentifier(evt.d.embeds[0])) {
            case 'profile':
                reactionList.push('🏆', '🕒');
                break;
            case 'top':
                reactionList.push('➕');
                break;
            default:
        }

        for (let i = 0; i < reactionList.length; i++) setTimeout(emojiResponse, i * 500, reactionList[i]);
    }

    // Word detection
    for (const word of message.split(' ')) {
        if (word.substring(0, 2) === 'r/') msg(channelID, `https://reddit.com/${ word }`);
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
    if (isNaN(offset)) return;
    osu.getUserBest(profOwner, Number(offset) + 5)
        .then(playList => {
            const
                playListSegment = playList.slice(offset),
                promArr = [];
            for (const play of playListSegment) promArr.push(
                osu.singlePlayEmbed(play)
                    .then(result => {
                        result.re.description = result.re.description.replace('<date>',
                            st.timeAt(st.findTimeZone(settings.tz, [evt.d.user_id, evt.d.guild_id]), new Date(result.date))
                        );
                        return result.re;
                    })
                    .catch(err => logger.error(err, ''))
            );
            return Promise.all(promArr);
        })
        .then(reList => {
            const reFirst = reList.shift();
            if (!bot.pending[evt.d.channel_id]) bot.pending[evt.d.channel_id] = [];
            bot.pending[evt.d.channel_id].push(...reList, new Embed(
                `Showing top ${ Number(offset) + 5 } osu! plays from ${ profOwner }`,
                { color: osu.searchColors.user }
            ));
            msg(evt.d.channel_id, '', reFirst);
        })
        .catch(err => msg(evt.d.channel_id, '', new Embed().error(err)));
}

// TODO: Refactor this.
function addLatestMsgToEmbed(me, channelID, limit = 5) {
    return new Promise((resolve, reject) => bot.getMessages({ channelID, limit }, (err, messageList) => {
        if (err) reject(err);
        else for (const message of messageList) {
            let extra = '';
            if (!me.image.url) for (const ext of ['.gif', '.jpg', '.jpeg', '.png'])
                if (message.attachments[0] && message.attachments[0].url.indexOf(ext) > -1) {
                    me.image.url = message.attachments[0].url;
                    extra = ' (image below)';
                } else for (const url of message.content.split(' ')) if (url.indexOf(ext) > -1 && isUrl(url)) {
                    me.image.url = url;
                    extra = ' (image below)';
                }

            me.addField(
                message.author.username + extra,
                message.content || '`<attachment>`'
            );
        }
        me.fields.reverse();
        resolve(me);
    }));
}

bot.on('disconnect', (err, code) => {
    online = false;
    logger.warn(`Disconnected! error: ${ err }, code: ${ code } (uptime: ${ new st.Uptime(common.timeOf.connection).toString() }).`);
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

        // Only osu! embeds
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
                    default:
                }
                resolve();
                break;
            case 'top':
                if (evt.d.emoji.name === '➕') {
                    const [offset, profOwner] = embed.title.replace('Showing top ', '').replace('osu! plays from ', '').split(' ');
                    addOsuPlaysFromReaction(profOwner, evt, offset);
                    bot.deleteMessage({
                        channelID: evt.d.channel_id,
                        messageID: evt.d.message_id
                    });
                }
                break;
            default:
        }

        // Blue Squares game movement
        if (embed.title == 'Blue Squares: The Game') {
            if (!config.canvasEnabled) return msg(evt.d.channel_id, 'Bot owner has not enabled this feature.');
            if (bsga.players[evt.d.user_id]) bsga.players[evt.d.user_id].online = true;
            else bsga.players[evt.d.user_id] = new bs.Player(evt.d.user_id, bot.users[evt.d.user_id].username);
            switch (evt.d.emoji.name) {
                case '🔼': bsga.players[evt.d.user_id].move('up'); break;
                case '▶': bsga.players[evt.d.user_id].move('right'); break;
                case '🔽': bsga.players[evt.d.user_id].move('down'); break;
                case '◀': bsga.players[evt.d.user_id].move('left'); break;
                case '❌': bsga.players[evt.d.user_id].online = false; break;
                default:
            }

            web.addTemp('bsga-image.png', bsga.update().toBuffer())
                .then(() => {
                    const bse = new Embed(embed);

                    bsga.extra = bsga.extra === 'a' ? 'b' : 'a';
                    bse.image.url = `${ config.web.url }/temp/bsga-image.png?${ bsga.extra }=${ Math.random() }`;

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
        message,
        embed
    }, err => { if (err) {
        if (err.response && err.response.message === 'You are being rate limited.')
            setTimeout(msg, err.response.retry_after, channel, message, embed);
        else logger.error(err, '');
    } });
}

function updateObjectLib() {
    // Update help
    for (const page in objectLib.help) {
        for (const field of objectLib.help[page].fields) {
            field.name = field.name.split('GerpBot').join(bot.username);
            field.value = field.value.split('GerpBot').join(bot.username);
        }
        objectLib.help[page].description = objectLib.help[page].description.split('GerpBot').join(bot.username);
    }

    // Update help color
    for (const field of objectLib.help.color.fields) {
        const listOfColors = [];
        for (const color in colors) listOfColors.push(color);
        field.value = field.value.replace('<list of colors>', listOfColors.join('* • *'));
    }

    // Update games
    for (const game in objectLib.games) {
        objectLib.games[game] = objectLib.games[game].split('@GerpBot').join(`@${ bot.username }`);
    }

    // Update defaultRes
    for (const res in objectLib.defaultRes) {
        objectLib.defaultRes[res] = objectLib.defaultRes[res].split('GerpBot').join(bot.username);
    }
}

function updateColors() {
    for (const colorD in Discord.Colors) {
        const color = colorD.toLowerCase().replace('_', ' ');
        if (!colors[color]) colors[color] = Discord.Colors[colorD];
    }

    if (osu) {
        for (const color in osu.rankColors) colors[`osu ${ color }`] = osu.rankColors[color];
        for (const color in osu.searchColors) colors[`osu ${ color }`] = osu.searchColors[color];
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
                    const newName = settings.servers[server].nick.split('');
                    newName.forEach((value, i, array) => {
                        const
                            random = Math.floor(Math.random() * array.length),
                            help = array[random];
                        array[random] = value;
                        array[i] = help;
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
    if (!common.ile.started) {
        common.ile.start();
        common.ile.on('msg', (channel, message, embed = new Embed(common.ile.getAcronym())) => {
            const tzConv = message.split(': ');
            let parsedMessage = '';
            if (tzConv[0] === 'Next checkpoint') {
                tzConv[1] = st.timeAt(st.findTimeZone(settings.tz, [channel]), new Date(tzConv[1]));
                parsedMessage = tzConv.join(': ');
            }

            for (const field of embed.fields) {
                const id = field.name.substring(field.name.indexOf('.') + 2);
                field.name = field.name.replace(id, bot.users[id].username);
            }

            if (!embed.description) {
                embed.description = parsedMessage;
                parsedMessage = '';
            }

            embed.color = colors.gerp;

            msg(channel, message, embed.errorIfInvalid());
        });
        common.ile.on('save', data => {
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
                bot.servers[serverID].roles[role].name === `${ bot.username } color` &&
                bot.servers[serverID].roles[role].position <
                bot.servers[serverID].roles[settings.servers[serverID].roleID].position
            ) return resolve(bot.servers[serverID].roles[role].id);
        }

        // Create a new role for the bot
        bot.createRole(serverID, (err, res) => err ? reject(err) : bot.editRole({
            serverID,
            roleID: res.id,
            name: `${ bot.username } color`,
            color: colors.gerp
        }, (err, res) => err ? reject(err) : resolve(res.id)));
    })
        // Assign the found role to the bot
        .then(roleID => new Promise((resolve, reject) => bot.addToRole({
            serverID,
            userID: bot.id,
            roleID
        }, err => err ? reject(err) : resolve(roleID))))
        .then(roleID => (settings.servers[serverID].color.role = roleID));
}

function getColor(serverID, targetID, fallBack = true) {
    let color = colors.default;
    // Check target color
    if (bot.servers[serverID] && targetID) {
        // Check if targetID belongs to a member
        if (bot.servers[serverID].members[targetID]) color = bot.servers[serverID].members[targetID].color;
        // Check if targetID belongs to a role
        else if (bot.servers[serverID].roles[targetID]) color = bot.servers[serverID].roles[targetID].color;
    }

    // If target (user/role) color is not available, check fallBack option
    if (!color || color == 0) {

        /* If fallBack is enabled: use bot's color (from server, settings or default Gerp orange).
           Otherwise use Discord's default gray. */
        if (fallBack) {
            if (bot.servers[serverID] && bot.servers[serverID].members[bot.id] && bot.servers[serverID].members[bot.id].color)
                color = bot.servers[serverID].members[bot.id].color;
            else if (settings.servers[serverID] && settings.servers[serverID].color && settings.servers[serverID].color.value)
                color = settings.servers[serverID].color.value;
            else
                color = colors.gerp;
        }
    }

    return color;
}

function colorInput(input) {
    let color = 0;
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
    let fullPath = '';

    if (typeof file === 'string') {
        fullPath = path.join(__dirname, location, file);
        if (fs.existsSync(`${ fullPath }.json`)) return require(fullPath);
    }

    if (typeof file === 'object') for (const key of file) {
        fullPath = path.join(__dirname, location, key);
        if (fs.existsSync(`${ fullPath }.json`)) tempObj[key] = require(fullPath);
    }
    return tempObj;
}

function updateSettings(retry = false) {
    if (!config.saveSettings) return;
    const json = JSON.stringify(settings, (key, value) => {
        switch (key) {
            case 'timeout':
                return;
            case 'bot':
                return;
            default:
                return value;
        }
    }, 4);
    if (json) fs.writeFile('settings.json', json, err => {
        if (err) logger.error(err, '');
        else fs.readFile('settings.json', 'utf8', (err, data) => {
            if (err) logger.error(err, '');
            try {
                JSON.parse(data);
                if (retry) logger.info('setting.json is no longer corrupted.');
            }
            catch (error) {
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
