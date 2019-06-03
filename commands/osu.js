const
    Command = require('./command'),
    Embed = require('../scripts/embed'),
    OsuApi = require('../scripts/osu.js'),
    common = require('../scripts/common'),
    osuApi = new OsuApi(common.config.auth.osu);

class Osu extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.requiredPerms.push({
            key: 'TEXT_EMBED_LINKS',
            name: 'Embed Links',
        });
    }

    command() {
        if (common.config.auth.osu) switch (this.args.length) {
            case 1:
                osuApi.getUser(this.args[0])
                    .then(embed => this.msg(this.channelID, '', embed))
                    .catch(err => common.logger.error(err, { label: `commands${ this.cmd ? `/${ this.cmd }` : '' }` }));
                break;
            case 2:
                if (this.serverID && !this.pc.userHasPerm(this.serverID, this.bot.id, 'TEXT_ATTACH_FILES', this.channelID))
                    this.pc.missage(this.msg, this.channelID, ['Attach Files']);
                else osuApi.getBestReplay(...this.args)
                    .then(file => this.bot.uploadFile({
                        to: this.channelID,
                        file: file.toBuffer(),
                        filename: `replay-osu_${ this.args[0] }.osr`,
                        message: 'Here is some top play action!'
                    }, (err, res) => {
                        if (err) return Promise.reject(err);
                        return Promise.resolve(res);
                    }))
                    .catch(err => this.msg(this.channelID, '', new Embed(err).error(err)));
                break;
            default:
                this.msg(this.channelID, 'Please enter username or user ID');
        } else this.msg(this.channelID, 'osu! API key not found!');
    }
}

module.exports = Osu;
