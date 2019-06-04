const
    Emitter = require('events'),
    st = require('snowtime'),
    Embed = require('../scripts/embed'),
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

        this.otherRequirements = [];
        this.argChecks = [];

        // Bindings.
        this.msg = this.msg.bind(this);
    }

    async execute() {
        let canExecute = true;

        // Check permissions before executing.
        if (await !this.botHasPerms()) canExecute = false;

        // Check other requirements before executing.
        if (await !this.meetsRequirements()) canExecute = false;

        // Check if args meet the checks.
        if (await !this.validArgs()) canExecute = false;

        // Execute command if none of the checks fail.
        if (canExecute) this.command();
    }

    command() {
        // This method should be is overwritten when after extending this.
        common.logger.error('Default command method has not been overwritten!', { label: `commands${ this.cmd ? `/${ this.cmd }` : '' }` });
        this.msg(this.channelID, '', new Embed('Default command', 'This is a default command template. You should not be able to see this.').error());
    }

    botHasPerms() {
        let hasPerms = true;

        // Check permissions if command originated from server.
        if (this.serverID && this.requiredPerms.length > 0) {
            const missingPerms = [];
            for (const perm of this.requiredPerms) {
                if (!this.pc.userHasPerm(this.serverID, this.bot.id, perm.key, this.channelID)) missingPerms.push(perm.name);
            }

            if (missingPerms.length > 0) {
                hasPerms = false;
                this.pc.missage(this.msg, this.channelID, missingPerms);
            }
        }

        return hasPerms;
    }

    meetsRequirements() {
        let meets = true;

        if (this.otherRequirements.indexOf('serverOnly') > -1 && !this.serverID) {
            meets = false;
            this.serverOnlyNotice();
        }

        return meets;
    }

    validArgs() {
        let valid = true;

        for (let i = 0; i < this.args.length; i++) if (this.args[i]) switch (this.argChecks[i]) {
            case 'channel':
                if (!this.bot.channels[st.stripNaNs(this.args[i])]) {
                    valid = false;
                    this.msg(this.channelID, 'Channel not found!');
                }
                break;
            case 'user':
                if (!this.bot.users[st.stripNaNs(this.args[i])]) {
                    valid = false;
                    this.msg(this.channelID, 'User not found!');
                }
                break;
            case 'role':
                if (this.bot.servers[this.serverID] && !this.bot.servers[this.serverID].roles[st.stripNaNs(this.args[i])]) {
                    valid = false;
                    this.msg(this.channelID, 'Role not found!');
                }
                break;
            default:
        }

        return valid;
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

    serverOnlyNotice() {
        this.msg(this.channelID, '', new Embed('Server only', 'This command is only available in servers.').error());
    }

    /**
     * @arg {Snowflake} channel
     * @return {Snowflake[] | String}
     */
    membersInChannel(channel) {
        const
            channelID = st.stripNaNs(channel),
            members = [];
        let serverID = null;

        if (this.bot.channels[channelID]) {
            serverID = this.bot.channels[channelID].guild_id;
            for (const user in this.bot.servers[serverID].members)
                if (this.pc.userHasPerm(serverID, user, 'TEXT_READ_MESSAGES', channelID)) members.push(user);
        }
        if (this.bot.directMessages[channelID]) {
            members.push(this.bot.id);
            for (const user of this.bot.directMessages[channelID].recipients) members.push(user.id);
        }

        return members;
    }
}

module.exports = Command;
