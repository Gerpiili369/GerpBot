const
    common = require('../../scripts/common'),
    Command = require('../command');

class MusicStop extends Command {
    command() {
        common.mh.servers[this.serverID].controls(this.args[0]).then(res => {
            if (res) this.msg(this.channelID, res);
        });
    }
}

module.exports = MusicStop;
