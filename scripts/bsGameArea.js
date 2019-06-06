const Canvas = require('canvas').Canvas;

class GameArea {
    constructor(width, height) {
        this.players = {};
        this.sSize = 20;

        this.canvas = new Canvas(width, height);
        this.c = this.canvas.getContext('2d');
        this.c.textBaseline = 'alphabetic';
        this.c.font = '8pt Serif';
    }

    disconnect(id) {
        this.players[id].online = false;
        this.message('disconnected', id);
        this.update();
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

    message(message, id) {
        return `message [${ this.players[id].username || id }] ${ message }`;
    }
}

module.exports = GameArea;
