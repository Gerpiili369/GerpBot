class Player {
    constructor(id, username, map) {
        this.id = id;
        this.username = username;
        this.map = map;
        this.online = true;
        this.speed = 20;
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
                if (this.x + this.speed < this.map.width) this.x += this.speed;
                break;
            case 'down':
                if (this.y + this.speed < this.map.height) this.y += this.speed;
                break;
            default:
        }
    }
}

module.exports = Player;
