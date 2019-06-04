const
    st = require('snowtime'),
    Command = require('./command'),
    common = require('../scripts/common');

class Ile extends Command {
    command() {
        switch (this.args[0]) {
            case 'join':
                this.msg(this.channelID, common.ile.join(this.userID));
                break;
            case 'leave':
                this.msg(this.channelID, common.ile.leave(this.userID));
                break;
            case 'here':
                this.msg(this.channelID, common.ile.attend(this.userID));
                break;
            case 'time':
                this.msg(this.channelID, common.ile.getCheckpoint()
                    .split(': ')
                    .map((value, i) => {
                        if (i == 1) return st.timeAt(st.findTimeZone(common.settings.tz, [this.userID, this.serverID]), new Date(value));
                        return value;
                    })
                    .join(': ')
                );
                break;
            default:
                this.msg(this.channelID, `${ common.ile.getAcronym() }: command structure: \`ile join | leave | here | time\`.`);
                break;
        }
    }
}

module.exports = Ile;
