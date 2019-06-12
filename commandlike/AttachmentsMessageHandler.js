const
    st = require('snowtime'),
    Command = require('../commands/command'),
    Embed = require('../scripts/embed'),
    OsuApi = require('../scripts/osu.js'),
    common = require('../scripts/common'),
    osu = new OsuApi(common.config.auth.osu);

class NormalMessageHandler extends Command {
    execute() {
        let fileReact = false;

        for (const file of this.evt.d.attachments) {
            // Messages with attachments
            const ext = file.url.substring(file.url.length - file.url.split('').reverse()
                .join('')
                .indexOf('.') - 1).toLowerCase();
            fileReact = true;
            switch (ext) {
                case '.osr':
                    if (this.serverID && !this.pc.userHasPerm(this.serverID, this.bot.id, 'TEXT_EMBED_LINKS', this.channelID)) this.pc.missage(this.msg, this.channelID, ['Embed Links']);
                    else osu.readReplay(file.url).then(perf => osu.singlePlayEmbed(perf))
                        .then(result => {
                            result.re.description = result.re.description.replace('<date>',
                                st.timeAt(st.findTimeZone(common.settings.tz, [this.userID, this.serverID]), new Date(result.date))
                            );
                            this.msg(this.channelID, this.userID == this.bot.id ? '' : 'osu! replay information:', result.re.errorIfInvalid());
                        })
                        .catch(err => this.msg(this.channelID, '', new Embed().error(err)));
                    break;
                default: fileReact = true;
            }
        }

        return fileReact;
    }
}

module.exports = NormalMessageHandler;
