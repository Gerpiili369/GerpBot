const
    cp = require('child_process'),
    st = require('snowtime'),
    common = require('../common'),
    CustomError = require('../error'),
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
        return new Promise(resolve => {
            switch (action) {
                case 'stop':
                case 'skip':
                    if (this.playing && this.ccp) {
                        if (action === 'stop') {
                            this.stopped = true;
                            this.announce('Stopped!');
                        } else
                            this.announce('Skipped!');

                        this.ccp.kill();
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

            this.ccp.stdout.once('readable', () => this.stream.send(this.ccp.stdout));
            this.ccp.stdout.once('end', () => {
                common.settings.update();
                this.playing = false;
                this.playNext();
                this.stopped = false;
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
        const voice = this.bot.servers[this.id].members[userID].voice_channel_id;
        return new Promise((resolve, reject) => {
            if (voice) this.bot.joinVoiceChannel(voice, err => {
                if (err && err.toString().indexOf('Voice channel already active') == -1) reject(err);
                else {
                    this.voice = voice;
                    resolve(this);
                }
            });
            else reject(new CustomError({
                name: 'Could not join',
                message: 'You are not in a voice channel!'
            }));
        });
    }

    getStream() {
        return new Promise((resolve, reject) => {
            if (this.voice) this.bot.getAudioContext(this.voice, (err, stream) => {
                if (err) reject(err);
                else {
                    this.stream = stream;
                    resolve(this);
                }
            });
            else reject(new CustomError({
                name: 'Could not get audio context',
                message: 'Bot is not in a voice channel!'
            }));
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
