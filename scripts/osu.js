const
    fetch = require('node-fetch'),
    striptags = require('striptags'),
    DomParser = require('dom-parser'),
    parser = new DomParser(),
    st = require('snowtime'),
    key = require('../config').auth.osu,
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
};

function getUser(user) {
    let u, oue;
    return new Promise((resolve, reject) => fetch(endpoint + '/get_user?k=' + key + '&u=' + user)
        .then(res => res.json().catch(err => reject({
            name: 'Failed to get user', message: 'Response is not JSON!'
        })))
        .then(userList => {
            if (userList.length === 0) resolve(failEmbed('User not found!'));
            u = userList[0];
            oue = {
                title: u.username + '\'s osu! profile',
                description: '<about me>\n' +
                    '**Level ' + Math.round(u.level) + '**\n\n' +
                    '**Total Play Count:** `' + u.playcount + '`\n' +
                    '**Total Play Time:** `' + st.uptimeToString(st.calculateUptime(0, u.total_seconds_played * 1000)) + '`\n',
                url: 'https://osu.ppy.sh/users/' + u.user_id,
                color: searchColors.user,
                thumbnail: {},
                image: { url: `https://osu.ppy.sh/images/flags/${ u.country }.png` },
                fields: [
                    {
                        name: 'Performance',
                        value: (u.pp_rank ? `#${ u.pp_rank } (<country> #${ u.pp_country_rank })\n` : '') +
                            '**' + Math.round(u.pp_raw) + 'pp** ~ ' +
                            'acc: ' + Math.round(u.accuracy * 100) / 100 + '%'
                    },
                    {
                        name: 'Score',
                        value: `Ranked: \`${ u.ranked_score }\`\nTotal: \`${ u.total_score }\`\n` +
                            '300 count: \`' + u.count300 + '\`\n' +
                            '100 count: \`' + u.count100 + '\`\n' +
                            '50 count: \`' + u.count50 + '\`',
                        inline: true
                    },
                    {
                        name: 'Rank count',
                        value:
                            '**SS+** ' + u.count_rank_ssh + '\n' +
                            '**S+** ' + u.count_rank_sh + '\n' +
                            '**SS** ' + u.count_rank_ss + '\n' +
                            '**S** ' + u.count_rank_s + '\n' +
                            '**A** ' + u.count_rank_a + '',
                        inline: true
                    }
                ]
            }

            let eventStr = '';
            for (let i = 0; i < u.events.length && i < 5; i++)
                eventStr += dEsc(striptags(u.events[i].display_html)) + '\n\n';

            if (eventStr) oue.fields.push({
                name: '*Recent events*', value: eventStr
            })
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
        .then(getUserBest)
        .then(playsToString)
        .then(playsListStr => {
            if (playsListStr) oue.fields.push({
                name: '*Best performance*',
                value: playsListStr
            })
            return u.user_id
        })
        .then(getUserRecentPlays)
        .then(playsToString)
        .then(playsListStr => {
            if (playsListStr) oue.fields.push({
                name: '*Recent plays*',
                value: playsListStr
            })
            return u.user_id
        })
        .then(() => resolve(oue))
        .catch(reject)
    );
}

function getMap(id) {
    return fetch(endpoint + '/get_beatmaps?k=' + key + '&b=' + id + '&limit=1')
        .then(res => res2json(res, 'beatmap information.'))
}

function getUserBest(user) {
    return fetch(endpoint + '/get_user_best?k=' + key + '&u=' + user + '&limit=5')
        .then(res => res2json(res, 'user\'s best performance.'));
}

function getUserRecentPlays(user) {
    return fetch(endpoint + '/get_user_recent?k=' + key + '&u=' + user + '&limit=5')
        .then(res => res2json(res, 'user\'s recent plays.'));
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
    activeMods = [];
    Number(input).toString(2).split('').reverse().forEach((v, i) => {
        if (v == 1) activeMods.push(mods[i]);
        if (mods[i] === 'NC') activeMods.splice(activeMods.indexOf('DT'), 1);
        if (mods[i] === 'PF') activeMods.splice(activeMods.indexOf('SD'), 1);
    })
    return activeMods;
}

function dEsc(input) {
    return input.replace('_', '\\_\\').replace('*', '\\*\\')
        .replace('`', '\\`\\').replace('~', '\\~\\');
}

function res2json(res, action) {
    return res.json().catch(err => Promise.reject({
        name: 'Failed to get ' + action, message: 'Response is not JSON!'
    }))
}

function failEmbed(name, message = '') {
    return {
        title: name,
        description: message,
        color: 16711680
    }
}
