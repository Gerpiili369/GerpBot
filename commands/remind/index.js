const
    RemindList = require('./list'),
    RemindCancel = require('./cancel'),
    RemindCreate = require('./create'),
    Command = require('../command'),
    Reminder = require('../../scripts/reminder'),
    common = require('../../scripts/common');

class Remind extends Command {
    command() {
        if (this.args[0]) {
            switch (this.args[0]) {
                case 'list':
                    new RemindList(this.bot, this.params).execute();
                    break;
                case 'cancel':
                    new RemindCancel(this.bot, this.params).execute();
                    break;
                default:
                    new RemindCreate(this.bot, this.params).execute();
            }
        } else if (this.serverID && !this.pc.userHasPerm(this.serverID, this.bot.id, 'TEXT_EMBED_LINKS', this.channelID)) {
            this.pc.missage(this.msg, this.channelID, ['Embed Links']);
        } else new Reminder({
            mentions: `<@${ this.userID }>`,
            owner: {
                name: this.bot.username,
                id: this.bot.id
            },
            color: common.colors.error,
            channel: this.channelID,
            message: `**How to** \n` +
                'Do stuff:\n' +
                `\`@${ this.bot.username } remind list | (cancel <number>)\`\n` +
                'Set reminder at a specific time:\n' +
                `\`@${ this.bot.username } remind [<#channel>|<@mention>] [<YYYY>-<MM>-<DD>T]<HH>:<MM>[:<SS>] [<message>]...\`\n` +
                'Set reminder after set amount of time:\n' +
                `\`@${ this.bot.username } remind [<#channel>|<@mention>] ([<amount>]ms|[<amount>]s|[<amount>]min|[<amount>]h|[<amount>]d|[<amount>]y)... [<message>]...\``
        }).activate();
    }
}

module.exports = Remind;
