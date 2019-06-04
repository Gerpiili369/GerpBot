
const
    Command = require('../command'),
    common = require('../../scripts/common');

class RemindCancel extends Command {
    command() {
        if (common.settings.reminders[this.userID] && common.settings.reminders[this.userID][this.args[1]]) {
            common.settings.reminders[this.userID].splice(this.args[1], 1);
            common.settings.update();
            this.msg(this.channelID, 'Cancel successful!');
        } else this.msg(this.channelID, 'Reminder doesn\'t exist!');
    }
}

module.exports = RemindCancel;
