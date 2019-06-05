const
    Command = require('../command'),
    Embed = require('../../scripts/embed'),
    common = require('../../scripts/common');

class AutoComplimentList extends Command {
    command() {
        const list = common.settings.servers[this.serverID].autoCompliment.targets.map(value => `<@${ value }>`);

        if (this.pc.userHasPerm(this.serverID, this.bot.id, 'TEXT_EMBED_LINKS', this.channelID))
            this.msg(this.channelID, '', new Embed('List of cool people:', list.join('\n'), {
                color: this.bot.getColor(this.serverID, this.userID),
            }).errorIfInvalid());
        else
            this.msg(this.channelID, list.join('\n'));
    }
}

module.exports = AutoComplimentList;
