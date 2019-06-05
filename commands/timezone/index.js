const
    st = require('snowtime'),
    TimezoneServer = require('./server'),
    Command = require('../command'),
    common = require('../../scripts/common');

class Timezone extends Command {
    command() {
        if (st.isValidTimezone(this.args[0])) {
            switch (this.args[1]) {
                case 'server':
                    new TimezoneServer(this.bot, this.params).execute();
                    break;
                default:
                    common.settings.tz[this.userID] = this.args[0];
                    common.settings.update();
                    this.msg(this.channelID, `Your timezone is set to: UTC${ this.args[0] }.`);
            }
        } else this.msg(this.channelID, 'NA timezoning command. Try `+HH:MM` or `-HH:MM` instead.');
    }
}

module.exports = Timezone;
