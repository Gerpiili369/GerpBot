module.exports = {
    /**
     * @arg {Date} start
     * @arg {Date} [end]
     * @returns {Uptime}
     */
    calculateUptime(start,end = Date.now()) {
        let uptime = {};

        uptime.ms = end - start;
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
    }
}
