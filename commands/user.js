const
    st = require('snowtime'),
    Command = require('./command'),
    Embed = require('../scripts/embed'),
    common = require('../scripts/common');

class User extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.requiredPerms.push({
            key: 'TEXT_EMBED_LINKS',
            name: 'Embed Links',
        });

        this.argChecks[0] = 'user';
    }

    command() {
        if (this.args[0]) {
            this.args[0] = st.stripNaNs(this.args[0]);

            const ui = {
                id: this.args[0],
                roles: []
            };

            ui.color = this.bot.getColor(this.serverID, ui.id, false);

            const ue = new Embed(
                `Information about "${ this.bot.users[ui.id].username }#${ this.bot.users[ui.id].discriminator }"`,
                `**Also known as:** "<@${ ui.id }>"\n` +
                `**User created:** \`${ st.timeAt(st.findTimeZone(common.settings.tz, [this.userID, this.serverID]), st.sfToDate(ui.id)) }\`\n` +
                `**Age:** \`${ new st.Uptime(st.sfToDate(ui.id)).toString() }\``, {
                    color: ui.color,
                    thumbnail: {
                        url: common.avatarUrl(this.bot.users[ui.id])
                    },
                    image: {
                        url: encodeURI(`https://img.shields.io/badge/${ this.bot.users[ui.id].bot ? 'bot' : 'user' }-${ this.bot.users[ui.id].username }-${ ui.color.toString(16).padStart(6, '0') }.png`)
                    }
                }
            );

            if (common.settings.tz[ui.id]) ue.addDesc(`\n**Local time:** \`${ st.timeAt(common.settings.tz[ui.id]) }\``);

            const cleanRoll = [];
            let status = '';
            if (this.serverID) {
                ue.timestamp = new Date(this.bot.servers[this.serverID].members[ui.id].joined_at);
                ue.footer = {
                    icon_url: `https://cdn.discordapp.com/icons/${ this.serverID }/${ this.bot.servers[this.serverID].icon }.png`,
                    text: `${ this.bot.users[ui.id].username } joined this server on`
                };

                for (const role in this.bot.servers[this.serverID].roles)
                    if (this.bot.servers[this.serverID].members[ui.id].roles.indexOf(role) != -1)
                        ui.roles[this.bot.servers[this.serverID].roles[role].position] = `<@&${ role }>`;

                for (const role of ui.roles)
                    if (role) cleanRoll.push(role);
                ui.roles = cleanRoll.reverse();

                switch (this.bot.servers[this.serverID].members[ui.id].status) {
                    case 'online':
                        status = '✅ Online';
                        break;
                    case 'idle':
                        status = '💤 Idle';
                        break;
                    case 'dnd':
                        status = '⛔ Do not disturb';
                        break;
                    default:
                        status = '⚫ Offline';
                        break;
                }
                ue.addDesc(`\n**Status:** ${ status }`);

                if (ui.roles.length > 0) ue.addDesc('\n**Roles:** ');
                for (const role of ui.roles) ue.addDesc(` ${ role }`);
            }

            this.msg(this.channelID, 'High quality spying:', ue.errorIfInvalid());
        } else this.msg(this.channelID, 'I would give you the info you seek, but it is clear you don\'t even know what you want');
    }
}

module.exports = User;
