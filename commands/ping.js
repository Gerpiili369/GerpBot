const Command = require('./command');

class Ping extends Command {
    command() {
        this.msg(this.channelID, 'Pong!');
    }
}

module.exports = Ping;
