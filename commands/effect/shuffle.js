const
    Command = require('../command'),
    common = require('../../scripts/common');

class EffectShuffle extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.requiredPerms.push({
            key: 'GENERAL_CHANGE_NICKNAME',
            name: 'Change Nickname',
        });
    }

    command() {
        if (common.settings.servers[this.serverID].effects.shuffle) setTimeout(() => {
            common.settings.servers[this.serverID].effects.shuffle = false;
            this.bot.editNick(this.serverID, common.settings.servers[this.serverID].nick);
            this.msg(this.channelID, 'Shuffle effect deactivated!');
            common.settings.update();
        }, 1000);
        else {
            common.settings.servers[this.serverID].effects.shuffle = true;
            common.settings.servers[this.serverID].nick = this.bot.servers[this.serverID].members[this.bot.id].nick || this.bot.username;
            this.msg(this.channelID, 'Shuffle effect activated!');
            common.settings.update();
        }
    }
}

module.exports = EffectShuffle;
