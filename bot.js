const
    // Common
    common = require('./scripts/common.js'),
    {
        config,
        logger,
        colors,
    } = common,
    // Node modules
    Discord = require('discord.io'),
    fs = require('fs'),
    isUrl = require('is-url'),
    st = require('snowtime'),
    // Scripts
    web = require('./scripts/web.js'),
    initialize = require('./scripts/initialize'),
    BSGameArea = require('./scripts/bsGameArea.js'),
    BSPlayer = require('./scripts/bsPlayer.js'),
    Osu = require('./scripts/osu.js'),
    CustomError = require('./scripts/error'),
    Embed = require('./scripts/embed'),
    MusicHandler = require('./scripts/music'),
    Reminder = require('./scripts/reminder'),
    permCheck = require('./scripts/permCheck.js'),
    // Constant variables
    commands = require('./commands'),
    bot = new Discord.Client({ token: config.auth.token }),
    osu = new Osu(config.auth.osu),
    bsga = config.canvasEnabled ? new BSGameArea(300, 300) : null,
    // Funky function stuff
    pc = permCheck(bot);

let
    // Other variables
    startedOnce = false,
    online = false;

common.msg = msg;
common.timeOf.startUp = Date.now();
common.mh = new MusicHandler(bot, config.auth.tubeKey);

bot.getColor = getColor;
bot.addColorRole = addColorRole;
bot.editColor = editColor;
bot.editNick = editNick;
bot.addLatestMsgToEmbed = addLatestMsgToEmbed;
bot.pending = {};

startLoops();
updateColors();

if (config.web) web.activate.then(message => logger.info(message, { label: 'web' }));

initialize()
    .then(() => bot.connect())
    .catch(err => logger.error(err));

bot.on('ready', evt => {
    common.timeOf.connection = Date.now();

    updateObjectLib();
    startIle();
    startReminding();
    common.settings.update();

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
                if (serverID && !pc.userHasPerm(serverID, bot.id, 'TEXT_EMBED_LINKS', channelID)) pc.missage(msg, channelID, ['Embed Links']);
                else osu.readReplay(file.url).then(perf => osu.singlePlayEmbed(perf))
                    .then(result => {
                        result.re.description = result.re.description.replace('<date>',
                            st.timeAt(st.findTimeZone(common.settings.tz, [userID, serverID]), new Date(result.date))
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
        const cmd = args.shift();

        if (commands[cmd]) new commands[cmd](bot, { user, userID, channelID, message, evt }).execute();
        else if (!fileReact) {
            if (message.indexOf('?') != -1 && (!serverID || !common.settings.servers[serverID].disableAnswers)) {
                msg(channelID, common.objectLib.answers[Math.floor(Math.random() * common.objectLib.answers.length)]);
            } else {
                msg(channelID, common.objectLib.defaultRes[Math.floor(Math.random() * common.objectLib.defaultRes.length)]);
            }
        }
    } else {
        // Messages without commands
        if (serverID && common.settings.servers[serverID].autoCompliment && common.settings.servers[serverID].autoCompliment.targets.indexOf(userID) != -1 && common.settings.servers[serverID].autoCompliment.enabled == true) {
            msg(channelID, `<@${ userID }> ${ common.objectLib.compliments[Math.floor(Math.random() * common.objectLib.compliments.length)] }`);
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
                    .catch(err => logger.error(err, { label: 'actions/channelMention' }));
            }
        }
    }

    // All messages''
    if (serverID && typeof common.settings.servers[serverID].autoShit == 'string' &&
        bot.servers[serverID].members[userID] &&
        bot.servers[serverID].members[userID].roles.indexOf(common.settings.servers[serverID].autoShit) != -1 &&
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
            }, err => { if (err) logger.error(err, { label: 'actions/selfEmbed' }); });
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
        }, err => { if (err) logger.error(err, { label: 'actions/emojiResponse' }); });
    }
});

function osuEmbedIdentifier(embed) {
    if (embed && embed.title && embed.title.indexOf('osu!') > -1) for (const type of [
        'profile',
        'top',
    ]) if (embed.title.indexOf(type) > -1) return type;
    return null;
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
                            st.timeAt(st.findTimeZone(common.settings.tz, [evt.d.user_id, evt.d.guild_id]), new Date(result.date))
                        );
                        return result.re;
                    })
                    .catch(err => logger.error(err, { label: 'reactions/osu' }))
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

function addLatestMsgToEmbed(me, channelID, limit = 5) {
    return new Promise((resolve, reject) => bot.getMessages({ channelID, limit }, (err, messageList) => {
        if (err) reject(err);
        else {
            for (const message of messageList) addMessageToEmbed(message, me);
            me.fields.reverse();
            resolve(me);
        }
    }));
}

function addMessageToEmbed(message, embed = new Embed('Message')) {
    let extra = '';
    if (!embed.image.url) {
        const imageUrls = getMessageImageUrls(message);
        if (imageUrls.length > 0) {
            embed.image.url = imageUrls[0];
            extra = ' (image below)';
        }
    }

    embed.addField(
        message.author.username + extra,
        message.content || '`<attachment>`'
    );

    return embed;
}

function getMessageImageUrls(message) {
    const imageUrls = [];

    // Find images from message attachments.
    imageUrls.push(...message.attachments
        .map(value => value.url)
        .filter(isImageUrl)
    );

    // Find images from message content.
    imageUrls.push(...message.content.split(' ')
        .filter(value => isUrl(value))
        .filter(isImageUrl)
    );

    return imageUrls;
}

function isImageUrl(url) {
    let isImage = false;
    for (const ext of ['.gif', '.jpg', '.jpeg', '.png']) if (url.indexOf(ext) > -1) isImage = true;
    return isImage;
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
        if (!common.settings.servers[evt.d.id]) common.settings.servers[evt.d.id] = {};
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
                    const [offset, profOwner] = embed.title
                        .replace('Showing top ', '')
                        .replace('osu! plays from ', '')
                        .split(' ');

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
            if (config.canvasEnabled) {
                if (bsga.players[evt.d.user_id]) bsga.players[evt.d.user_id].online = true;
                else bsga.players[evt.d.user_id] = new BSPlayer(evt.d.user_id, bot.users[evt.d.user_id].username, bsga.canvas);
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
            } else msg(evt.d.channel_id, 'Bot owner has not enabled this feature.');
        }
    })
        .then(() => bot.removeReaction({
            channelID: evt.d.channel_id,
            messageID: evt.d.message_id,
            userID: evt.d.user_id,
            reaction: evt.d.emoji.name
        }))
        .catch(err => logger.error(err, { label: 'reactions/bs' }));
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
        else logger.error(err, 'bot/msg');
    } });
}

function updateObjectLib() {
    // Update help
    for (const page in common.objectLib.help) {
        for (const field of common.objectLib.help[page].fields) {
            field.name = field.name.split('GerpBot').join(bot.username);
            field.value = field.value.split('GerpBot').join(bot.username);
        }
        common.objectLib.help[page].description = common.objectLib.help[page].description.split('GerpBot').join(bot.username);
    }

    // Update help color
    for (const field of common.objectLib.help.color.fields) {
        const listOfColors = [];
        for (const color in colors) listOfColors.push(color);
        field.value = field.value.replace('<list of colors>', listOfColors.join('* • *'));
    }

    // Update games
    for (const game in common.objectLib.games) {
        common.objectLib.games[game] = common.objectLib.games[game].split('@GerpBot').join(`@${ bot.username }`);
    }

    // Update defaultRes
    for (const res in common.objectLib.defaultRes) {
        common.objectLib.defaultRes[res] = common.objectLib.defaultRes[res].split('GerpBot').join(bot.username);
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
            name: common.objectLib.games[Math.floor(Math.random() * common.objectLib.games.length)],
            type: 0
        }
    }), 60000);

    const rainbowColors = ['#ff0000', '#ff6a00', '#ffff00', '#00ff00', '#0000ff', '#ff00ff'];
    let i = 0;
    setInterval(() => {
        if (online) {
            if (i >= rainbowColors.length) i = 0;

            for (const server in common.settings.servers) if (bot.servers[server]) {
                if (common.settings.servers[server].effects && common.settings.servers[server].effects.rainbow) {
                    editColor(server, rainbowColors[i]);
                }

                if (common.settings.servers[server].effects && common.settings.servers[server].effects.shuffle) {
                    const newName = common.settings.servers[server].nick.split('');
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
                tzConv[1] = st.timeAt(st.findTimeZone(common.settings.tz, [channel]), new Date(tzConv[1]));
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
                if (err) logger.error(err, { label: 'fs/ile' });
            });
        });
    }
}

function startReminding() {
    const test = new Reminder();
    for (const user in common.settings.reminders) for (const rem of common.settings.reminders[user])
        if (test.ready(rem)) common.settings.reminders[user].splice(common.settings.reminders[user].indexOf(rem), 1, new Reminder(rem).activate());
}

/**
 * @arg {Snowflake} serverID
 * @arg {Number|String} color
 */
function editColor(serverID, color) {
    if (pc.userHasPerm(serverID, bot.id, 'GENERAL_MANAGE_ROLES')) bot.editRole({
        serverID,
        roleID: common.settings.servers[serverID].color.role,
        color
    }, err => { if (err) logger.error(err, { label: 'bot/edit' }); });
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
    }, err => { if (err) logger.error(err, { label: 'bot/edit' }); });
}

function getBotRole(serverID) {
    for (const role of bot.servers[serverID].members[bot.id].roles)
        if (bot.servers[serverID].roles[role].name === bot.username) {
            common.settings.servers[serverID].roleID = bot.servers[serverID].roles[role].id;
            common.settings.update();
            return common.settings.servers[serverID].roleID;
        }
    return null;
}

function addColorRole(serverID) {
    // Check bot's permission to Manage Roles
    if (!pc.userHasPerm(serverID, bot.id, 'GENERAL_MANAGE_ROLES')) return Promise.reject(new CustomError({
        name: 'Missing permissions!', message: 'Manage Roles'
    }));

    // Return if role is saved to settings, exists in the server and is assigned to the bot
    if (common.settings.servers[serverID].color.role &&
        bot.servers[serverID].roles[common.settings.servers[serverID].color.role] &&
        bot.servers[serverID].members[bot.id].roles.indexOf(common.settings.servers[serverID].color.role) > 0
    ) return Promise.resolve(common.settings.servers[serverID].color.role);

    // Make sure roleID is defined
    if (!common.settings.servers[serverID].roleID) getBotRole(serverID);

    // Fix the gaps
    return new Promise((resolve, reject) => {
        let isMissingRole = true;

        // Find existing role from server
        for (const role in bot.servers[serverID].roles) {
            if (
                bot.servers[serverID].roles[role].name === `${ bot.username } color` &&
                bot.servers[serverID].roles[role].position <
                bot.servers[serverID].roles[common.settings.servers[serverID].roleID].position
            ) {
                isMissingRole = false;
                resolve(bot.servers[serverID].roles[role].id);
            }
        }

        // Create a new role for the bot
        if (isMissingRole) bot.createRole(serverID, (err, res) => {
            if (err) reject(err);
            else bot.editRole({
                serverID,
                roleID: res.id,
                name: `${ bot.username } color`,
                color: colors.gerp
            }, (err, res) => err ? reject(err) : resolve(res.id));
        });
    })
        // Assign the found role to the bot
        .then(roleID => new Promise((resolve, reject) => bot.addToRole({
            serverID,
            userID: bot.id,
            roleID
        }, err => err ? reject(err) : resolve(roleID))))
        .then(roleID => (common.settings.servers[serverID].color.role = roleID));
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
            else if (common.settings.servers[serverID] && common.settings.servers[serverID].color && common.settings.servers[serverID].color.value)
                color = common.settings.servers[serverID].color.value;
            else
                color = colors.gerp;
        }
    }

    return color;
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
