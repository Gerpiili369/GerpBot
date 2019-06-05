const
    isUrl = require('is-url'),
    st = require('snowtime'),
    Command = require('../command'),
    Reminder = require('../../scripts/reminder'),
    common = require('../../scripts/common');

class RemindCreate extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.requiredPerms.push({
            key: 'TEXT_EMBED_LINKS',
            name: 'Embed Links',
        });
    }

    command() {
        const rem = new Reminder({
            msg: this.msg,
            owner: {
                id: this.userID,
                name: this.user
            },
            channel: st.stripNaNs(this.args[0]),
            color: this.bot.getColor(this.serverID, this.userID)
        });

        // Reminder to other user or channel?
        if (this.bot.users[rem.channel] || this.bot.channels[rem.channel]) this.args.shift();
        else rem.channel = this.channelID;

        // Perms for receiving channel
        if (this.bot.channels[rem.channel] && !this.pc.userHasPerm(this.bot.channels[rem.channel].guild_id, this.bot.id, 'TEXT_EMBED_LINKS', rem.channel)) this.pc.missage(this.msg, this.channelID, ['Embed Links']);
        else {
            // Get specific time for reminder from args.
            this.setTimerToReminder(rem);

            // Check for invalid date.
            if (rem.time === 'Invalid Date') this.msg(this.channelID, 'Time syntax: `([<amount>](ms|s|min|h|d|y))...` or `[<YYYY>-<MM>-<DD>T]<HH>:<MM>[:<SS>]`.');
            else {
                // Get the amount of time before reminder activates from args.
                this.setAlarmToReminder(rem);

                // Check if message contains mentions and separate them from the rest of the message,
                this.addMentionsToReminder(rem);

                // Use function below to save latest image to reminder.
                this.bot.addLatestMsgToEmbed(rem.toEmbed(), this.channelID)
                    .then(embed => {
                        if (embed.image.url) {
                            rem.image = embed.image.url;
                            if (rem.links.indexOf(rem.image) > -1) rem.links.shift();
                        }

                        rem.activate();

                        if (!common.settings.reminders[this.userID]) common.settings.reminders[this.userID] = [];
                        common.settings.reminders[this.userID].push(rem);

                        common.settings.update();

                        this.msg(this.channelID, 'I will remind when the time comes...');
                    })
                    .catch(err => this.logger.error(err, this.loggerMeta));
            }
        }
    }

    setAlarmToReminder(rem) {
        if (isNaN(st.anyTimeToMs(this.args[0]))) {
            rem.time = this.args.shift();

            if (common.settings.tz[this.userID]) rem.time += common.settings.tz[this.userID];
            else if (this.serverID && common.settings.tz[this.serverID]) {
                rem.time += common.settings.tz[this.serverID];
                this.msg(this.channelID, `Using the server default UTC${ common.settings.tz[this.serverID] } timezone. You can change your timezone with "\`@${ this.bot.username } timezone\` -command".`);
            } else {
                rem.time += 'Z';
                this.msg(this.channelID, `Using the default UTC+00:00 timezone. You can change your timezone with "\`@${ this.bot.username } timezone\` -command".`);
            }

            rem.time = st.datemaker(rem.time);
            if (rem.time != 'Invalid Date') rem.time = rem.time.getTime();
        }
    }

    setTimerToReminder(rem) {
        for (const arg of this.args) if (isNaN(st.anyTimeToMs(arg))) {
            this.args.splice(0, this.args.indexOf(arg));
            rem.message = this.args.join(' ');
            break;
        } else rem.time += st.anyTimeToMs(arg);
    }

    addMentionsToReminder(rem) {
        // Role mentions
        for (const arg of this.args) {
            if (arg === '@everyone' || arg === '@here') rem.mentions += arg;
            else {
                const role = st.stripNaNs(arg);
                if (this.bot.channels[rem.channel] && this.bot.servers[this.bot.channels[rem.channel].guild_id].roles[role]) {
                    rem.mentions += `<@&${ role }>`;
                } else if (this.serverID && this.bot.servers[this.serverID].roles[role]) {
                    rem.message = rem.message.replace(arg, `@${ this.bot.servers[this.serverID].roles[role].name }`);
                } else if (isUrl(arg)) rem.links.push(arg);
            }
        }

        // User mentions
        if (this.bot.channels[rem.channel]) for (const mention of this.evt.d.mentions) {
            if (mention.id != this.bot.id) rem.mentions += `<@${ mention.id }> `;
        } else {
            // Target Test Color
            const ttc = this.bot.getColor(this.serverID, rem.channel, false);
            if (ttc != common.colors.default) rem.color = ttc;
            rem.mentions = '';
        }
    }
}

module.exports = RemindCreate;
