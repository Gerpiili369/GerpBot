const
    Command = require('./command'),
    Embed = require('../scripts/embed'),
    common = require('../scripts/common');

class Help extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.requiredPerms = [
            {
                key: 'TEXT_EMBED_LINKS',
                name: 'Embed Links',
            },
        ];
    }

    command() {
        const help = new Embed((this.args[0] && common.objectLib.help[this.args[0]]) || common.objectLib.help.main);
        help.color = this.bot.getColor(this.serverID, this.userID);
        if (!help.thumbnail.url) help.thumbnail.url = common.avatarUrl(this.bot);
        if (!help.image.url) help.image.url = `https://img.shields.io/badge/bot-${ this.bot.username.replace(' ', '_') }-${ help.color.toString(16).padStart(6, '0') }.png`;
        help.isValid();
        return this.msg(this.channelID, '', help.pushToIfMulti(this.bot.pending[this.channelID]).errorIfInvalid());
    }
}

module.exports = Help;
