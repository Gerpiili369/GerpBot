const FileCoder = require('./fileCoder.js');

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
                file = new FileCoder, mode = 0;

            file.addValue(mode, 'byte')
                .addValue(3162190593, 'int') // version placeholder
                .addString(mapHash)
                .addString(username)
                .addString('') // replay hash
                .addValue(play.count300, 'short')
                .addValue(play.count100, 'short')
                .addValue(play.count50, 'short')
                .addValue(play.countgeki, 'short')
                .addValue(play.countkatu, 'short')
                .addValue(play.countmiss, 'short')
                .addValue(play.score, 'int')
                .addValue(play.maxcombo, 'short')
                .addValue(play.perfect, 'byte')
                .addValue(play.enabled_mods, 'int')
                .addString('') // ife bar graph
                .addValue(new Date(play.date.replace(' ', 'T')).getTime() * 10000, 'long')
                .addValue(cdr.length, 'int')
                .addFromBuffer(cdr)
                .addValue(0, 'long'); // unknown

            resolve(file);
        })
        .catch(reject);

});
