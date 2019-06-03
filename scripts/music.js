const
    Api = require('./api'),
    Embed = require('./embed'),
    common = require('./common'),
    ytdl = require('ytdl-core'),
    cp = require('child_process'),
    st = require('snowtime');

class MusicHandler extends Api {
    constructor(bot, key) {
        super('https://www.googleapis.com/youtube/v3', key);
        this.bot = bot;
        this.servers = {};

        const mh = this;

        this.Song = class Song {
            constructor(url, userID) {
                this.url = url;
                this.request = typeof userID == 'object' ? userID : {
                    id: userID,
                    time: Date.now()
                };
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
                se.color = bot.getColor(serverID, this.request.id);
                if (this.published) se.addDesc(`\nPublished at: ${
                    st.timeAt(st.findTimeZone(common.settings.tz, [serverID]), new Date(this.published))
                }`);
                return se;
            }
        };
        this.Server = class Server {
            constructor(id) {
                this.id = id;
                this.queue = [];
                this.playing = false;
                this.stopped = false;
            }

            loadQueue(queue = []) {
                for (const song of queue) this.queue.push(
                    new mh.Song(song.url, song.request).update(song)
                );
            }

            controls(action) {
                const server = this;
                return new Promise(resolve => {
                    switch (action) {
                        case 'stop':
                        case 'skip':
                            if (server.playing && server.ccp) {
                                if (action === 'stop') {
                                    server.stopped = true;
                                    server.announce('Stopped!');
                                } else
                                    server.announce('Skipped!');

                                server.ccp.kill();
                            } else resolve(`There is nothing to ${ action }!`);
                            break;
                        default: resolve('Invalid action!');
                    }
                    resolve();
                });
            }

            playNext() {
                if (this.queue.length > 0 && !this.stopped) {
                    this.playing = this.queue.shift();

                    this.ccp = cp.spawn('ffmpeg', [
                        '-loglevel', '0',
                        '-i', this.playing.url,
                        '-f', 's16le',
                        '-ar', '48000',
                        '-ac', '2',
                        'pipe:1'
                    ], { stdio: ['pipe', 'pipe', 'ignore'] });

                    const server = this;
                    this.ccp.stdout.once('readable', () => server.stream.send(server.ccp.stdout));
                    this.ccp.stdout.once('end', () => {
                        common.settings.update();
                        server.playing = false;
                        server.playNext();
                        server.stopped = false;
                    });

                    this.announce('Now playing:', this.playing.toEmbed(this.id));
                } else {
                    if (!this.stopped) this.announce('No songs queued right now.');
                    bot.leaveVoiceChannel(bot.servers[this.id].members[bot.id].voice_channel_id);
                }
            }

            queueSong(song) {
                this.queue.push(song);
                common.settings.update();
                this.announce('Added to queue:', song.toEmbed(this.id));
                return this;
            }

            joinUser(userID) {
                const server = this,
                    voice = bot.servers[this.id].members[userID].voice_channel_id;
                return new Promise((resolve, reject) => {
                    if (voice) bot.joinVoiceChannel(voice, err => {
                        if (err && err.toString().indexOf('Voice channel already active') == -1) reject(err);
                        else {
                            server.voice = voice;
                            resolve(server);
                        }
                    });
                    else reject({
                        name: 'Could not join',
                        message: 'You are not in a voice channel!'
                    });
                });
            }

            getStream() {
                const server = this;
                return new Promise((resolve, reject) => {
                    if (server.voice) bot.getAudioContext(server.voice, (err, stream) => {
                        if (err) reject(err);
                        else {
                            server.stream = stream;
                            resolve(server);
                        }
                    });
                    else reject({
                        name: 'Could not get audio context',
                        message: 'Bot is not in a voice channel!'
                    });
                });
            }

            queueEmbed(userID) {
                const ale = new Embed('No songs queued right now.', {
                    color: bot.getColor(this.id, userID)
                });

                for (const song of this.queue) ale.addField(
                    `${ ale.fields.length + 1 }: ${ song.title }`, `Requested ${
                        song.request.id ? `by: <@${ song.request.id }>\n` : 'at:' } ${ st.timeAt(st.findTimeZone(common.settings.tz, [userID, this.id]), new Date(song.request.time)) }.`
                );

                if (ale.fields.length > 0) ale.title = 'Queued songs:';
                if (this.playing) {
                    ale.title = `Current song: ${ this.playing.title }`;
                    ale.description = `Requested ${
                        this.playing.request.id ? `by: <@${ this.playing.request.id }> ` : ' ' }at: ${ st.timeAt(st.findTimeZone(common.settings.tz, [userID, this.id]), new Date(this.playing.request.time)) }.\n`;

                    ale.thumbnail.url = this.playing.thumbnail;

                    if (ale.fields.length > 0) ale.addDesc('\n\n**Queued songs:**');
                }

                return ale;
            }

            announce(message, embed) {
                bot.sendMessage({
                    to: this.acID || this.temp,
                    message,
                    embed
                });
            }
        };
    }

    addServer(id) {
        if (!this.servers[id]) {
            this.servers[id] = new this.Server(id);

            if (common.settings.servers[id].audio) this.servers[id].loadQueue(common.settings.servers[id].audio.que);
            else common.settings.servers[id].audio = {};

            common.settings.servers[id].audio.que = this.servers[id].queue;

            if (common.settings.servers[id].audio.channel) this.servers[id].acID = common.settings.servers[id].audio.channel;

            common.settings.update();
        }
    }

    searchSong(keywords, userID) {
        const mh = this;
        return mh.apiCall(`/search?part=snippet&q=${ keywords.join('+') }&key=${ mh.key }`)
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

                resolve(new mh.Song(url, userID).update(item));
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
