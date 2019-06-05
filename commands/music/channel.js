const
    st = require('snowtime'),
    common = require('../../scripts/common'),
    Command = require('../command');

class MusicChannel extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.otherRequirements.push('adminOnly');
    }

    command() {
        const acID = st.stripNaNs(this.args[1]);
        if (this.bot.channels[acID] && this.bot.channels[acID].type == 0 && this.bot.channels[acID].guild_id == this.serverID) {
            if (this.pc.userHasPerm(this.serverID, this.bot.id, 'TEXT_EMBED_LINKS', acID)) {
                common.settings.servers[this.serverID].audio.channel = common.mh.servers[this.serverID].acID = acID;
                common.settings.update();
                this.msg(this.channelID, 'Channel set!');
            } else {
                this.msg(this.channelID, 'Missing permission for target channel!');
                this.pc.missage(this.msg, this.channelID, ['Embed Links']);
            }
        } else this.msg(this.channelID, 'Invalid channel!');
    }
}

module.exports = MusicChannel;
