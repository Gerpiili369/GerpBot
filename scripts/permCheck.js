const permDic = require('discord.io').Permissions

module.exports = bot => (server, user = bot.id, perm = 'admin', channel = '') => {
    // Owner override
    if (user == bot.servers[server].owner_id) return true;

    const permdex = permDic[perm];
    let hasPerm = false;
    // Server everyone permissions
    if (bot.servers[server].roles[server]._permissions.toString(2).split('').reverse()[permdex] == 1) hasPerm = true;

    // Server role permissions
    for (const role of bot.servers[server].members[user].roles) {
        // Admin override
        if (bot.servers[server].roles[role]._permissions.toString(2).split('').reverse()[3] == 1) return true;
        if (bot.servers[server].roles[role]._permissions.toString(2).split('').reverse()[permdex] == 1) hasPerm = true;
    }

    if (bot.channels[channel]) {
        if (bot.channels[channel].permissions.role[server]) {
            // Channel everyone deny
            if (bot.channels[channel].permissions.role[server].deny.toString(2).split('').reverse()[permdex] == 1) hasPerm = false;
            // Channel everyone allow
            if (bot.channels[channel].permissions.role[server].allow.toString(2).split('').reverse()[permdex] == 1) hasPerm = true;
        }

        for (const role in bot.channels[channel].permissions.role) {
            if (bot.servers[server].members[user].roles.indexOf(role) != -1) {
                // Channel role deny
                if (bot.channels[channel].permissions.role[role].deny.toString(2).split('').reverse()[permdex] == 1) {
                    hasPerm = false;
                }
                // Channel role allow
                if (bot.channels[channel].permissions.role[role].allow.toString(2).split('').reverse()[permdex] == 1) {
                    hasPerm = true;
                    break;
                }
            }
        }

        if (bot.channels[channel].permissions.user[user]) {
            // Channel user deny
            if (bot.channels[channel].permissions.user[user].allow.toString(2).split('').reverse()[permdex] == 1) hasPerm = true;
            // Channel user allow
            if (bot.channels[channel].permissions.user[user].deny.toString(2).split('').reverse()[permdex] == 1) hasPerm = false;
        }
    }

    return hasPerm;
}