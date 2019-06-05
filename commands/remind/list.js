const
    st = require('snowtime'),
    Command = require('../command'),
    Embed = require('../../scripts/embed'),
    common = require('../../scripts/common');

class RemindList extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.requiredPerms.push({
            key: 'TEXT_EMBED_LINKS',
            name: 'Embed Links',
        });
    }

    command() {
        const rle = new Embed('List of your reminders', { color: this.bot.getColor(this.serverID, this.userID) });

        if (common.settings.reminders[this.userID]) for (const rem of common.settings.reminders[this.userID]) {
            let channel = rem.channel;

            if (this.bot.channels[rem.channel])
                channel = `<#${ rem.channel }> (${ this.bot.servers[this.bot.channels[rem.channel].guild_id].name })`;
            else if (this.bot.directMessages[rem.channel])
                channel = `<@${ this.bot.directMessages[rem.channel].recipient.id }> (DM)`;
            else if (this.bot.users[rem.channel])
                channel = `<@${ rem.channel }> (DM)`;

            rle.addField(
                `Reminder #${ common.settings.reminders[this.userID].indexOf(rem) }`,
                `Time: ${ st.timeAt(st.findTimeZone(common.settings.tz, [this.userID, this.serverID]), new Date(rem.time)) }\n` +
                `Channel: ${ channel }\n` +
                `Message: ${ rem.message || '' }`
            );
        }

        rle.isValid();
        this.msg(this.channelID, '', rle.pushToIfMulti(this.bot.pending[this.channelID]).errorIfInvalid());
    }
}

module.exports = RemindList;
