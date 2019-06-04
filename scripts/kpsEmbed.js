const
    Embed = require('./embed'),
    common = require('./common'),
    url = 'https://plssave.help/kps';

class KPSEmbed extends Embed {
    constructor(user, msg, type) {
        super(msg, {
            author: {
                name: 'KPS',
                url: 'https://plssave.help/PlayKPS'
            }
        });

        this.user = {};

        for (const key in user) {
            if (key !== 'socket') this.user[key] = user[key];
        }

        this.player = user.mem.player;

        switch (this.player.theme) {
            case 'horror':
                this.author.icon_url = `${ url }/img/icon4.png`;
                this.color = 7667712;
                break;
            case 'fuckrulla':
                this.author.icon_url = `${ url }/img/icon3.png`;
                this.color = 32768;
                break;
            case 'hand':
                this.author.icon_url = `${ url }/img/icon2.png`;
                this.color = 13027014;
                break;
            default:
                this.author.icon_url = `${ url }/img/icon.png`;
                this.color = 3569575;
        }
        switch (type) {
            case 5:
                this.addThumb(user.mem.opponent);
                this.addImage(false);
                this.addFooter();
                break;
            case 4:
                this.addThumb('vs');
                this.addImage(true);
                this.addFooter();
                break;
            case 3:
                this.addThumb('vs');
                this.addImage(true);
                break;
            case 2:
                this.addThumb('vs');
                this.addFooter();
                break;
            case 1:
                this.addFooter();
                break;
            default:
        }
    }

    /**
     * @arg {String} img
     */
    addThumb(img) {
        this.thumbnail.url = `${ url }/img/${ this.player.theme }/${ img }.png`;
    }

    /**
     * @arg {Boolean} background
     */
    addImage(background) {
        if (background) {
            this.image.url = `${ url }/img/${ this.player.theme }/background${ this.player.theme === 'defeault' ? '' : 'new' }.${ this.player.theme === 'horror' ? 'png' : 'jpg' }`;
        } else {
            this.image.url = `${ url }/img/${ this.player.theme }/${ this.player.result }.png`;
        }
    }

    addScore() {
        const emojis = ['✅', '⚠️', '💢'];

        emojis[0] = emojis[0].repeat(Math.round(this.player.points.wins / this.player.games * 15));
        emojis[1] = emojis[1].repeat(Math.round(this.player.points.draws / this.player.games * 15));
        emojis[2] = emojis[2].repeat(Math.round(this.player.points.losses / this.player.games * 15));

        this.addField('Current score:', emojis.join(''));
    }

    addFooter() {
        this.footer = {
            icon_url: common.avatarUrl(this.user.discord),
            text: `Wins: (${ this.player.total.wins }), Draws: (${ this.player.total.draws }), Losses: (${ this.player.total.losses })`
        };
    }
}

module.exports = KPSEmbed;
