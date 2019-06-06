const permDic = require('discord.io').Permissions,
    Embed = require('./embed');

module.exports = bot => ({
    roleHasPerm(serverID, role, perm = 'GENERAL_ADMINISTRATOR', channelID = '') {
        // Admin override
        if (bot.servers[serverID].roles[role]._permissions
            .toString(2).split('')
            .reverse()[3] == 1
        ) return true;

        const permdex = permDic[perm];
        let hasPerm = false;

        // Server everyone permissions
        if (bot.servers[serverID].roles[serverID]._permissions
            .toString(2).split('')
            .reverse()[permdex] == 1
        ) hasPerm = true;

        // Server role permissions
        if (bot.servers[serverID].roles[role]._permissions
            .toString(2).split('')
            .reverse()[permdex] == 1
        ) hasPerm = true;

        // Channel role permissions
        if (channelID) {
            // Channel role deny
            if (bot.channels[channelID].permissions.role[role].deny
                .toString(2).split('')
                .reverse()[permdex] == 1
            ) hasPerm = false;

            // Channel role allow
            if (bot.channels[channelID].permissions.role[role].allow
                .toString(2).split('')
                .reverse()[permdex] == 1
            ) hasPerm = true;
        }

        return hasPerm;
    },
    userHasPerm(serverID, user = bot.id, perm = 'GENERAL_ADMINISTRATOR', channelID = '') {
        // Owner override
        if (user == bot.servers[serverID].owner_id) return true;

        const permdex = permDic[perm];
        let hasPerm = false;
        // Server everyone permissions
        if (bot.servers[serverID].roles[serverID]._permissions
            .toString(2).split('')
            .reverse()[permdex] == 1
        ) hasPerm = true;

        // Server role permissions
        for (const role of bot.servers[serverID].members[user].roles) {
            // Admin override
            if (this.roleHasPerm(serverID, role)) return true;
            if (this.roleHasPerm(serverID, role, perm)) hasPerm = true;
        }

        if (bot.channels[channelID]) {
            if (bot.channels[channelID].permissions.role[serverID]) {
                // Channel everyone deny
                if (bot.channels[channelID].permissions.role[serverID].deny
                    .toString(2).split('')
                    .reverse()[permdex] == 1
                ) hasPerm = false;

                // Channel everyone allow
                if (bot.channels[channelID].permissions.role[serverID].allow
                    .toString(2).split('')
                    .reverse()[permdex] == 1
                ) hasPerm = true;
            }

            for (const role in bot.channels[channelID].permissions.role) {
                if (hasPerm) break;
                if (bot.servers[serverID].members[user].roles.indexOf(role) != -1) {
                    // Channel role deny
                    if (bot.channels[channelID].permissions.role[role].deny
                        .toString(2).split('')
                        .reverse()[permdex] == 1
                    ) hasPerm = false;

                    // Channel role allow
                    if (bot.channels[channelID].permissions.role[role].allow
                        .toString(2).split('')
                        .reverse()[permdex] == 1
                    ) hasPerm = true;
                }
            }

            if (bot.channels[channelID].permissions.user[user]) {
                // Channel user deny
                if (bot.channels[channelID].permissions.user[user].allow
                    .toString(2).split('')
                    .reverse()[permdex] == 1
                ) hasPerm = true;

                // Channel user allow
                if (bot.channels[channelID].permissions.user[user].deny
                    .toString(2).split('')
                    .reverse()[permdex] == 1
                ) hasPerm = false;
            }
        }

        return hasPerm;
    },
    multiPerm(serverID, user = bot.id, perms = [], channelID = '') {
        return new Promise((resolve, reject) => {
            const missing = [];
            for (const perm of perms) if (!this.userHasPerm(serverID, user, perm, channelID)) missing.push(perm);
            if (missing.length === 0) resolve(perms);
            else reject(missing);
        });
    },
    missage(msg, channelID, perms = []) {
        if (this.userHasPerm(bot.channels[channelID].guild_id, bot.id, 'TEXT_EMBED_LINKS', channelID)) {
            msg(channelID, '', new Embed(
                'Following permissions required:',
                `\`${ perms.join('\n') }\``
            ).error()
                .errorIfInvalid());
        } else msg(channelID, `Following permissions required:\n\`${ perms.join('\n') }\``);
    }
});
