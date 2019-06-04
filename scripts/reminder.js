const
    Embed = require('./embed'),
    common = require('./common');

class Reminder {
    constructor(obj = {}) {
        this.mentions = obj.mentions || '';
        this.links = obj.links || [];
        this.owner = obj.owner || {
            name: '',
            id: ''
        };
        this.message = obj.message || '';
        this.color = obj.color || '';
        this.image = obj.image || '';
        this.time = obj.time || Date.now();
        this.channel = obj.channel || '';
    }

    ready(rem = this) {
        return !rem.timeout && rem.time - Date.now() < 86400000;
    }

    activate() {
        if (this.ready()) this.timeout = setTimeout(() => {
            common.msg(this.channel, this.mentions, this.toEmbed());
            if (this.links.length > 0) setTimeout(common.msg, 500, this.channel, this.links.join('\n'));
            if (common.settings.reminders[this.owner.id] && common.settings.reminders[this.owner.id].indexOf(this) > -1) common.settings.reminders[this.owner.id].splice(common.settings.reminders[this.owner.id].indexOf(this), 1);
            common.settings.update();
        }, this.time - Date.now());
        return this;
    }

    toEmbed(rem = this) {
        return new Embed('Reminder', rem.message, {
            color: rem.color,
            image: { url: rem.image },
            footer: { text: `Created by ${ rem.owner.name }` },
        });
    }
}

module.exports = Reminder;
