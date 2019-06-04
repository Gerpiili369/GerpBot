const
    Command = require('./command'),
    common = require('../scripts/common');

class Ask extends Command {
    command() {
        if (this.args[0]) this.msg(this.channelID, common.objectLib.answers[Math.floor(Math.random() * common.objectLib.answers.length)]);
        else this.msg(this.channelID, 'You didn\'t ask anything...');
    }
}

module.exports = Ask;
