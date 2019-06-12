const
    st = require('snowtime'),
    commands = require('../commands'),
    AttachmentsMessgeHandler = require('./AttachmentsMessageHandler'),
    NormalMessageHandler = require('./normalMessageHandler'),
    EveryMessageHandler = require('./everyMessageHandler'),
    Command = require('../commands/command'),
    Embed = require('../scripts/embed'),
    common = require('../scripts/common');

class MessageEventHandler extends Command {
    execute() {
        let fileReact = false;

        if (!this.bot.pending[this.channelID]) this.bot.pending[this.channelID] = [];
        if (this.userID === this.bot.id && this.bot.pending[this.channelID].length > 0) {
            const pi = this.bot.pending[this.channelID].splice(0, 1)[0];
            let
                str = '',
                embed = null;

            if (typeof pi === 'string') str = pi;
            else if (pi instanceof Embed) embed = pi;
            else if (pi instanceof Array) {
                str = pi[0];
                embed = pi[1];
            }
            this.msg(this.channelID, str, embed instanceof Embed && embed.errorIfInvalid());
        }

        if (this.evt.d.attachments.length > 0) fileReact = new AttachmentsMessgeHandler(this.bot, this.params).execute();

        if ((!this.serverID || st.stripNaNs(this.args[0]) == this.bot.id) && !this.bot.users[this.userID].this.bot) {
            // Messages with commands

            if (st.stripNaNs(this.args[0]) == this.bot.id) this.args.shift();
            const cmd = this.args.shift();

            if (commands[cmd]) new commands[cmd](this.bot, this.params).execute();
            else if (!fileReact) {
                if (this.message.indexOf('?') != -1 && (!this.serverID || !common.settings.servers[this.serverID].disableAnswers)) {
                    this.msg(this.channelID, common.objectLib.answers[Math.floor(Math.random() * common.objectLib.answers.length)]);
                } else {
                    this.msg(this.channelID, common.objectLib.defaultRes[Math.floor(Math.random() * common.objectLib.defaultRes.length)]);
                }
            }
        } else {
            // Messages without commands
            new NormalMessageHandler(this.bot, this.params).execute();
        }

        // All messages''
        new EveryMessageHandler(this.bot, this.params).execute();
    }
}

module.exports = MessageEventHandler;
