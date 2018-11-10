const
    fetch = require('node-fetch'),
    Canvas = require('canvas'),
    fs = require('fs'),
    map = {
        width: 300,
        height: 300
    }

class GameArea {
    constructor() {
        this.players = {};
        this.sSize = 20;

        this.canvas = new Canvas(map.width, map.height);
        this.c = this.canvas.getContext('2d');
        this.c.textBaseline = 'alphabetic';
        this.c.font = '8pt Serif';
    }

    disconnect(id) {
        players[id].online = false;
        msg('disconnected', id);
        update();
    }

    update() {
        const list = [];
        for (const player in this.players) if (this.players[player].online) list.push({
            name: this.players[player].username || player,
            x: this.players[player].x,
            y: this.players[player].y
        });

        this.c.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = 0; i <= this.canvas.width; i += this.sSize) {
            this.c.beginPath();
            this.c.moveTo(i, 0);
            this.c.lineTo(i, this.canvas.height);
            this.c.stroke();
        }

        for (let i = 0; i <= this.canvas.height; i += this.sSize) {
            this.c.beginPath();
            this.c.moveTo(0, i);
            this.c.lineTo(this.canvas.width, i);
            this.c.stroke();
        }

        for (const player of list) {
            this.c.fillStyle = 'blue';
            this.c.fillRect(player.x, player.y, this.sSize, this.sSize);
            this.c.fillText(player.name, player.x + this.sSize, player.y);
        }

        return this.canvas;
    }

    msg(msg, id) {
        console.log('msg', `[${ players[id].username || id }] ${ msg }`);
    }
}

class Player {
    constructor(id, username) {
        this.id = id;
        this.username = username;
        this.online = true;
        this.speed = new GameArea().sSize;
        this.x = 0;
        this.y = 0;
    }

    move(dir) {
        switch (dir) {
            case 'left':
                if (this.x - this.speed >= 0) this.x -= this.speed;
                break;
            case 'up':
                if (this.y - this.speed >= 0) this.y -= this.speed;
                break;
            case 'right':
                if (this.x + this.speed < map.width) this.x += this.speed;
                break;
            case 'down':
                if (this.y + this.speed < map.height) this.y += this.speed;
                break;
        }
    }
}

module.exports = {
    GameArea,
    Player
};
