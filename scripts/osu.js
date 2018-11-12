const
    fetch = require('node-fetch'),
    striptags = require('striptags'),
    DomParser = require('dom-parser'),
    parser = new DomParser(),
    st = require('snowtime'),
    common = require('./common.js'),
    FileCoder = require('./fileCoder.js'),
    key = common.config.auth.osu,
    endpoint = 'https://osu.ppy.sh/api',
    searchColors = {
        user: 5875675,
        map: 92755573,
        forum: 6896585,
        wiki: 109667717,
    },
    mods = [
        'NF', 'EZ', 'TD', 'HD', 'HR', 'SD', 'DT', 'RL', 'HT', 'NC', 'FL', 'AP',
        'SO', 'R2', 'PF'
    ];

module.exports = {
    getUser,
    getBestReplay,
    readReplay,
};

function getUser(user) {
    let u, oue;
    return new Promise((resolve, reject) => fetch(endpoint + '/get_user?k=' + key + '&u=' + user)
        .then(res => res.json().catch(err => reject({
            name: 'Failed to get user', message: 'Response is not JSON!'
        })))
        .then(userList => {
            if (userList.length === 0) resolve(new Embed('User not found!').error());
            u = userList[0];
            oue = new Embed(
                u.username + '\'s osu! profile',
                '<about me>\n' +
                '**Level ' + Math.round(u.level) + '**\n\n' +
                '**Total Play Count:** `' + u.playcount + '`\n' +
                '**Total Play Time:** `' + st.uptimeToString(st.calculateUptime(0, u.total_seconds_played * 1000)) + '`\n',
                {
                    url: 'https://osu.ppy.sh/users/' + u.user_id,
                    color: searchColors.user,
                    image: { url: `https://osu.ppy.sh/images/flags/${ u.country }.png` },
                }
            );

            oue.addField('Performance',
                (u.pp_rank ? `#${ u.pp_rank } (<country> #${ u.pp_country_rank })\n` : '') +
                '**' + Math.round(u.pp_raw) + 'pp** ~ ' +
                'acc: ' + Math.round(u.accuracy * 100) / 100 + '%'
            ).addField('Score',
                `Ranked: \`${ u.ranked_score }\`\nTotal: \`${ u.total_score }\`\n` +
                '300 count: \`' + u.count300 + '\`\n' +
                '100 count: \`' + u.count100 + '\`\n' +
                '50 count: \`' + u.count50 + '\`',
                true
            ).addField('Rank count',
                '**SS+** ' + u.count_rank_ssh + '\n' +
                '**S+** ' + u.count_rank_sh + '\n' +
                '**SS** ' + u.count_rank_ss + '\n' +
                '**S** ' + u.count_rank_s + '\n' +
                '**A** ' + u.count_rank_a + '',
                true
            );

            let eventStr = '';
            for (let i = 0; i < u.events.length && i < 5; i++)
                eventStr += dEsc(striptags(u.events[i].display_html)) + '\n\n';

            if (eventStr) oue.addField('*Recent events*', eventStr)
        })
        .then(() => fetch('https://osu.ppy.sh/users/' + u.user_id))
        .then(res => res.text())
        .then(html => {
            let scrapeData, lastSeen, userJson = striptags(
                parser.parseFromString(html).getElementById('json-user').innerHTML
            );

            scrapeData = JSON.parse(userJson.slice(0, userJson.indexOf('turbolinks')));
            lastSeen = st.uptimeToString(st.calculateUptime(new Date(scrapeData.lastvisit)));

            if (scrapeData.playstyle) for (let i = 0; i < scrapeData.playstyle.length; i++)
                scrapeData.playstyle[i] =
                scrapeData.playstyle[i].charAt(0).toUpperCase() +
                scrapeData.playstyle[i].substr(1);

            oue.fields[0].value = oue.fields[0].value.replace('<country>', scrapeData.country.name || '');
            oue.description = oue.description.replace('<about me>',
                (scrapeData.country.name ? 'From _**' + scrapeData.country.name + '**_\n\n' : '') +
                'Joined _**' + new Date(scrapeData.join_date).toDateString() + '**_\n' +
                'Last seen _**' +
                (lastSeen.indexOf(',') > -1 ? lastSeen.substring(0, lastSeen.indexOf(',')) : 'a moment')
                + ' ago**_\n\n' +
                (scrapeData.playstyle ? 'Plays with _**' + scrapeData.playstyle.join(', ') + '**_\n\n' : '') +
                (scrapeData.location ? 'Location _**' + scrapeData.location + '**_\n' : '') +
                (scrapeData.interests ? 'Interests _**' + scrapeData.interests + '**_\n' : '') +
                (scrapeData.occupation ? 'Occupation _**' + scrapeData.occupation + '**_\n' : '')
            );

            oue.thumbnail.url = (scrapeData.avatar_url[0] === '/' ? 'https://osu.ppy.sh' : '') + scrapeData.avatar_url;
            oue.image.url = scrapeData.cover_url;

            return u.user_id;
        })
        .then(user => getUserBest(user, 5))
        .then(playsToString)
        .then(playsListStr => {
            if (playsListStr) oue.addField('*Best performance*', playsListStr);
            return u.user_id
        })
        .then(user => getUserRecentPlays(user, 50))
        .then(removeFailsFromPlays)
        .then(removeOlderFromPlays)
        .then(playsToString)
        .then(playsListStr => {
            if (playsListStr) oue.addField('*Recent plays*', playsListStr);
            return u.user_id
        })
        .then(() => resolve(oue.errorIfInvalid()))
        .catch(reject)
    );
}

function getMap(id) {
    return fetch(endpoint + '/get_beatmaps?k=' + key + '&b=' + id + '&limit=1')
        .then(res => res2json(res, 'beatmap information.'))
}

function getMapWithHash(hash) {
    return fetch(endpoint + '/get_beatmaps?k=' + key + '&h=' + hash + '&limit=1')
        .then(res => res2json(res, 'beatmap information.'))
}

function getUserBest(user, limit = 10) {
    return fetch(endpoint + '/get_user_best?k=' + key + '&u=' + user + '&limit=' + limit)
        .then(res => res2json(res, 'user\'s best performance.'));
}

function getUserRecentPlays(user, limit = 10) {
    return fetch(endpoint + '/get_user_recent?k=' + key + '&u=' + user + '&limit=' + limit)
        .then(res => res2json(res, 'user\'s recent plays.'));
}

function getReplayData(user, mapId, mode = 0) {
    return fetch(endpoint + '/get_replay?k=' + key + '&m=' + mode + '&b=' + mapId + '&u=' + user)
        .then(res => res2json(res, 'replay data.'));
}

function getBestReplay(username, playNumber = 1) {
    return new Promise((resolve, reject) => {
        let play, mapHash;

        getUserBest(username, 100)
            .then(data => {
                if (data[playNumber - 1]) play = data[playNumber - 1];
                else reject({ name: 'Not found', message: 'User or top play not found!' });
            })
            .then(() => getMap(play.beatmap_id))
            .then(data => mapHash = data[0].file_md5)
            .then(() => getReplayData(play.user_id, play.beatmap_id))
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
                    .addString('') // life bar graph
                    .addValue((new Date(play.date.replace(' ', 'T') + 'Z').getTime() * 10000) + 621355968000000000, 'long')
                    .addValue(cdr.length, 'int')
                    .addFromBuffer(cdr)
                    .addValue(0, 'long'); // unknown
                resolve(file);
            })
            .catch(reject);
    });
}

function readReplay(url) {
    const pa = [];
    return fetch(url)
        .then(res => res.buffer())
        .then(data => {
            const play = new FileCoder();

            play.fromBuffer(data)
                .decodeValue('mode', 'byte')
                .decodeValue('version', 'int')
                .decodeString('map')
                .decodeString('username')
                .decodeString('replay')
                .decodeValue('300s', 'short')
                .decodeValue('100s', 'short')
                .decodeValue('50s', 'short')
                .decodeValue('geki', 'short')
                .decodeValue('katu', 'short')
                .decodeValue('miss', 'short')
                .decodeValue('score', 'int')
                .decodeValue('combo', 'short')
                .decodeValue('perfect', 'byte')
                .decodeValue('mods', 'int')
                .decodeString('lifebar')
                .decodeValue('date', 'long')

            for (data of play.dataArray) pa.push(data.value);
            /*
                2 map hash
                3 username
                4 replay hash
                5 300s
                6 100s
                7 50s
                8 geki
                9 katu
                10 miss
                11 score
                12 combo
                13 perfect
                14 mods
                15 lifebar
                16 date
            */
            return pa[2];
        })
        .then(getMapWithHash)
        .then(map => {
            if (map.length === 0) return Promise.reject({
                name: 'Map not found',
                message: 'The map specified in the .osr -file could not be found!',
                code: 404
            });

            map = map[0]

            const
                acc = accCalc(pa[5], pa[6], pa[7], pa[10]),
                rank = rankCalc(acc, pa[5], pa[6], pa[7], pa[10], pa[14]),
                re = new Embed(`${ dEsc(map.artist) } - ${ dEsc(map.title) } [${ dEsc(map.version) }]`,
                `Beatmap by ${ map.creator }\n` +
                `Played by ${ pa[3] } on \`<date>\``, {
                    thumbnail: { url: `https://osu.ppy.sh/images/badges/score-ranks/Score-${ rank.replace('+', 'Plus').replace('D', 'F') }-Small-60.png` },
                    image: { url: `https://assets.ppy.sh/beatmaps/${ map.beatmapset_id }/covers/cover.jpg` }
                }
            )

            re.addField(`Score **${ pa[11] }**`,
                '300 `' + pa[5] + 'x`\n' +
                ' 100 `' + pa[6] + 'x`\n' +
                '      50 `' + pa[7] + 'x`',
                true
            ).addField('**•**',
                '激 `' + pa[5] + 'x`\n' +
                '喝 `' + pa[6] + 'x`\n' +
                '╳ `' + pa[7] + 'x`',
                true
            )
            re.addField('Combo', '\t**' + pa[12] +'x**', true);
            re.addField('Accuracy', '\t**' + acc + '%**', true);

            return { re, date: (pa[16] - 621355968000000000) / 10000 };
        })
}

function removeFailsFromPlays(playList) {
    const playListNew = [];
    for (const perf of playList) if (perf.rank !== 'F') playListNew.push(perf);
    return playListNew;
}

function removeOlderFromPlays(playList, limit = 5) {
    const playListNew = [];
    for (let i = 0; i < playList.length && i < limit; i++) playListNew.push(playList[i]);
    return playListNew;
}

function playsToString(playList) {
    const mapInfos = {}, mapFetchList = [];
    let result = '', mInfo, am;
    return new Promise((resolve, reject) => {
        for (const perf of playList) mapFetchList.push(getMap(perf.beatmap_id));
        Promise.all(mapFetchList).then(mapList => {
            for (const map of mapList) mapInfos[map[0].beatmap_id] = map[0];
            for (const perf of playList) {
                mInfo = mapInfos[perf.beatmap_id],
                am = modulator(perf.enabled_mods);
                result += `**${ perf.rank.replace('X', 'SS').replace('H', '+') }** ${ dEsc(mInfo.artist) } - ${ dEsc(mInfo.title) } [${ dEsc(mInfo.version) }] ` +
                (am.length > 0 ? `\`[${ am.join(',') }]\` ` : '') +
                (perf.pp ? `**${ Math.round(perf.pp) }pp**` : '') + '\n';
            }
            resolve(result);
        });
    });
}

function modulator(input) {
    const activeMods = [];
    Number(input).toString(2).split('').reverse().forEach((v, i) => {
        if (v == 1) activeMods.push(mods[i]);
        if (mods[i] === 'NC') activeMods.splice(activeMods.indexOf('DT'), 1);
        if (mods[i] === 'PF') activeMods.splice(activeMods.indexOf('SD'), 1);
    })
    return activeMods;
}

// https://osu.ppy.sh/help/wiki/Game_Modes/osu!#accuracy
function accCalc(n300, n100, n50, miss) {
    n300 = Number(n300);
    n100 = Number(n100);
    n50 = Number(n50);
    miss = Number(miss);

    return Math.round(
        ((n50 * 50) + (n100 * 100) + (n300 * 300)) /
        ((miss + n50 + n100 + n300) * 300) * 10000
    ) / 100;
}

// https://osu.ppy.sh/help/wiki/Game_Modes/osu!#grades
function rankCalc(acc, n300, n100, n50, miss, mods) {
    acc = Number(acc);
    n300 = Number(n300);
    n100 = Number(n100);
    n50 = Number(n50);
    miss = Number(miss);
    mods = modulator(mods);

    const total = n300 + n100 + n50 + miss;
    let rank;

    if (acc === 100) {
        if (mods.indexOf('HD') > -1 || mods.indexOf('FL') > -1) rank = 'SS+'
        else rank = 'SS';
    } else if (n300 / total > 0.9 && n50 / total < 0.01 && miss === 0) {
        if (mods.indexOf('HD') > -1 || mods.indexOf('FL') > -1) rank = 'S+'
        else rank = 'S';
    } else if ((n300 / total > 0.8 && miss === 0) || n300 / total > 0.9) rank = 'A';
    else if ((n300 / total > 0.7 && miss === 0) || n300 / total > 0.8) rank = 'B';
    else if (n300 / total > 0.6) rank = 'C';
    else rank = 'D';

    return rank;
}

function dEsc(input) {
    return input.replace('_', '\\_').replace('*', '\\*')
        .replace('`', '\\`').replace('~', '\\~');
}

function res2json(res, action) {
    return res.json().catch(err => Promise.reject({
        name: 'Failed to get ' + action, message: 'Response is not JSON!'
    }))
}
