const
    Command = require('./command'),
    Embed = require('../scripts/embed'),
    common = require('../scripts/common');

class BS extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.requiredPerms.push(
            {
                key: 'TEXT_MANAGE_MESSAGES',
                name: 'Manage Messages',
            },
            {
                key: 'TEXT_EMBED_LINKS',
                name: 'Embed Links',
            },
            {
                key: 'TEXT_READ_MESSAGE_HISTORY',
                name: 'Read Message History',
            },
            {
                key: 'TEXT_ADD_REACTIONS',
                name: 'Add Reactions',
            },
        );
    }

    command() {
        if (common.config.canvasEnabled) this.msg(this.channelID, '', new Embed(
            'Blue Squares: The Game',
            { color: 255 }
        ));
        else this.msg(this.channelID, 'Bot owner has not enabled this feature.');
    }
}

module.exports = BS;
