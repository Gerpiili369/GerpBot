const Command = require('./command');

class NerfThis extends Command {
    command() {
        this.msg(this.channelID, 'Leenakop was the only one who died...');
    }
}

module.exports = NerfThis;
