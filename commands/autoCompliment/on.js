const
    Command = require('../command'),
    common = require('../../scripts/common');

class AutoComplimentOn extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.otherRequirements.push('adminOnly');
    }

    command() {
        common.settings.servers[this.serverID].autoCompliment.enabled = true;
        this.msg(this.channelID, 'Automatic complimenting turned ON.');
    }
}

module.exports = AutoComplimentOn;
