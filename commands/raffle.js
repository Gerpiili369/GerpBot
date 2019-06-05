const
    st = require('snowtime'),
    Command = require('./command'),
    Embed = require('../scripts/embed'),
    common = require('../scripts/common');

class Raffle extends Command {
    constructor(bot, params) {
        super(bot, params);

        this.requiredPerms.push({
            key: 'TEXT_EMBED_LINKS',
            name: 'Embed Links',
        });

        this.otherRequirements.push('serverOnly');
    }

    command() {
        const
            winnerAmt = isNaN(this.args[1]) ? 1 : this.args[1],
            raffleList = [],
            winners = [],
            re = new Embed('Winners', { color: this.bot.getColor(this.serverID, this.userID) });
        let target = this.args[0] || 'everyone';

        if (target.indexOf('everyone') > -1)
            raffleList.push(...Object.keys(this.bot.servers[this.serverID].members));
        else if (target.indexOf('here') > -1)
            for (const member in this.bot.servers[this.serverID].members) {
                if (this.bot.servers[this.serverID].members[member].status != 'offline') raffleList.push(member);
            }
        else {
            target = st.stripNaNs(target);

            if (this.serverID && this.bot.servers[this.serverID].roles[target]) {
                for (const member in this.bot.servers[this.serverID].members) {
                    if (this.bot.servers[this.serverID].members[member].roles.indexOf(this.bot.servers[this.serverID].roles[target].id) != -1) raffleList.push(member);
                }
            } else if (this.bot.channels[target]) {
                raffleList.push(...this.membersInChannel(target));
            } else {
                this.msg(this.channelID, 'Role or channel not found!');
                return;
            }
        }

        for (let i = 0; i < winnerAmt && raffleList.length > 0; i++) winners.push(raffleList.splice(Math.floor(Math.random() * raffleList.length), 1));

        if (this.bot.channels[target] && this.bot.channels[target].guild_id != this.serverID) {
            for (const winner of winners) re.addDesc(`\n${ this.bot.users[winner].username }`);
        } else {
            for (const winner of winners) re.addDesc(`\n<@${ winner }>`);
        }

        if (winners.length === 1) {
            re.title = 'Winner';
            re.color = this.bot.getColor(this.bot.channels[target] ? this.bot.channels[target].guild_id : this.channelID, winners[0], false);
            re.thumbnail.url = common.avatarUrl(this.bot.users[winners[0]]);
        }

        this.msg(this.channelID, '', re);
    }

    serverOnlyNotice() {
        this.msg(this.channelID, '', new Embed('When you really think about it, how would that even work?', 'This command is only available in servers.').error());
    }
}

module.exports = Raffle;
