const
    Command = require('../command'),
    common = require('../../scripts/common');

class EffectRainbow extends Command {
    command() {
        this.bot.addColorRole(this.serverID)
            .then(() => {
                if (common.settings.servers[this.serverID].effects.rainbow) {
                    common.settings.servers[this.serverID].effects.rainbow = false;
                    this.bot.editColor(this.serverID, `#${ (common.settings.servers[this.serverID].color.value || common.colors.gerp).toString(16) }`);
                    this.msg(this.channelID, 'Rainbow effect deactivated!');
                } else {
                    common.settings.servers[this.serverID].effects.rainbow = true;
                    this.msg(this.channelID, 'Rainbow effect activated!');
                }
                common.settings.update();
            })
            .catch(err => {
                if (err.name === 'Missing permissions!') {
                    this.pc.missage(this.msg, this.channelID, ['Manage Roles']);
                } else common.colorlogger.error(err, this.loggerMeta);
            });
    }
}

module.exports = EffectRainbow;
