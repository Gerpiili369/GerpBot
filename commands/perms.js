const
    { Permissions } = require('discord.io'),
    st = require('snowtime'),
    Embed = require('../scripts/embed'),
    Command = require('./command'),
    common = require('../scripts/common');

class Perms extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.requiredPerms.push({
            key: 'TEXT_EMBED_LINKS',
            name: 'Embed Links',
        });

        this.argChecks[0] = 'user';
        this.argChecks[1] = 'channel';
        this.otherRequirements.push('serverOnly');
    }

    command() {
        const
            userID = st.stripNaNs(this.args[0]) || this.userID,
            permissions = this.pc.calculateOverrides(this.serverID, userID, st.stripNaNs(this.args[1]));

        let
            permsGranted = '',
            permsDenied = '';

        for (const perm in Permissions) {
            if (permissions & (1 << Permissions[perm])) permsGranted += `\`${ perm }\`\n`;
            else permsDenied += `\`${ perm }\`\n`;
        }

        if (permsGranted) this.bot.pending[this.channelID].push(new Embed(`Permissions granted`, permsGranted, { color: common.colors.green }));
        if (permsDenied) this.bot.pending[this.channelID].push(new Embed(`Permissions denied`, permsDenied, { color: common.colors.red }));
        this.msg(this.channelID, `<@${ userID }>'s permission report:`);
    }

}

module.exports = Perms;
