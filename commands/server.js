const
    st = require('snowtime'),
    Command = require('./command'),
    Embed = require('../scripts/embed'),
    common = require('../scripts/common');

class Server extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.requiredPerms.push({
            key: 'TEXT_EMBED_LINKS',
            name: 'Embed Links',
        });

        this.otherRequirements.push('serverOnly');
    }

    command() {
        const si = {
            members: {
                online: 0,
                idle: 0,
                dnd: 0,
                offline: 0,
                bots: 0
            },
            channels: {
                0: 0,
                2: 0,
                4: 0
            }
        };

        for (const member in this.bot.servers[this.serverID].members) {
            if (this.bot.users[member].bot) si.members.bots++;
            else {
                let status = this.bot.servers[this.serverID].members[member].status;
                if (!status) status = 'offline';
                si.members[status]++;
            }
        }

        for (const channel in this.bot.servers[this.serverID].channels) {
            const type = this.bot.servers[this.serverID].channels[channel].type;
            if (type == 0 || type == 2 || type == 4) si.channels[type]++;
        }

        const ie = new Embed(
            `Information about "${ this.bot.servers[this.serverID].name }"`,
            `**Created by:** <@${ this.bot.servers[this.serverID].owner_id }>\n` +
            `**Creation date:** \`${ st.timeAt(st.findTimeZone(common.settings.tz, [this.userID, this.serverID]), st.sfToDate(this.serverID)) }\`\n` +
            `**Age:** \`${ new st.Uptime(st.sfToDate(this.serverID)).toString() }\``, {
                color: this.bot.getColor(this.serverID, this.userID),
                timestamp: this.bot.servers[this.serverID].joined_at,
                footer: {
                    icon_url: common.avatarUrl(this.bot),
                    text: `${ common.settings.servers[this.serverID].nick ? common.settings.servers[this.serverID].nick : this.bot.username } joined this server on`
                },
                thumbnail: {
                    url: `https://cdn.discordapp.com/icons/${ this.serverID }/${ this.bot.servers[this.serverID].icon }.png`
                },
            }
        );

        ie
            .addField(
                'Members:',
                `✅ Online: ${ si.members.online }\n💤 Idle: ${ si.members.idle }\n⛔ Do not disturb: ${ si.members.dnd }\n⚫ Offline: ${ si.members.offline }`,
                true
            )
            .addField(
                'Channels:',
                `💬 Text: ${ si.channels[0] }\n🎙️ Voice: ${ si.channels[2] }\n📁 Category: ${ si.channels[4] }`,
                true
            )
            .addField(
                'More stuff:',
                `Roles: ${ Object.keys(this.bot.servers[this.serverID].roles).length }, Emojis: ${ Object.keys(this.bot.servers[this.serverID].emojis).length }/50, Bots: ${ si.members.bots }`,
                true
            );

        if (common.settings.tz[this.serverID]) ie.addDesc(`\n**Server time:** \`${ st.timeAt(common.settings.tz[this.serverID]) }\``);

        this.msg(this.channelID, 'Here you go:', ie.errorIfInvalid());
    }

    serverOnlyNotice() {
        this.msg(this.channelID, '', new Embed('This is a private conversation!', 'This command is only available in servers.').error());
    }
}

module.exports = Server;
