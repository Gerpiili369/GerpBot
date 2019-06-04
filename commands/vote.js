const
    st = require('snowtime'),
    Command = require('./command'),
    Embed = require('../scripts/embed'),
    common = require('../scripts/common');

class Vote extends Command {
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
        const
            options = [],
            targetUser = st.stripNaNs(this.args[1]),
            ve = new Embed({
                color: this.bot.getColor(this.serverID, this.userID),
                footer: { text: 'Vote generated by your\'s truly.' }
            });

        switch (this.args[0]) {
            case 'gold':
                ve.description = `**Let's vote for ${ this.args[1] }'s next golden gun!**`;
                ve.color = this.bot.getColor(this.serverID, this.targetUser);
                if (this.bot.users[targetUser]) ve.thumbnail.url =
                    common.avatarUrl(this.bot.users[targetUser]);

                options.push(...this.args.splice(2));

                break;
            default:
                ve.description = '**Let\'s do a vote!**';
                options.push(...this.args.splice(0));
        }

        ve.addDesc(`\n*requested by:\n<@${ this.userID }>*`);

        if (options.length < 1) return this.msg(this.channelID, `Options were not included! Example: \`@${ this.bot.username } vote :thinking:=genius\`.`);

        for (const option of options) {
            const
                emoji = option.split('=')[0],
                name = option.split('=')[1];

            if (emoji) {
                if (name) ve.addField(
                    `Vote for ${ name } with:`,
                    `${ emoji }`,
                    true
                );
                else ve.addField(
                    `Vote with:`,
                    `${ emoji }`,
                    true
                );
            } else return this.msg(this.channelID, `Some options not defined! Example: \`@${ this.bot.username } vote :thinking:=genius\`.`);
        }

        return this.msg(this.channelID, '@everyone', ve.errorIfInvalid());
    }
}

module.exports = Vote;