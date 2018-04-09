const Emitter = require('events');
const calculateUptime = require('./snowTime').calculateUptime;

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
                    missed: 540000,
                    newRound: 555000
                }
            }
            this.players = {};
        } else for (var variable in saveData) {
            this[variable] = saveData[variable];
        }
    }

    start() {
        if (this.activePlayers()) this.startRoundTimers();
    }

    startRoundTimers() {
        setTimeout(() => {
            for (var player in this.players) {
                if (this.players[player].joined === true) {
                    this.players[player].status = 'on time';
                    this.emit('msg',player,'It is time');
                }
            }
        }, this.end - Date.now());

        setTimeout(() => {
            for (var player in this.players) {
                if (this.players[player].joined === true && !this.players[player].checkIn) {
                    this.players[player].status = 'late';
                    this.emit('msg',player,'You are late');
                }
            }
        }, this.end - Date.now() + this.time.before.late);

        setTimeout(() => {
            for (var player in this.players) {
                if (this.players[player].joined === true && !this.players[player].checkIn) {
                    this.players[player].status = 'missed';
                    this.emit('msg',player,'You have missed the thing');
                }
            }
        }, this.end - Date.now() + this.time.before.missed);

        setTimeout(() => {
            this.save();

            if (this.activePlayers()) this.newRound();
            else this.active = false;
        }, this.end - Date.now() + this.time.before.newRound)
    }

    newRound() {
        this.active = true;
        for (var player in this.players) {
            this.players[player].checkIn = false;
        }
        this.end = Date.now() + Math.floor(Math.random() * (this.time.between.max - this.time.between.min)) + this.time.between.min;
        this.startRoundTimers();
        this.sendEndtime();
        this.save();
    }

    sendEndtime () {
        for (var player in this.players) {
            if (this.players[player].joined) this.emit('msg',player,`Next checkpoint: ${new Date(this.end)}`);
        }
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

        if (!this.players[user].joined) {
            this.players[user].joined = true;
            this.save();
            if (!this.active) this.newRound();
            return `Welcome TO THE GAME!\nNext checkpoint: ${new Date(this.end)}`;
        } else {
            return 'Already here ya\'know.';
        }
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
            return `You have checked in with the status: ${this.players[user].status}, and with the delay of ${this.players[user].delay.h}h ${this.players[user].delay.min}min ${this.players[user].delay.s}s`;
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
