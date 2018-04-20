const
    Emitter = require('events'),
    snowTime = require('./snowTime'),
    calculateUptime = snowTime.calculateUptime,
    uptimeToString = snowTime.uptimeToString;

module.exports = class Ile extends Emitter {
    /**
     * @arg {IleSaveData} saveData
     * @arg {{i:[], l:[], e:[]}} acronym
     */
    constructor(saveData, acronym) {
        super();

        this.acronym = acronym;

        if (Object.keys(saveData).length === 0) {
            this.active = false;
            this.end = undefined;
            this.time = {
                between: {
                    min: 3600000,
                    max: 18000000
                },
                before: {
                    late: 180000,
                    missed: 360000,
                    newRound: 15000
                }
            }
            this.players = {};
        } else for (var variable in saveData) {
            this[variable] = saveData[variable];
        }
        this.started = false;
    }

    start() {
        this.started = true;
        if (this.activePlayers()) this.activateRound();
        else this.active = false;
    }

    activateRound() {
        setTimeout(() => {
            this.end = Date.now();
            for (var player in this.players) {
                if (this.players[player].joined === true && !this.players[player].checkIn) {
                    this.players[player].status = 'on time';
                    this.emit('msg',player,'It is time');
                }
            }
            setTimeout(() => {
                for (var player in this.players) {
                    if (this.players[player].joined === true && !this.players[player].checkIn) {
                        this.players[player].status = 'late';
                        this.emit('msg',player,'You are late');
                    }
                }
                setTimeout(() => {
                    for (var player in this.players) {
                        if (this.players[player].joined === true && !this.players[player].checkIn) {
                            this.players[player].status = 'missed';
                            this.emit('msg',player,'You have missed the thing');
                        }
                    }
                    setTimeout(() => {
                        this.save();

                        if (this.activePlayers()) this.newRound();
                        else this.active = false;
                    }, this.time.before.newRound);
                }, this.time.before.missed);
            }, this.time.before.late);
        }, this.end - Date.now());
    }

    newRound() {
        this.active = true;
        for (var player in this.players) {
            this.players[player].checkIn = false;
        }
        this.end = Date.now() + Math.floor(Math.random() * (this.time.between.max - this.time.between.min)) + this.time.between.min;
        this.activateRound();
        this.sendEndtime();
        this.save();
    }

    sendEndtime() {
        for (var player in this.players) {
            if (this.players[player].joined) this.emit('msg',player,this.getCheckpoint(player));
        }
    }

    /**
     * @returns {String}
     */
    getCheckpoint() {
        return `Next checkpoint: ${new Date(this.end)}`;
    }

    /**
     * @returns {Boolean}
     */
    activePlayers() {
        for (var player in this.players) {
            if (this.players[player].joined) return true;
        }
    }

    /**
     * @returns {String}
     */
    join(user) {
        if (typeof this.players[user] == 'undefined') {
            this.players[user] = {
                joined: false,
                checkIn: false,
                status: null,
                delay: {}
            };
        }

        let response;
        if (!this.players[user].joined) {
            response = 'Welcome TO THE GAME!'
            this.players[user].joined = true;
            this.save();
            if (!this.active) this.newRound();
            else response += `\n${this.getCheckpoint()}`;
        } else {
            response = 'Already here ya\'know.';
        }

        return response;
    }

    /**
     * @returns {String}
     */
    leave(user) {
        if (this.players[user] && this.players[user].joined) {
            this.players[user].joined = false;
            this.save();
            return 'Freedom, I guess.';
        } else {
            return 'Nothing to leave!';
        }
    }

    /**
     * @returns {String}
     */
    attend(user) {
        if (this.players[user] && this.players[user].joined && Date.now() > this.end && this.players[user].status != 'missed') {
            this.players[user].checkIn = true;
            this.players[user].delay = calculateUptime(this.end);
            return `You have checked in with the status: ${this.players[user].status}, and with the delay of ${uptimeToString(this.players[user].delay)}.`;
        } else {
            return 'That is cheating!';
        }
    }

    save() {
        this.emit('save', {
            active: this.active,
            end: this.end,
            time: this.time,
            players: this.players
        });
    }

    /**
     * @returns {String}
     */
    getAcronym() {
        let acronym =
            `${this.acronym['i'][Math.floor(Math.random() * this.acronym['i'].length)]} ` +
            `${this.acronym['l'][Math.floor(Math.random() * this.acronym['l'].length)]} ` +
            `${this.acronym['e'][Math.floor(Math.random() * this.acronym['e'].length)]}`;
        return acronym;
    }
}
/**
 * @typedef {Object} IleSaveData
 * @property {Boolean} active
 * @property {Number} end
 * @property {{min: Number, max: Number}} time
 * @property {{late: Number, missed: Number, newRound: Number}} before
 * @property {{any?: {joined: Boolean, checkIn: Boolean, status: 'on time' | 'late' | 'missed', delay: Uptime?}...}} players
 *
 * @typedef {Object} Uptime
 * @property {number} ms
 * @property {number} s
 * @property {number} min
 * @property {number} h
 * @property {number} day
 * @property {number} year
 *
 */
