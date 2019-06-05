const
    Command = require('../command'),
    Embed = require('../../scripts/embed'),
    common = require('../../scripts/common');

class TimezoneServer extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.otherRequirements.push('serverOnly', 'adminOnly');
    }

    command() {
        common.settings.tz[this.serverID] = this.args[0];
        common.settings.update();
        this.msg(this.channelID, `Server timezone is set to: UTC${ this.args[0] }.`);
    }

    serverOnlyNotice() {
        this.msg(this.channelID, '', new Embed('Unauthorized timezoning command. Try to git gud instead.', 'This command is only available in servers.').error());
    }

    adminOnlyNotice() {
        this.msg(this.channelID, '', new Embed('Unauthorized timezoning command. Try to git gud instead.', 'Only server admins are allowed to use this command.').error());
    }
}

module.exports = TimezoneServer;
