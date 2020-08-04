const { Permissions } = require('discord.io'),
    Embed = require('./embed'),
    NONE = 0,
    ALL = Object.values(Permissions).reduce((all, permission) => all | (1 << permission), NONE);

module.exports = bot => ({
    calculateOverrides(serverID, userID = bot.id, channelID = '') {
        // Owner override
        if (userID == bot.servers[serverID].owner_id) return ALL;

        // Server everyone permissions
        let permissions = bot.servers[serverID].roles[serverID]._permissions;

        // Server role permissions
        for (const role of bot.servers[serverID].members[userID].roles)
            permissions |= bot.servers[serverID].roles[role]._permissions;

        // Admin override
        if (permissions & 8) return ALL;

        if (bot.channels[channelID]) {
            if (bot.channels[channelID].permissions.role[serverID]) {
                // Channel everyone deny
                permissions &= ~bot.channels[channelID].permissions.role[serverID].deny;
                // Channel everyone allow
                permissions |= bot.channels[channelID].permissions.role[serverID].allow;
            }

            let allow = NONE,
                deny = NONE;
            for (const role of bot.servers[serverID].members[userID].roles) {
                if (bot.channels[channelID].permissions.role[role]) {
                    allow |= bot.channels[channelID].permissions.role[role].allow;
                    deny |= bot.channels[channelID].permissions.role[role].deny;
                }
            }
            // Channel role deny
            permissions &= ~deny;
            // Channel role allow
            permissions |= allow;

            if (bot.channels[channelID].permissions.user[userID]) {
                // Channel user deny
                permissions &= ~bot.channels[channelID].permissions.user[userID].deny;
                // Channel user allow
                permissions |= bot.channels[channelID].permissions.user[userID].allow;
            }
        }

        return permissions;
    },
    userHasPerm(serverID, userID = bot.id, perm = 'GENERAL_ADMINISTRATOR', channelID = '') {
        const PERMISSION = 1 << Permissions[perm];
        return (this.calculateOverrides(serverID, userID, channelID) & PERMISSION) == PERMISSION;
    },
    multiPerm(serverID, userID = bot.id, perms = [], channelID = '') {
        return new Promise((resolve, reject) => {
            const missing = [],
                permissions = this.calculateOverrides(serverID, userID, channelID);
            for (const perm of perms) if (permissions & (1 << Permissions[perm]) == 0) missing.push(perm);
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
