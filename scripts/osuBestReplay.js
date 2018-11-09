module.exports = osu => (username, playNumber = 1) => new Promise((resolve, reject) => {
    let play, mapHash;

    osu.getUserBest(username, 100)
        .then(data => {
            if (data[playNumber - 1]) play = data[playNumber - 1];
            else reject({ name: 'Not found', message: 'User or top play not found!' });
        })
        .then(() => osu.getMap(play.beatmap_id))
        .then(data => mapHash = data[0].file_md5)
        .then(() => osu.getReplayData(play.user_id, play.beatmap_id))
        .then(replayData => {
            if (replayData.error) return reject(new Error(replayData.error));

            const
                cdr = Buffer.from(replayData.content, replayData.encoding),
                file = new ProEncode, mode = 0;

            file.byte(mode)
                .int(3162190593) // version placeholder
                .string(mapHash)
                .string(username)
                .string('') // replay hash
                .short(play.count300)
                .short(play.count100)
                .short(play.count50)
                .short(play.countgeki)
                .short(play.countkatu)
                .short(play.countmiss)
                .int(play.score)
                .short(play.maxcombo)
                .byte(play.perfect)
                .int(play.enabled_mods)
                .string('') // ife bar graph
                .long(new Date(play.date.replace(' ', 'T')).getTime() * 10000)
                .int(cdr.length)
                .add(cdr)
                .long(0); // unknown

            resolve(file);
        })
        .catch(reject);

});

class ProEncode {
    constructor() {
        this.byteArray = [];
        this.lastType = '';
        this.insideAdd = false;
        this.typeLengths = {
            byte: 1,
            short: 2,
            int: 4,
            long: 8
        }
    }

    add(bytes) {
        let byteArray = [], l = this.byteArray.length

        if (bytes instanceof Buffer)
            byteArray = this.hexStringToArray(bytes.toString('hex'));
        else
            byteArray = bytes instanceof Array ? bytes : [bytes];

        this.byteArray = this.byteArray.concat(byteArray);

        if (!this.insideAdd) {
            this.lastType = 'other';
            this.insideAdd = false;
        }

        return this;
    }

    toBuffer() {
        return new Buffer(this.byteArray.join(''), 'hex');
    }

    byte(data) {
        this.byteAdd(data, 1)
        this.lastType = 'byte';
        this.insideAdd = true;
        return this;
    }

    short(data) {
        this.byteAdd(data, 2)
        this.lastType = 'short';
        this.insideAdd = true;
        return this;
    }

    int(data) {
        this.byteAdd(data, 4)
        this.lastType = 'int';
        this.insideAdd = true;
        return this;
    }

    long(data) {
        this.byteAdd(data, 8)
        this.lastType = 'long';
        this.insideAdd = true;
        return this;
    }

    string(data) {
        if (data) {
            const
                utfArray = this.hexStringToArray(Buffer.from(data, 'utf-8').toString('hex')),
                length = utfArray.length,
                bitData = length.toString(2),
                lebArray = [];

            for (let i = bitData.length; i > 0; i -= 7) lebArray.push(
                parseInt(
                    (i - 7 > 0 ? '1' : '0') + bitData.substring(i - 7, i), 2
                ).toString(16).padStart(2, '0')
            )

            this.add(['0b', ...lebArray, ...utfArray]);
        } else this.add('00');

        this.lastType = 'string';
        this.insideAdd = true;

        return this;
    }

    hexStringToArray(string) {
        const array = [];
        for (let i = string.length; i > 0; i -= 2) {
            array.push(string.substring(i - 2, i).padStart(2, '0'))
        }
        return array.reverse();
    }

    byteAdd(data, amt = 1) {
        if (typeof data === 'string') data = Number(data);

        const
            bitData = data.toString(2),
            byteArray = [];

        for (let i = bitData.length; i > 0; i -= 8) {
            let hexByte = parseInt(bitData.substring(i - 8, i), 2).toString(16)
            if (i - 8 > 0);
            byteArray.push(hexByte.padStart(2, '0'))
        }

        while(byteArray.length < amt) byteArray.push('00');

        this.add(byteArray);
    }
}
