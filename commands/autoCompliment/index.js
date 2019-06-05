const
    AutoComplimentSample = require('./sample'),
    AutoComplimentOn = require('./on'),
    AutoComplimentOff = require('./off'),
    AutoComplimentList = require('./list'),
    AutoComplimentAdd = require('./add'),
    AutoComplimentRemove = require('./remove'),
    Command = require('../command'),
    Embed = require('../../scripts/embed'),
    common = require('../../scripts/common');

class AutoAnswer extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.otherRequirements.push('serverOnly');
    }

    command() {
        if (!common.settings.servers[this.serverID].autoCompliment) {
            common.settings.servers[this.serverID].autoCompliment = {
                enabled: true,
                targets: []
            };
        }

        switch (this.args[0]) {
            case 'sample':
                new AutoComplimentSample(this.bot, this.params).execute();
                break;
            case 'on':
                new AutoComplimentOn(this.bot, this.params).execute();
                break;
            case 'off':
                new AutoComplimentOff(this.bot, this.params).execute();
                break;
            case 'list':
                new AutoComplimentList(this.bot, this.params).execute();
                break;
            case 'add':
                new AutoComplimentAdd(this.bot, this.params).execute();
                break;
            case 'remove':
                new AutoComplimentRemove(this.bot, this.params).execute();
                break;
            default:
                this.msg(this.channelID, `Missing arguments. Usage: \`@${ this.bot.username } autoCompliment sample | on | off | add <@mention> | remove <@mention> | list\`.`);
                break;
        }
        common.settings.update();
    }

    serverOnlyNotice() {
        this.msg(this.channelID, '', new Embed('**Feature not intended to be used in DM. Sending sample.**', 'This command is only available in servers.').error());
        new AutoComplimentSample(this.bot, this.params).execute();
    }
}

module.exports = AutoAnswer;
