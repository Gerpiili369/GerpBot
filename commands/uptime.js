const
    st = require('snowtime'),
    Command = require('./command'),
    common = require('../scripts/common');

class Uptime extends Command {
    command() {
        if (common.timeOf[this.args[0]]) {
            this.msg(this.channelID, `Time since ${ this.args[0] }: \`${ new st.Uptime(common.timeOf[this.args[0]]).toString() }\``);
        } else {
            this.msg(this.channelID, `Missing arguments. Usage: \`@${ this.bot.username } uptime startUp | connection | lastCommand\`.`);
        }
    }
}

module.exports = Uptime;
