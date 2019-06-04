const Command = require('./command');

class Role extends Command {
    command() {
        if (this.args[0]) {
            const result = [];
            let
                max = Number(this.args[0].split('..')[1]),
                min = Number(this.args[0].split('..')[0]),
                amount = 1,
                nan = false;

            if (this.args[0].indexOf('..') > -1) {
                if (isNaN(max) || isNaN(min)) nan = true;
            } else {
                max = Number(this.args[0]);
                min = 0;
                if (isNaN(max)) nan = true;
            }

            if (nan) this.msg(this.channelID, 'Not a number!');
            else {
                if (max < min) {
                    const mem = min;
                    min = max;
                    max = mem;
                }
                max++;

                if (!isNaN(Number(this.args[1]))) amount = this.args[1];

                for (let i = 0; i < amount; i++) {
                    result.push(Math.floor(Math.random() * (max - min)) + min);
                }

                this.msg(this.channelID, result.join(', '));
            }
        } else this.msg(this.channelID, 'Syntax: `rng <number>[..<number>] [<amount>]`');
    }
}

module.exports = Role;
