const
    st = require('snowtime'),
    Command = require('./command'),
    Embed = require('../scripts/embed'),
    common = require('../scripts/common');

class Server extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.requiredPerms.push(
            {
                key: 'TEXT_READ_MESSAGE_HISTORY',
                name: 'Read Message History',
            },
            {
                key: 'TEXT_ADD_REACTIONS',
                name: 'Add Reactions '
            },
        );

        this.otherRequirements.push('serverOnly', 'adminOnly');

        this.argChecks[1] = 'role';
    }

    command() {
        switch (this.args[0]) {
            case 'set':
                if (this.args[1]) {
                    this.args[1] = st.stripNaNs(this.args[1]);
                    common.settings.servers[this.serverID].autoShit = this.args[1];
                    this.msg(this.channelID, `<@&${ this.args[1] }> has been chosen to be shit.`);
                } else {
                    this.msg(this.channelID, `*Set hit the fan.*`);
                }
                break;
            case 'clean':
                common.settings.servers[this.serverID].autoShit = null;
                this.msg(this.channelID, `Shit has been cleaned up...`);
                break;
            default:
                this.msg(this.channelID, `Missing arguments. Usage: \`@${ this.bot.username } shit set <@role> | clean\`.`);
                break;
        }
        common.settings.update();
    }

    serverOnlyNotice() {
        this.msg(this.channelID, '', new Embed('no u', 'This command is only available in servers.').error());
        this.emojiResponse('💩');
    }

    adminOnlyNotice() {
        this.msg(this.channelID, '', new Embed('Request denied, not admin', 'Only server admins are allowed to use this command.').error());
    }
}

module.exports = Server;
