const
    common = require('../../scripts/common'),
    Command = require('../command');

class MusicCancel extends Command {
    command() {
        if (this.args[1]) {
            const index = Number(this.args[1]) - 1;
            if (common.mh.servers[this.serverID].queue[index]) {
                if (common.mh.servers[this.serverID].queue[index].request.id == this.userID) {
                    common.mh.servers[this.serverID].queue.splice(index, 1);
                    common.settings.update();
                    this.msg(this.channelID, 'Cancel successful!');
                } else this.msg(this.channelID, 'That\'s not yours!');
            } else this.msg(this.channelID, 'Song doesn\'t exist!');
        } else this.msg(this.channelID, 'Nothing could be cancelled!');
    }
}

module.exports = MusicCancel;
