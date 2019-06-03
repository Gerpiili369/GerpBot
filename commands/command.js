const
    Emitter = require('events'),
    st = require('snowtime'),
    permCheck = require('../scripts/permCheck'),
    common = require('../scripts/common');

class Command extends Emitter {
    constructor(bot, params) {
        super();

        // Add reference to the bot.
        this.bot = bot;

        // Parameters originally from "message" -event.
        this.user = params.user;
        this.userID = params.userID;
        this.channelID = params.channelID;
        this.message = params.message;
        this.evt = params.evt;

        // Add serverID after checking if message came from server.
        if (bot.channels[this.channelID]) this.serverID = bot.channels[this.channelID].guild_id;

        // Get arguments from message.
        this.args = this.message.split(' ');

        // Remove bot @mention from arguments.
        if (st.stripNaNs(this.args[0]) == bot.id) this.args.shift();

        // Remove command name from arguments.
        this.cmd = this.args.shift();

        // Add permcheck.
        this.pc = permCheck(bot);
        this.requiredPerms = [];

        // Bindings.
        this.msg = this.msg.bind(this);
    }

    async execute() {
        let canExecute = true;

        // Check permissions before executing.
        if (await !this.botHasPerms()) canExecute = false;

        // Execute command if none of the checks fail.
        if (canExecute) this.command();
    }

    command() {
        // This method should be is overwritten when after extending this.
    }

    botHasPerms() {
        let hasPerms = true;

        // Check permissions if command originated from server.
        if (this.serverID) switch(this.requiredPerms.length) {
            case 0: // No required permissions specified.
                hasPerms = true;
                break;
            case 1: // Single required permission specified.
                if (this.pc.userHasPerm(this.serverID, this.bot.id, this.requiredPerms[0].key, this.channelID)) {
                    hasPerms = true;
                } else {
                    hasPerms = false;
                    this.pc.missage(this.msg, this.channelID, [this.requiredPerms[0].name]);
                }
                break;
            default: // Multiple required permissions specified.

        }

        return hasPerms;
    }

    msg(channel, message, embed) {
        this.bot.sendMessage({
            to: channel,
            message,
            embed
        }, err => {
            if (err) {
                if (err.response && err.response.message === 'You are being rate limited.')
                    setTimeout(this.msg, err.response.retry_after, channel, message, embed);
                else common.logger.error(err, '');
            }
        });
    }
}

module.exports = Command;
