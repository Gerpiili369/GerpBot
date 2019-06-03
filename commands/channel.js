const
    st = require('snowtime'),
    Command = require('./command'),
    Embed = require('../scripts/embed'),
    common = require('../scripts/common');

class Channel extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.requiredPerms.push({
            key: 'TEXT_EMBED_LINKS',
            name: 'Embed Links',
        });

        this.argChecks[0] = 'channel';
    }

    command() {
        this.args[0] = st.stripNaNs(this.args[0]);

        const ci = {
            id: this.args[0] || this.channelID,
        };

        if (this.bot.channels[ci.id]) ci.serverID = this.bot.channels[ci.id].guild_id;

        const ce = new Embed(
            `Information about "${ ci.serverID ? `#${ this.bot.channels[ci.id].name }` : `@${ this.bot.username }" (DM channel)` }`, {
                color: this.bot.getColor(this.serverID, this.userID)
            }
        );

        if (ci.serverID) {
            if (this.bot.channels[ci.id].topic) ce.addDesc(`**Topic:** ${ this.bot.channels[ci.id].topic }\n`);
            ce.addDesc(`**Server:** ${ this.bot.servers[ci.serverID].name }\n`);
            if (this.bot.channels[ci.id].parent_id) ce.addDesc(`**Channel group:** ${ this.bot.channels[this.bot.channels[ci.id].parent_id].name.toUpperCase() }\n`);
        } else ce.thumbnail.url = common.avatarUrl(this.bot);

        ce.addDesc(`**Channel created:** \`${ st.timeAt(st.findTimeZone(common.settings.tz, [this.userID, this.serverID]), st.sfToDate(ci.id)) }\`\n`);
        ce.addDesc(`**Age:** \`${ new st.Uptime(st.sfToDate(ci.id)).toString() }\`\n`);

        if (ci.serverID && this.bot.channels[ci.id].nsfw) ce.addDesc(`*Speaking of age, this channel is marked as NSFW, you have been warned.*\n`);

        ce.addDesc('**Members:** ');
        if (
            !ci.serverID ||
            Object.keys(this.bot.channels[ci.id].permissions.user).length > 0 ||
            Object.keys(this.bot.channels[ci.id].permissions.role).length > 0
        ) {
            ci.members = this.membersInChannel(ci.id);

            if (!ci.serverID || ci.members.length !== Object.keys(this.bot.servers[ci.serverID].members).length)
                for (const user of ci.members) ce.addDesc(`<@${ user }>`);
            else ce.addDesc(' @everyone');
        } else ce.addDesc(' @everyone');

        ce.addDesc('\n');

        this.msg(this.channelID, 'channel info', ce.errorIfInvalid());
    }
}

module.exports = Channel;
