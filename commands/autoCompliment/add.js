const
    st = require('snowtime'),
    Command = require('../command'),
    common = require('../../scripts/common');

class AutoComplimentAdd extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.argChecks[1] = 'user';
        this.otherRequirements.push('adminOnly');
    }

    command() {
        const target = st.stripNaNs(this.args[1]);
        if (target) {
            if (common.settings.servers[this.serverID].autoCompliment.targets.indexOf(target) == -1) {
                common.settings.servers[this.serverID].autoCompliment.targets.push(target);
                this.msg(this.channelID, `User <@${ target }> is now cool.`);
            } else {
                this.msg(this.channelID, `User <@${ target }> is already cool!`);
            }
        } else this.msg(this.channelID, `Missing arguments. Usage: \`@${ this.bot.username } autoCompliment sample | on | off | add <@mention> | remove <@mention> | list\`.`);
    }
}

module.exports = AutoComplimentAdd;
