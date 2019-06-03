const
    Api = require('../api'),
    common = require('../common'),
    Song = require('./song'),
    Server = require('./server'),
    ytdl = require('ytdl-core');

class MusicHandler extends Api {
    constructor(bot, key) {
        super('https://www.googleapis.com/youtube/v3', key);
        this.bot = bot;
        this.servers = {};
        this.Song = Song;
    }

    addServer(id) {
        if (!this.servers[id]) {
            this.servers[id] = new Server(id, this.bot);

            if (common.settings.servers[id].audio) this.servers[id].loadQueue(common.settings.servers[id].audio.que);
            else common.settings.servers[id].audio = {};

            common.settings.servers[id].audio.que = this.servers[id].queue;

            if (common.settings.servers[id].audio.channel) this.servers[id].acID = common.settings.servers[id].audio.channel;

            common.settings.update();
        }
    }

    searchSong(keywords, userID) {
        return this.apiCall(`/search?part=snippet&q=${ keywords.join('+') }&key=${ this.key }`)
            .then(data => {
                for (const item of data.items) if (item.id && item.id.kind === 'youtube#video') return item;
                return Promise.reject({
                    name: 'Song not found',
                    message: 'No results found with given keywords.'
                });
            })
            .then(item => new Promise((resolve, reject) => ytdl.getInfo(`http://www.youtube.com/watch?v=${ item.id.videoId }`, (err, info) => {
                if (err) reject(err);
                let url = '';
                info.formats.reverse();
                for (const format of info.formats) if (format.audioEncoding) {
                    url = format.url;
                    break;
                }
                if (!url) url = info.formats[info.formats.length - 1].url;

                resolve(new Song(url, userID, this.bot).update(item));
            })))
            .catch(err => {
                if (err.errors) return Promise.reject({
                    name: err.errors[0].message,
                    message: `${ err.errors[0].domain }/${ err.errors[0].reason }`
                });
                return Promise.reject(err);
            });
    }
}

module.exports = MusicHandler;
