const
    MusicCancel = require('./cancel'),
    MusicSkip = require('./skip'),
    MusicStop = require('./stop'),
    MusicList = require('./list'),
    MusicChannel = require('./channel'),
    Command = require('../command'),
    Embed = require('../../scripts/embed'),
    common = require('../../scripts/common');

class Music extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.otherRequirements.push('serverOnly');
    }

    command() {
        common.mh.addServer(this.serverID);
        common.mh.servers[this.serverID].temp = this.channelID;

        switch (this.args[0]) {
            case 'cancel':
                new MusicCancel(this.bot, this.params).execute();
                break;
            case 'skip':
                new MusicSkip(this.bot, this.params).execute();
                break;
            case 'stop':
                new MusicStop(this.bot, this.params).execute();
                break;
            case 'list':
                new MusicList(this.bot, this.params).execute();
                break;
            case 'channel':
                new MusicChannel(this.bot, this.params).execute();
                break;
            default:
        }
    }

    serverOnlyNotice() {
        this.msg(this.channelID, '', new Embed('`<sassy message about this command being server only>`', 'This command is only available in servers.').error());
    }
}

module.exports = Music;
