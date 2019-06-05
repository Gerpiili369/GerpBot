const
    Command = require('./command'),
    Embed = require('../scripts/embed'),
    common = require('../scripts/common'),
    GitHub = require('../scripts/github.js'),
    github = new GitHub();

class Releases extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.requiredPerms.push({
            key: 'TEXT_EMBED_LINKS',
            name: 'Embed Links',
        });
    }

    command() {
        const repo = {},
            color = this.bot.getColor(this.serverID, this.cmd === 'changes' ? '' : this.userID);
        let max = Infinity;

        if (this.args.length > 3) this.msg(this.channelID, '', new Embed('Too many arguments!').error());
        else {
            if (this.args.length == 1) max = this.args[0];
            if (this.args.length == 3) max = this.args[2];
            if (isNaN(max) || max < 1) this.msg(this.channelID, '', new Embed('Release amount must be a number largen than 0!').error());
            else {
                if (this.args.length > 1) {
                    repo.owner = this.args[0];
                    repo.name = this.args[1];
                } else if (common.pkg.repository && common.pkg.repository.url) {
                    const urlray = common.pkg.repository.url.split('/');
                    repo.host = urlray[2];
                    if (repo.host === 'github.com') {
                        repo.owner = urlray[3];
                        repo.name = urlray[4].slice(0, urlray[4].indexOf('.git'));
                    }
                }

                github.getReleases(repo.owner, repo.name)
                    .then(data => {
                        if (data.message === 'Not Found') this.msg(this.channelID, '', new Embed('Repository not found!').error());
                        else if (data.length < 1) this.msg(this.channelID, '', new Embed('No releases available.').error());
                        else {
                            const titleEmbed = new Embed(`Releases for ${ data[0].html_url.split('/')[3] }/${ data[0].html_url.split('/')[4] }`, { color });
                            if (this.args.length < 2) this.bot.pending[this.channelID].push(titleEmbed);

                            for (let i = 0; i < data.length && i < max; i++)
                                this.bot.pending[this.channelID].push(new Embed(data[i].name, data[i].body, {
                                    color,
                                    timestamp: data[i].published_at,
                                    author: {
                                        name: data[i].tag_name,
                                        url: data[i].html_url
                                    },
                                    footer: {
                                        text: `Published by ${ data[i].author.login }`,
                                        icon_url: data[i].author.avatar_url
                                    }
                                }));

                            if (this.args.length < 2) this.msg(this.channelID, '', new Embed(`Current version: ${ common.pkg.version }`, { color }));
                            else this.msg(this.channelID, '', titleEmbed);
                        }
                    })
                    .catch(err => this.msg(this.channelID, '', new Embed().error(err)));
            }
        }
    }
}

module.exports = Releases;
