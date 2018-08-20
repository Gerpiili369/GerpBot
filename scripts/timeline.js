const
    fetch = require('node-fetch'),
    Canvas = require('canvas'),
    canvas = new Canvas(300, 8760),
    context = canvas.getContext('2d');

module.exports = (username, psnTrophy, zoomLvl = '3') => new Promise((resolve, reject) => {
    const object = {}, games = {}, dateList = [];
    let trophyList;
    psnTrophy.getAll(username)
        .then(userData => psnTrophy.newToOld(userData.trophyList))
        .then(trophyData => {
            trophyData.trophyList = psnTrophy.groupByDate(trophyData.trophyList, 'year');
            return trophyData;
        })
        .then(trophyData => {
            for (const date in trophyData.trophyList) trophyData.trophyList[date].list = psnTrophy.groupByGame(trophyData.trophyList[date].list)
            return trophyData;
        })
        .then(data => {
            for (year of data.trophyList) {
                object[new Date(year.title).getFullYear()] = [];
                for (trophyData of year.list) {
                    trophyList = [];
                    games[trophyData.title] = null;
                    for (game of trophyData.list) trophyList.push(game.trophy);
                    object[new Date(year.title).getFullYear()].push({game: trophyData.title, list: trophyList});
                }
            }
            for (const game in games) {
                const min = 100, colors = [0, 0, 0];

                while((colors[0] + colors[1] + colors[2]) < min) {
                    for (color in colors) colors[color] = Math.floor(Math.random() * 256);
                }

                for (color in colors) colors[color] = colors[color].toString(16);
                const hex = colors.join('');
                games[game] = hex.length < 6 ? hex.length < 5 ? '00' : '0' + hex : hex;
            }
            upData = [object, games, canvas, context, zoomLvl];
            resolve(drawTL(...upData));
        })
        .catch(err => reject(err));
});

const msToH = n => Math.ceil(n / 3600000);

function drawTL(object, games, canvas, c, zoomLvl, e, click) {
    const start = msToH(new Date(new Date().getFullYear() + 1, 0));
    let x, y = Object.keys(object).length * 50, zoom = 1, ctos, text = '';

    switch(zoomLvl) {
        case '0': zoom = 0.1;     break;
        case '1': zoom = 0.25;    break;
        case '2': zoom = 0.5;     break;
        case '3': zoom = 1;       break;
        case '4': zoom = 2;       break;
        case '5': zoom = 3.5;     break;
    }

    canvas.height = y;
    canvas.width = 8760 * zoom;

    c.clearRect(0, 0, canvas.width, canvas.height);

    c.textBaseline = 'alphabetic';
    c.font = '12pt Serif';

    for (year in object) {
        y -= 50;
        object[year].reverse();
        for (gs of object[year]) {
            gs.start = msToH(gs.list[0].earned);
            gs.end = msToH(gs.list[gs.list.length - 1].earned);
            gs.extra = (start - msToH(new Date(new Date(gs.list[0].earned).getFullYear() + 1, 0)));

            x = (start - gs.start - gs.extra) * zoom;
            width = (gs.start - gs.end) * zoom;

            if (width < 1 || width > 100000) width = 1 * zoom;

            if (e) {
                const rect = canvas.getBoundingClientRect(),
                    mx = e.clientX - rect.left, my = e.clientY - rect.top;

                c.beginPath();
                c.rect(x, y, width, 45);
                if (c.isPointInPath(mx, my)) {
                    box(c, x, y, games[gs.game], width, true);

                    ctos = 35;
                    c.fillText(gs.game, mx + 10, my + ctos);

                    for (trophy of gs.list) {
                        x = (start - msToH(trophy.earned) - gs.extra) * zoom;

                        box(c, x, y, games[gs.game]);

                        c.beginPath();
                        c.rect(x, y, 1, 40);
                        if (c.isPointInPath(mx, my)) {
                            ctos += 20;
                            c.fillText(trophy.title, mx + 10, my + ctos);
                        }

                        text += trophy.title + '\n';
                    }
                } else box(c, x, y, games[gs.game], width);
            } else box(c, x, y, games[gs.game], width);
        }
    }


    for (i = 0; i < canvas.width; i += 24 * zoom) box(c, i);

    return canvas
}

function box(c, x, y, color, width, empty) {
    c.save();
    if (color) {
        c.strokeStyle = '#' + color;
        c.fillStyle = '#' + color;
        if (width) {
            if (empty) c.strokeRect(x, y, width, 45);
            else c.fillRect(x, y, width, 45);
        } else c.strokeRect(x, y, 0, 40);
    } else {
        c.fillStyle = 'green';
        c.fillRect(x, 0, 1, 25);
    }
    c.restore();
}
