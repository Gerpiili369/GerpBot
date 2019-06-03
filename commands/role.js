const
    st = require('snowtime'),
    Command = require('./command'),
    Embed = require('../scripts/embed'),
    common = require('../scripts/common');

class Role extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.requiredPerms.push({
            key: 'TEXT_EMBED_LINKS',
            name: 'Embed Links',
        });

        this.otherRequirements.push('serverOnly');

        this.argChecks[0] = 'role';
    }

    command() {
        if (this.args[0]) {
            const
                role = this.bot.servers[this.serverID].roles[st.stripNaNs(this.args[0])],
                re = new Embed(
                    `Information about "${ role.name }"`,
                    `<@&${ role.id }>\n` +
                    `**Role created:** \`${ st.timeAt(st.findTimeZone(common.settings.tz, [this.userID, this.serverID]), st.sfToDate(role.id)) }\`\n` +
                    `**Age:** ${ new st.Uptime(st.sfToDate(role.id)) }\``, {
                        color: role.color
                    }
                );

            const rollMembers = [];
            for (const user in this.bot.servers[this.serverID].members)
                if (this.bot.servers[this.serverID].members[user].roles.indexOf(role.id) != -1) rollMembers.push(user);

            for (const user of rollMembers) re.addDesc(`\n<@${ user }>`);

            this.msg(this.channelID, 'Here is the gang:', re.errorIfInvalid());
        } else this.msg(this.channelID, 'What is that supposed to be? It is called "role" not "roll"!');
    }

    serverOnlyNotice() {
        this.msg(this.channelID, '', new Embed('Please wait a moment. Let me just check that role in this PM.', 'This command is only available in servers.').error());
    }
}

module.exports = Role;
