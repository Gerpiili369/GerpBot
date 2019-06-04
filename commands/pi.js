const Command = require('./command');

class Pi extends Command {
    command() {
        this.msg(this.channelID, `Here it is: \`${ Math.PI }...\``);
    }
}

module.exports = Pi;
