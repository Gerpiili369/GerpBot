const
    cp = require('child_process'),
    st = require('snowtime'),
    common = require('../common'),
    Embed = require('../embed'),
    Song = require('./song');

class Server {
    constructor(id, bot) {
        this.id = id;
        this.queue = [];
        this.playing = false;
        this.stopped = false;
        this.bot = bot;
    }

    loadQueue(queue = []) {
        for (const song of queue) this.queue.push(
            new Song(song.url, song.request, this.bot).update(song)
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
            this.bot.leaveVoiceChannel(this.bot.servers[this.id].members[this.bot.id].voice_channel_id);
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
            voice = this.bot.servers[this.id].members[userID].voice_channel_id;
        return new Promise((resolve, reject) => {
            if (voice) server.bot.joinVoiceChannel(voice, err => {
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
            if (server.voice) server.bot.getAudioContext(server.voice, (err, stream) => {
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
            color: this.bot.getColor(this.id, userID)
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
        this.bot.sendMessage({
            to: this.acID || this.temp,
            message,
            embed
        });
    }
}

module.exports = Server;
