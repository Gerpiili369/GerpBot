const
    st = require('snowtime'),
    Command = require('../commands/command'),
    Embed = require('../scripts/embed'),
    common = require('../scripts/common');

class NormalMessageHandler extends Command {

    execute() {
        // Automatic compliment.
        if (
            this.serverID &&
            common.settings.servers[this.serverID].autoCompliment &&
            common.settings.servers[this.serverID].autoCompliment.targets.indexOf(this.userID) > -1 &&
            common.settings.servers[this.serverID].autoCompliment.enabled == true
        ) {
            this.msg(this.channelID, `<@${ this.userID }> ${ common.objectLib.compliments[Math.floor(Math.random() * common.objectLib.compliments.length)] }`);
        }

        // Get mentioned channels.
        const mentionedChannels = [];
        for (const word of this.message.split(' ')) {
            const mChannel = st.stripNaNs(word);
            if (
                this.bot.channels[mChannel] &&
                this.channelID != mChannel &&
                mentionedChannels.indexOf(mChannel) < 0
            ) mentionedChannels.push(mChannel);
        }

        // Notify mentioned channels.
        for (const channel of mentionedChannels) {
            if (this.bot.channels[channel] && !this.pc.userHasPerm(this.bot.channels[channel].guild_id, this.bot.id, 'TEXT_EMBED_LINKS', channel))
                this.pc.missage(this.msg, channel, ['Embed Links']);
            else {
                const me = new Embed(
                    `#${ this.bot.channels[this.channelID].name } (${ this.bot.servers[this.serverID].name })`,
                    `*Latest messages:*`,
                    { color: this.bot.getColor(this.serverID, this.userID) }
                );

                this.bot.addLatestMsgToEmbed(me, this.channelID)
                    .then(me => this.msg(channel, 'This channel was mentioned on another channel.', me.errorIfInvalid()))
                    .catch(err => common.logger.error(err, { label: 'actions/channelMention' }));
            }
        }
    }
}

module.exports = NormalMessageHandler;
