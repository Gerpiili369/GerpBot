const
    Command = require('./command'),
    Embed = require('../scripts/embed'),
    common = require('../scripts/common');

class AutoAnswer extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.otherRequirements.push('serverOnly', 'adminOnly');
    }

    command() {
        if (common.settings.servers[this.serverID].disableAnswers) {
            common.settings.servers[this.serverID].disableAnswers = false;
            this.msg(this.channelID, 'Nothing can stop me now!');
        } else {
            common.settings.servers[this.serverID].disableAnswers = true;
            this.msg(this.channelID, 'You weren\'t asking me? Well, ok then.');
        }
        common.settings.update();
    }

    serverOnlyNotice() {
        this.msg(this.channelID, '', new Embed('You can\'t escape me here!', 'This command is only available in servers.').error());
    }
}

module.exports = AutoAnswer;
