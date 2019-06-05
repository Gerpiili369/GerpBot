const
    Command = require('./command'),
    Embed = require('../scripts/embed'),
    common = require('../scripts/common');

class Color extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.requiredPerms.push({
            key: 'TEXT_EMBED_LINKS',
            name: 'Embed Links',
        });

        this.otherRequirements.push('serverOnly', 'adminOnly');
    }

    command() {
        new Promise((resolve, reject) => {
            const color = common.colorInput(this.args.join(' '));
            if (color) resolve(color);
            else reject();
        })
            .then(color => {
                if (!common.settings.servers[this.serverID].color) common.settings.servers[this.serverID].color = {};
                common.settings.servers[this.serverID].color.value = color;

                this.bot.addColorRole(this.serverID)
                    .catch(err => {
                        if (err.name === 'Missing permissions!') {
                            this.msg(this.channelID, 'Unable to add color role!');
                            this.pc.missage(this.msg, this.channelID, ['Manage Roles']);
                        } else common.logger.error(err, this.loggerMeta);
                    })
                    .then(() => {
                        common.settings.update();
                        this.bot.editColor(this.serverID, `#${ (color || common.colors.gerp).toString(16) }`);
                        this.msg(this.channelID, '', new Embed('Color changed!', { color }));
                    });
            })
            .catch(err => this.msg(this.channelID, '', new Embed(
                'Only color you will be seeing is red.',
                'This command is server only, admin only AND requires one argument which must be hex or decimal color code or a color I know by name.',
            ).error(err)));
    }

    serverOnlyNotice() {
        this.msg(this.channelID, '', new Embed('Only color you will be seeing is red.', 'This command is only available in servers.').error());
    }

    adminOnlyNotice() {
        this.msg(this.channelID, '', new Embed('Only color you will be seeing is red.', 'Only server admins are allowed to use this command.').error());
    }
}

module.exports = Color;
