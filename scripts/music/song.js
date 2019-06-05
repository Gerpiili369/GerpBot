const
    st = require('snowtime'),
    common = require('../common'),
    Embed = require('../embed');

class Song {
    constructor(url, userID, bot) {
        this.url = url;
        this.bot = bot;

        this.request = typeof userID == 'object' ?
            userID :
            { id: userID, time: Date.now() };
    }

    update(item) {
        if (item.snippet) {
            this.title = item.snippet.title;
            this.description = item.snippet.description;
            this.thumbnail = item.snippet.thumbnails.high.url;
            this.published = item.snippet.publishedAt;
        } else {
            this.title = item.title;
            this.description = item.description;
            this.thumbnail = item.thumbnail;
            this.published = item.published;
        }
        return this;
    }

    toEmbed(serverID) {
        const se = new Embed(this);
        se.thumbnail = { url: this.thumbnail };
        se.color = this.bot.getColor(serverID, this.request.id);
        if (this.published) se.addDesc(`\nPublished at: ${
            st.timeAt(st.findTimeZone(common.settings.tz, [serverID]), new Date(this.published))
        }`);
        return se;
    }
}

module.exports = Song;
