const
    Emitter = require('events'),
    { Uptime } = require('snowtime'),
    common = require('./common');

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
            this.end = null;
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
            };
            this.players = {};
        } else for (const variable in saveData) {
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
            for (const player in this.players) {
                if (this.players[player].joined && !this.players[player].checkIn) {
                    this.players[player].status = 'on time';
                    this.emit('msg', player, 'It is time');
                }
            }
            setTimeout(() => {
                for (const player in this.players) {
                    if (this.players[player].joined && !this.players[player].checkIn) {
                        this.players[player].status = 'late';
                        this.emit('msg', player, 'You are late');
                    }
                }
                setTimeout(() => {
                    for (const player in this.players) {
                        if (this.players[player].joined && !this.players[player].checkIn) {
                            this.players[player].status = 'missed';
                            this.emit('msg', player, 'You have missed the thing');
                        }
                    }
                    setTimeout(() => {
                        this.save();

                        for (const player in this.players) {
                            if (this.players[player].checkIn) {
                                this.emit('msg', player, '', this.scoreboardToEmbed(this.getScoreboard()));
                            }
                        }
                        if (this.activePlayers()) this.newRound();
                        else this.active = false;
                    }, this.time.before.newRound);
                }, this.time.before.missed);
            }, this.time.before.late);
        }, this.end - Date.now());
    }

    newRound() {
        this.active = true;
        for (const player in this.players) this.players[player].checkIn = false;
        this.end = Date.now() + Math.floor(Math.random() * (this.time.between.max - this.time.between.min)) + this.time.between.min;
        this.activateRound();
        this.sendEndtime();
        this.save();
    }

    sendEndtime() {
        for (const player in this.players) {
            if (this.players[player].joined) this.emit('msg', player, this.getCheckpoint(player));
        }
    }

    /**
     * @returns {String}
     */
    getCheckpoint() {
        return `Next checkpoint: ${ new Date(this.end) }`;
    }

    /**
     * @returns {Boolean}
     */
    activePlayers() {
        for (const player in this.players) {
            if (this.players[player].joined) return true;
        }
        return false;
    }

    /**
     * @returns {String}
     */
    join(user) {
        if (!this.players[user]) this.players[user] = {
            joined: false,
            checkIn: false,
            status: null,
            delayMs: null,
            delay: {}
        };

        let response = 'Already here ya\'know.';
        if (!this.players[user].joined) {
            response = 'Welcome TO THE GAME!';
            this.players[user].joined = true;
            this.save();
            if (this.active) response += `\n${ this.getCheckpoint() }`;
            else this.newRound();
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
        }
        return 'Nothing to leave!';
    }

    /**
     * @returns {String}
     */
    attend(user) {
        if (this.players[user] && this.players[user].joined && Date.now() > this.end && this.players[user].status != 'missed') {
            this.players[user].checkIn = true;
            this.players[user].delay = new Uptime(this.end);
            this.players[user].delayMs = this.players[user].delay.toMs;
            this.save();
            return `You have checked in with the status: ${ this.players[user].status }, and with the delay of ${ this.players[user].delay.toString() }.`;
        }
        return 'That is cheating!';
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
     * @return {Scoreboard}
     */
    getScoreboard() {
        const scoreboard = [];
        for (const player in this.players) {
            if (this.players[player].checkIn) scoreboard.push({
                id: player,
                delay: this.players[player].delay
            });
        }
        scoreboard.sort((first, second) => this.players[first.id].delayMs - this.players[second.id].delayMs);

        return scoreboard;
    }

    /**
     * @arg {Scoreboard} scoreboard
     * @return {Embed}
     */
    scoreboardToEmbed(scoreboard) {
        const embed = new common.Embed('ILE Round Scoreboard');
        scoreboard.forEach((value, i) => {
            embed.addField(
                `${ i + 1 }. ${ value.id }`,
                value.delay.toString(),
                true
            );
        });
        return embed.errorIfInvalid();
    }

    /**
     * @returns {String}
     */
    getAcronym() {
        return (
            `${ this.acronym.i[Math.floor(Math.random() * this.acronym.i.length)] } ` +
            `${ this.acronym.l[Math.floor(Math.random() * this.acronym.l.length)] } ` +
            `${ this.acronym.e[Math.floor(Math.random() * this.acronym.e.length)] }`
        );
    }
};

/**
 * @typedef {Object} IleSaveData
 * @property {Boolean} active
 * @property {Number} end
 * @property {{min: Number, max: Number}} time
 * @property {{late: Number, missed: Number, newRound: Number}} before
 * @property {{any?: {joined: Boolean, checkIn: Boolean, status: 'on time' | 'late' | 'missed', delay: Uptime?, delayMs: Number?}...}} players
 *
 * @typedef {{id: Snowflake, delay: Uptime}[]} Scoreboard
 *
 * @typedef {Object} Uptime
 * @property {number} ms
 * @property {number} s
 * @property {number} min
 * @property {number} h
 * @property {number} day
 * @property {number} year
 */
