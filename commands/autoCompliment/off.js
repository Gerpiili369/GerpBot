const
    Command = require('../command'),
    common = require('../../scripts/common');

class AutoComplimentOff extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.otherRequirements.push('adminOnly');
    }

    command() {
        common.settings.servers[this.serverID].autoCompliment.enabled = false;
        this.msg(this.channelID, 'Automatic complimenting turned OFF.');
    }
}

module.exports = AutoComplimentOff;
