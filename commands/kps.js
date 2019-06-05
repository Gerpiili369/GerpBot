const
    io = require('socket.io-client'),
    Command = require('./command'),
    Embed = require('../scripts/embed'),
    KPSEmbed = require('../scripts/kpsEmbed'),
    common = require('../scripts/common');

class KPS extends Command {
    command() {
        if (!common.kps[this.userID]) {
            common.kps[this.userID] = {
                discord: this.bot.users[this.userID],
                gameActive: false,
                mem: { player: { theme: 'defeault', selection: null, result: null }, opponent: null },
                socket: io('https://plssave.help', { path: '/socket2' }),
            };

            common.kps[this.userID].socket.on('connect', () => {
                common.kps[this.userID].socket.emit('setName', `${ this.bot.users[this.userID].username }#${ this.bot.users[this.userID].discriminator }`);
            });

            common.kps[this.userID].socket.on('loginSucc', player => {
                common.kps[this.userID].mem.player = player;
            });

            common.kps[this.userID].socket.on('loginFail', data => this.msg(this.userID, '', new KPSEmbed(common.kps[this.userID], data, 0)));

            common.kps[this.userID].socket.on('startGame', data => {
                common.kps[this.userID].gameActive = true;
                common.kps[this.userID].opponent = data;
                this.msg(this.userID, '', new KPSEmbed(common.kps[this.userID], data, 4));
            });

            common.kps[this.userID].socket.on('toMainMenu', data => {
                common.kps[this.userID].gameActive = false;
                this.msg(this.userID, '', new KPSEmbed(common.kps[this.userID], data, 0));
            });

            common.kps[this.userID].socket.on('msgFromServer', data => this.msg(this.userID, '', new KPSEmbed(common.kps[this.userID], data, 0)));

            common.kps[this.userID].socket.on('result', (player, opponent) => {
                common.kps[this.userID].mem.player = player;
                common.kps[this.userID].mem.opponent = opponent;

                this.msg(this.userID, '', new KPSEmbed(common.kps[this.userID], 'Oppnent\'s choice', 5));
            });
        }

        if (common.kps[this.userID].socket.connected) this.kpsEmit();
        else {
            common.kps[this.userID].socket.on('connect', () => this.kpsEmit());

            setTimeout(() => {
                if (!common.kps[this.userID].socket.connected) this.msg(this.userID, '', new Embed().error(new Error('Could not connect!')));
            }, 10000);
        }
    }

    kpsEmit() {
        let data = this.args[0];
        switch (data) {
            case 'play':
                data = 'other';
                // Fallthrough
            case 'ai':
            case 'friend':
                if (common.kps[this.userID].gameActive) {
                    this.msg(this.userID, 'This command is not available while in a game. Use `kps quit` to quit.');
                } else {
                    common.kps[this.userID].socket.emit('setMode', data, this.args[1]);
                }
                break;
            case 'rock':
            case 'paper':
            case 'scissors':
                if (!common.kps[this.userID].gameActive) common.kps[this.userID].socket.emit('setMode', 'ai');
                common.kps[this.userID].socket.emit('choose', data);
                break;
            case 'classic':
                common.kps[this.userID].socket.emit('setTheme', 'defeault');
                common.kps[this.userID].mem.player.theme = 'defeault';
                this.msg(this.userID, '', new KPSEmbed(common.kps[this.userID], 'Theme updated!', 3));
                break;
            case 'horror':
                common.kps[this.userID].socket.emit('setTheme', data);
                common.kps[this.userID].mem.player.theme = data;
                this.msg(this.userID, '', new KPSEmbed(common.kps[this.userID], 'Theme updated!', 3));
                break;
            case 'space':
                common.kps[this.userID].socket.emit('setTheme', 'fuckrulla');
                common.kps[this.userID].mem.player.theme = 'fuckrulla';
                this.msg(this.userID, '', new KPSEmbed(common.kps[this.userID], 'Theme updated!', 3));
                break;
            case 'hand':
                common.kps[this.userID].socket.emit('setTheme', data);
                common.kps[this.userID].mem.player.theme = data;
                this.msg(this.userID, '', new KPSEmbed(common.kps[this.userID], 'Theme updated!', 3));
                break;
            case 'quit':
                this.msg(this.userID, '', new KPSEmbed(common.kps[this.userID], 'You left.', 0));
                common.kps[this.userID].socket.disconnect();
                common.kps[this.userID] = null;
                break;
            default:
                this.msg(this.userID, `Starting a game: \`play | ai | friend <friendname>\`\nChoosing: \`rock | paper | scissors\`\nTheme selection: \`classic | horror | space | hand\`\nTo quit: \`quit\`\nDon't forget the @${ this.bot.username } kps!`);
        }
    }
}


module.exports = KPS;
