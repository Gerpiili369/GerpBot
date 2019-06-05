const Command = require('./command');

class Echo extends Command {
    command() {
        this.msg(this.channelID, this.args.join(' '));
    }
}

module.exports = Echo;
