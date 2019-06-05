const
    Command = require('../command'),
    common = require('../../scripts/common');

class AutoComplimentSample extends Command {
    command() {
        this.msg(this.channelID, `<@${ this.userID }> ${ common.objectLib.compliments[Math.floor(Math.random() * common.objectLib.compliments.length)] }`);
    }
}

module.exports = AutoComplimentSample;
