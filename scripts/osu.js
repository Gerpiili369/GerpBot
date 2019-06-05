const
    fetch = require('node-fetch'),
    striptags = require('striptags'),
    DomParser = require('dom-parser'),
    parser = new DomParser(),
    { Uptime } = require('snowtime'),
    Api = require('./api'),
    Embed = require('./embed'),
    common = require('./common.js'),
    graph = require('../objectLib/osuSignature'),
    FileCoder = require('./fileCoder.js');

module.exports = class Osu extends Api {
    constructor(key) {
        super('https://osu.ppy.sh/api', key);

        this.searchColors = {
            user: 5875675,
            map: 12865159,
            forum: 6896585,
            wiki: 15182369,
        };
        this.rankColors = {
            ss: 10624871,
            s: 1268852,
            a: 7573504,
            b: 11368192,
            c: 10685204,
            d: 14277338,
        };
        this.mods = [
            'NF', 'EZ', 'TD', 'HD', 'HR', 'SD', 'DT', 'RL', 'HT', 'NC', 'FL',
            'AP', 'SO', 'R2', 'PF'
        ];
    }

    getUser(userName) {
        const oue = new Embed();
        let user = null;
        return new Promise((resolve, reject) => this.apiCall(`/get_user?k=${ this.key }&u=${ userName }`)
            .then(userList => {
                if (userList.length === 0) resolve(oue.error({
                    name: 'User not found', message: 'Couldn\'t find user with this name!'
                }));
                user = userList[0];

                oue.title = `${ user.username }'s osu! profile`;
                oue.description = `${ '<about me>\n' +
                    '**Level ' }${ Math.round(user.level) }**\n\n` +
                    `**Total Play Count:** \`${ user.playcount }\`\n` +
                    `**Total Play Time:** \`${ new Uptime(0, user.total_seconds_played * 1000).toString() }\`\n`;
                oue.url = `https://osu.ppy.sh/users/${ user.user_id }`;
                oue.color = this.searchColors.user;
                oue.image.url = `https://osu.ppy.sh/images/flags/${ user.country }.png`;

                oue
                    .addField('Performance',
                        `${ user.pp_rank ? `#${ user.pp_rank } (<country> #${ user.pp_country_rank })\n` : ''
                        }**${ Math.round(user.pp_raw) }pp** ~ ` +
                        `acc: ${ Math.round(user.accuracy * 100) / 100 }%`
                    )
                    .addField('Score',
                        `Ranked: \`${ user.ranked_score }\`\n` +
                        `Total: \`${ user.total_score }\`\n` +
                        `300 count: \`${ user.count300 }\`\n` +
                        `100 count: \`${ user.count100 }\`\n` +
                        `50 count: \`${ user.count50 }\``,
                        true
                    )
                    .addField('Rank count',
                        `**SS+** ${ user.count_rank_ssh }\n` +
                        `**S+** ${ user.count_rank_sh }\n` +
                        `**SS** ${ user.count_rank_ss }\n` +
                        `**S** ${ user.count_rank_s }\n` +
                        `**A** ${ user.count_rank_a }`,
                        true
                    );

                let eventStr = '';
                for (let i = 0; i < user.events.length && i < 5; i++) eventStr += `${ common.dEsc(striptags(user.events[i].display_html)) }\n\n`;

                if (eventStr) oue.addField('*Recent events*', eventStr);
            })
            .then(() => fetch(`https://osu.ppy.sh/users/${ user.user_id }`))
            .then(res => res.text())
            .then(html => {
                const
                    userJson = striptags(
                        parser.parseFromString(html).getElementById('json-user').innerHTML
                    ),
                    scrapeData = JSON.parse(userJson.slice(0, userJson.indexOf('turbolinks'))),
                    lastSeen = new Uptime(scrapeData.lastvisit).toString();

                if (scrapeData.playstyle) for (let i = 0; i < scrapeData.playstyle.length; i++) scrapeData.playstyle[i] =
                    scrapeData.playstyle[i].charAt(0).toUpperCase() +
                    scrapeData.playstyle[i].substr(1);

                oue.fields[0].value = oue.fields[0].value.replace('<country>', scrapeData.country.name || '');
                oue.description = oue.description.replace('<about me>',
                    `${ scrapeData.country.name ? `From _**${ scrapeData.country.name }**_\n\n` : ''
                    }Joined _**${ new Date(scrapeData.join_date).toDateString() }**_\n` +
                    `Last seen _**${
                        lastSeen.indexOf(',') > -1 ? lastSeen.substring(0, lastSeen.indexOf(',')) : 'a moment'
                    } ago**_\n\n${
                        scrapeData.playstyle ? `Plays with _**${ scrapeData.playstyle.join(', ') }**_\n\n` : ''
                    }${
                        scrapeData.location ? `Location _**${ scrapeData.location }**_\n` : ''
                    }${
                        scrapeData.interests ? `Interests _**${ scrapeData.interests }**_\n` : ''
                    }${
                        scrapeData.occupation ? `Occupation _**${ scrapeData.occupation }**_\n` : ''
                    }`
                );

                oue.thumbnail.url = (scrapeData.avatar_url[0] === '/' ? 'https://osu.ppy.sh' : '') + scrapeData.avatar_url;
                oue.image.url = scrapeData.cover_url;

                return user.user_id;
            })
            .then(user => this.getUserBest(user, 5))
            .then(playList => this.playsToString(playList))
            .then(playsListStr => {
                if (playsListStr) oue.addField('*Best performance*', playsListStr);
                return user.user_id;
            })
            .then(user => this.getUserRecentPlays(user, 50))
            .then(this.removeFails)
            .then(playList => this.playsToString(playList.splice(playList.length - 5)))
            .then(playsListStr => {
                if (playsListStr) oue.addField('*Recent plays*', playsListStr);
                return user.user_id;
            })
            .then(() => resolve(oue.errorIfInvalid()))
            .catch(reject)
        );
    }

    getMap(id) {
        return this.apiCall(`/get_beatmaps?k=${ this.key }&b=${ id }&limit=1`, 'beatmap information.');
    }

    getMapWithHash(hash) {
        return this.apiCall(`/get_beatmaps?k=${ this.key }&h=${ hash }&limit=1`, 'beatmap information.');
    }

    getUserBest(user, limit = 10) {
        return this.apiCall(`/get_user_best?k=${ this.key }&u=${ user }&limit=${ limit }`, 'user\'s best performance.');
    }

    getUserRecentPlays(user, limit = 10) {
        return this.apiCall(`/get_user_recent?k=${ this.key }&u=${ user }&limit=${ limit }`, 'user\'s recent plays.');
    }

    getReplayData(user, mapId, mode = 0) {
        return this.apiCall(`/get_replay?k=${ this.key }&m=${ mode }&b=${ mapId }&u=${ user }`, 'replay data.');
    }

    getBestReplay(username, playNumber = 1) {
        return new Promise((resolve, reject) => {
            let
                play = null,
                mapHash = '';

            this.getUserBest(username, 100)
                .then(data => {
                    if (data[playNumber - 1]) play = data[playNumber - 1];
                    else reject({ name: 'Not found', message: 'User or top play not found!' });
                })
                .then(() => this.getMap(play.beatmap_id))
                .then(data => (mapHash = data[0].file_md5))
                .then(() => this.getReplayData(play.user_id, play.beatmap_id))
                .then(replayData => {
                    if (replayData.error) throw new Error(replayData.error);

                    const
                        cdr = Buffer.from(replayData.content, replayData.encoding),
                        file = new FileCoder(),
                        mode = 0;

                    file.addValue(mode, 'byte')
                        .addValue(3162190593, 'int') // Version placeholder
                        .addString(mapHash)
                        .addString(username)
                        .addString('') // Replay hash
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
                        .addString(graph)
                        .addValue((new Date(`${ play.date.replace(' ', 'T') }Z`).getTime() * 10000) + 621355968000000000, 'long')
                        .addValue(cdr.length, 'int')
                        .addFromBuffer(cdr)
                        .addValue(0, 'long'); // Unknown
                    resolve(file);
                })
                .catch(reject);
        });
    }

    readReplay(url) {
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
                    .decodeValue('date', 'long');

                for (const data of play.dataArray) pa.push(data.value);

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

                return {
                    beatmap_id: pa[2],
                    username: pa[3],
                    count300: pa[5],
                    count100: pa[6],
                    count50: pa[7],
                    countgeki: pa[8],
                    countkatu: pa[9],
                    countmiss: pa[10],
                    score: pa[11],
                    maxcombo: pa[12],
                    perfect: pa[13],
                    enabled_mods: pa[14],
                    date: new Date((pa[16] - 621355968000000000) / 10000)
                        .toISOString()
                        .slice(0, -5)
                        .replace('T', ' '),
                    rank: this.rankCalc(pa[5], pa[6], pa[7], pa[10], pa[14]),
                };
            });
    }

    singlePlayEmbed(perf) {
        return new Promise(resolve => {
            if (perf.beatmap_id.length === 32) resolve(this.getMapWithHash(perf.beatmap_id));
            else resolve(this.getMap(perf.beatmap_id));
        }).then(maps => {
            if (maps.length === 0) return Promise.reject({
                name: 'Map not found',
                message: 'The map could not be found!',
                code: 404
            });

            perf.rank = perf.rank.replace('X', 'SS').replace('H', '+');
            perf.accuracy = this.accCalc(perf.count300, perf.count100, perf.count50, perf.enabled_mods);

            const
                map = maps[0],
                re = new Embed(`${ common.dEsc(map.artist) } - ${ common.dEsc(map.title) } [${ common.dEsc(map.version) }]`,
                    `Beatmap by ${ map.creator }\n` +
                    `Played${ perf.username ? ` by ${ perf.username }` : '' } on \`<date>\``, {
                        color: this.rankColors[perf.rank.toLowerCase().replace('+', '')],
                        thumbnail: { url: `https://osu.ppy.sh/images/badges/score-ranks/Score-${ perf.rank.replace('+', 'Plus').replace('D', 'F') }-Small-60.png` },
                        image: { url: `https://assets.ppy.sh/beatmaps/${ map.beatmapset_id }/covers/cover.jpg` }
                    }
                );

            re.addField(`Score **${ perf.score }**`,
                `300 \`${ perf.count300 }x\`\n` +
                ` 100 \`${ perf.count100 }x\`\n` +
                `      50 \`${ perf.count50 }x\``,
                true
            ).addField(`**${ perf.pp ? `${ Math.round(perf.pp) }pp` : '•' }**`,
                `激 \`${ perf.countgeki }x\`\n` +
                `喝 \`${ perf.countkatu }x\`\n` +
                `╳ \`${ perf.countmiss }x\``,
                true
            );
            re.addField('Combo', `\t**${ perf.maxcombo }x**`, true);
            re.addField('Accuracy', `\t**${ perf.accuracy }%**`, true);

            return { re, date: new Date(`${ perf.date.replace(' ', 'T') }Z`).getTime() };
        });
    }

    modulator(input) {
        const activeMods = [];
        Number(input).toString(2)
            .split('')
            .reverse()
            .forEach((value, i) => {
                if (value == 1) activeMods.push(this.mods[i]);
                if (this.mods[i] === 'NC') activeMods.splice(activeMods.indexOf('DT'), 1);
                if (this.mods[i] === 'PF') activeMods.splice(activeMods.indexOf('SD'), 1);
            });
        return activeMods;
    }

    // https://osu.ppy.sh/help/wiki/Game_Modes/osu!#accuracy
    accCalc(n300, n100, n50, miss) {
        const count = {
            n300: Number(n300),
            n100: Number(n100),
            n50: Number(n50),
            miss: Number(miss),
        };

        return Math.round(
            ((count.n50 * 50) + (count.n100 * 100) + (count.n300 * 300)) /
            ((count.miss + count.n50 + count.n100 + count.n300) * 300) * 10000
        ) / 100;
    }

    // https://osu.ppy.sh/help/wiki/Game_Modes/osu!#grades
    rankCalc(n300, n100, n50, miss, mods = 0) {
        const
            count = {
                n300: Number(n300),
                n100: Number(n100),
                n50: Number(n50),
                miss: Number(miss),
            },
            activeMods = this.modulator(mods);

        const total = count.n300 + n100 + count.n50 + count.miss;
        let rank = 'D';

        if (total === count.n300) {
            if (activeMods.indexOf('HD') > -1 || activeMods.indexOf('FL') > -1) rank = 'SS+';
            else rank = 'SS';
        } else if (count.n300 / total > 0.9 && count.n50 / total < 0.01 && count.miss === 0) {
            if (activeMods.indexOf('HD') > -1 || activeMods.indexOf('FL') > -1) rank = 'S+';
            else rank = 'S';
        } else if ((count.n300 / total > 0.8 && count.miss === 0) || count.n300 / total > 0.9) rank = 'A';
        else if ((count.n300 / total > 0.7 && count.miss === 0) || count.n300 / total > 0.8) rank = 'B';
        else if (count.n300 / total > 0.6) rank = 'C';

        return rank;
    }

    removeFails(playList) {
        const playListNew = [];
        for (const perf of playList) if (perf.rank !== 'F') playListNew.push(perf);
        return playListNew;
    }

    playsToString(playList) {
        return new Promise(resolve => {
            const mapFetchList = [];
            for (const perf of playList) mapFetchList.push(this.getMap(perf.beatmap_id));
            resolve(Promise.all(mapFetchList));
        })
            .then(mapList => {
                const mapInfos = {};
                let result = '';
                for (const map of mapList) mapInfos[map[0].beatmap_id] = map[0];
                for (const perf of playList) {
                    const
                        mInfo = mapInfos[perf.beatmap_id],
                        am = this.modulator(perf.enabled_mods);
                    result += `**${ perf.rank.replace('X', 'SS').replace('H', '+') }** ${ common.dEsc(mInfo.artist) } - ${ common.dEsc(mInfo.title) } [${ common.dEsc(mInfo.version) }] ${
                        am.length > 0 ? `\`[${ am.join(',') }]\` ` : ''
                    }${ perf.pp ? `**${ Math.round(perf.pp) }pp**` : '' }\n`;
                }
                return result;
            });
    }
};
