const
    st = require('snowtime'),
    Command = require('./command'),
    Embed = require('../scripts/embed'),
    common = require('../scripts/common');

class Changes extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.otherRequirements.push('serverOnly');
    }

    command() {
        common.mh.addServer(this.serverID);
        common.mh.servers[this.serverID].temp = this.channelID;

        this.pc.multiPerm(this.serverID, this.bot.id, [
            'TEXT_READ_MESSAGES',
            'VOICE_CONNECT',
            'VOICE_SPEAK',
        ], this.bot.servers[this.serverID].members[this.userID].voice_channel_id)
            .then(
                () => common.mh.servers[this.serverID]
                    .joinUser(this.userID)
                    .then(server => server.getStream())
                    .then(() => {
                        let result = null;
                        if (this.evt.d.attachments.length === 1) result = new common.mh.Song(this.evt.d.attachments[0].url, this.userID).update({
                            title: this.evt.d.attachments[0].filename,
                            description: `File uploaded by ${ this.user }`,
                            thumbnail: common.avatarUrl(this.bot.users[this.userID]),
                            published: st.sfToDate(this.evt.d.attachments[0].id)
                        });
                        else if (this.args[0]) result = common.mh.searchSong(this.args, this.userID);
                        return result;
                    })
                    .then(song => {
                        if (song instanceof common.mh.Song) common.mh.servers[this.serverID].queueSong(song);
                    })
                    .then(() => {
                        if (!common.mh.servers[this.serverID].playing) common.mh.servers[this.serverID].playNext(this.channelID, this.bot.getColor(this.channelID, this.userID));
                    }),
                missing => this.pc.missage(this.msg, this.channelID, missing)
            )
            .catch(err => {
                if (err instanceof Error) common.logger.error(err, { label: `commands${ this.cmd ? `/${ this.cmd }` : '' }` });
                this.msg(this.channelID, '', new Embed().error(err));
            });
    }

    serverOnlyNotice() {
        this.msg(this.channelID, '', new Embed('`<sassy message about this command being server only>`', 'This command is only available in servers.').error());
    }
}

module.exports = Changes;
