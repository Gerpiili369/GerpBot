const
    common = require('../../scripts/common'),
    Command = require('../command');

class MusicList extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.requiredPerms.push({
            key: 'TEXT_EMBED_LINKS',
            name: 'Embed Links',
        });
    }

    command() {
        const qe = common.mh.servers[this.serverID].queueEmbed(this.userID);
        qe.isValid();
        this.msg(this.channelID, '', qe.pushToIfMulti(this.bot.pending[this.channelID]).errorIfInvalid());
    }
}

module.exports = MusicList;
