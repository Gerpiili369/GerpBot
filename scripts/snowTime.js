module.exports = {
    /**
     * @arg {String} input
     * @returns {Number|String}
     */
    anyTimeToMs(input) {
        if (!input) return 'Invalid input!';

        let
            num = [],
            unit = [],
            outOfNumbers = false;

        input = input.split('');

        for (let i = 0; i < input.length; i++) {
            if (!isNaN(input[i])) {
                if (!outOfNumbers) {
                    num.push(input[i])
                } else return('Numbers after letters not allowed!');
            } else {
                outOfNumbers = true;
                unit.push(input[i]);
            }
        }

        if (num.length === 0) num = ['1'];

        num = Number(num.join(''));
        unit = unit.join('');

        if (unit === '') return 'Unit missing!';

        switch (unit) {
            case 'y':
                num *= 365;
            case 'd':
                num *= 24;
            case 'h':
                num *= 60;
            case 'min':
                num *= 60;
            case 's':
                num *= 1000;
            case 'ms':
                return num;
            default:
                return 'Incorrect unit!'
        }
    },

    /**
     * @arg {Date} start
     * @arg {Date} [end]
     * @returns {Uptime}
     */
    calculateUptime(start,end = Date.now(),msOnly = false) {
        let uptime = {};

        uptime.ms = end - start;
        if (msOnly) return uptime;
        uptime.s = Math.floor(uptime.ms / 1000);
        uptime.ms -= uptime.s * 1000;
        uptime.min = Math.floor(uptime.s / 60);
        uptime.s -= uptime.min * 60;
        uptime.h = Math.floor(uptime.min / 60);
        uptime.min -= uptime.h * 60;
        uptime.d = Math.floor(uptime.h / 24);
        uptime.h -= uptime.d * 24;
        uptime.y = Math.floor(uptime.d / 365);
        uptime.d -= uptime.y * 365;

        return uptime;
    },

    /**
    * @arg {Uptime} uptime
    * @returns {string}
    */
    uptimeToString(uptime) {
        let string =
            `${(uptime.y > 0) ? `${uptime.y} year(s), ` : ''}` +
            `${(uptime.d > 0) ? `${uptime.d} day(s), ` : ''}` +
            `${(uptime.h > 0) ? `${uptime.h} hour(s), ` : ''}` +
            `${(uptime.min > 0) ? `${uptime.min} minute(s), ` : ''}` +
            `${uptime.s} second(s)`
        return string;
    },

    /**
     * @arg {Snowflake} id
     * @returns {Date}
     */
    sfToDate(id) {
        return new Date(id / Math.pow(2,22) + 1420070400000);
    },

    /**
     * @arg {String} input
     * @returns {Snowflake}
    */
    snowmaker(input) {
        let sf = [];

        input = input.split(' ').join('').split('');
        input.forEach((v,i,a) => {if (!isNaN(Number(v))) sf.push(v);});

        return sf.join('');
    },

    /**
     * @arg {String} dateString
     * @returns {Date}
     */
    datemaker(dateString) {
        let date, current = new Date().toISOString();
        if (dateString.indexOf('T') == -1) {
            dateString = `${current.substring(0,current.indexOf('T'))}T` + dateString;
            date = new Date(dateString);
            if (date < new Date()) {
                date.setDate(date.getDate()+1);
            }
        } else {
            date = new Date(dateString);
        }

        return date;
    },

    /**
     * @arg {String} tz
     * @returns {Boolean}
     */
    isValidTimezone(tz) {
        if (tz === 'Z' || tz === 'z') return false;
        return new Date(`2017-12-08T12:36:24${tz}`) != 'Invalid Date' ? true : false;
    },

    /**
     * @arg {String} timezone
     * @arg {Date} d
     * @returns {String}
     */
     timeAt(timezone, d = new Date()) {
        const tz = timezone.split(':');

        d.setHours(d.getHours() + Number(tz[0]) + Number(tz[1]/60));

        return d.toUTCString().replace('GMT', 'UTC') + `${timezone}`;
    },
    
    /**
     * @arg {Object} tz
     * @arg {Array} keys
     * @returns {String}
     */
    findTimeZone(tz, keys) {
        for (let i = 0; i < keys.length; i++) {
            if (tz[keys[i]] && isValidTimezone(tz[keys[i]])) return tz[keys[i]];
        }
        return '+00:00';
    },

    /**
     * @returns {String}
     */
    info() {
        return 'Time and Snowflake function library.';
    }
}

/**
* @typedef {String} Snowflake
* @typedef {Object} Uptime
* @property {number} ms
* @property {number} s
* @property {number} min
* @property {number} h
* @property {number} day
* @property {number} year
 */
