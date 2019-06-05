const
    EffectRainbow = require('./rainbow'),
    EffectShuffle = require('./shuffle'),
    Command = require('../command'),
    Embed = require('../../scripts/embed'),
    common = require('../../scripts/common');

class Effect extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.otherRequirements.push('serverOnly', 'adminOnly');
    }

    command() {
        if (!common.settings.servers[this.serverID].color) common.settings.servers[this.serverID].color = {};
        if (!common.settings.servers[this.serverID].effects) common.settings.servers[this.serverID].effects = {
            rainbow: false, shuffle: false
        };

        switch (this.args[0]) {
            case 'rainbow':
                new EffectRainbow(this.bot, this.params).execute();
                break;
            case 'shuffle':
                new EffectShuffle(this.bot, this.params).execute();
                break;
            default:
                this.msg(this.channelID, 'Shuffle or rainbow?');
                break;
        }
    }

    serverOnlyNotice() {
        this.msg(this.channelID, '', new Embed('I think that is a bad idea...', 'This command is only available in servers.').error());
    }
}

module.exports = Effect;
