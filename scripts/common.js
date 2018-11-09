const
    isUrl = require('is-url'),
    logger = require('winston'),
    config = require('../config')

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true,
    timestamp: true
});
logger.level = 'debug';

class Embed {
    constructor(title, description = '', opts = {}) {
        if (title instanceof Object) {
            opts = title;
            title = opts.title;
            description = opts.description;
        }

        if (description instanceof Object) {
            opts = description;
            description = opts.description;
        }

        this.title = title || '';
        this.description = description || '';
        this.url = this.title && opts.url || '';
        this.color = opts.color || colors.gerp;
        if (opts.timestamp) this.timestamp =  opts.timestamp instanceof Date ? opts.timestamp : new Date(opts.timestamp);
        this.footer = opts.footer || { icon_url: '', text: '' };
        this.thumbnail = opts.thumbnail || { url: '' };
        this.image = opts.image || { url: ''};
        this.author = opts.author || { name: '', url: '', icon_url: '' };
        this.fields = [];
        this.Field = class Field {
            constructor(name, value, inline) {
                this.name = name;
                this.value = value;
                if (inline) this.inline = inline;
            }
        }
        this.multiEmbed = [];

        if (opts.fields instanceof Array) for (const field of opts.fields) this.addField(field.name, field.value, field.inline);
    }

    addField(name, value, inline) {
        if (name && value) this.fields.push(new this.Field(name, value, inline));
        return this;
    }

    addDesc(str = '') {
        this.description += str;
    }

    error(err, stack = false) {
        // name, message, stack, code
        if (err) {
            if (err.name) this.author.name = err.name;
            if (err.message) this.title = err.message;
            if (err.stack && stack) this.description = err.stack;
            if (err.type) this.footer.text = err.code;
        }

        this.color = colors.error;

        return this;
    }

    isValid() {
        const
            urls2check = [],
            countList = [],
            fails = [];
        let total = 0;

        // title check
        if (this.title) countList.push([
            this.title, 256, 'title'
        ]);

        // description check
        if (this.description) countList.push([
            this.description, 2048, 'description'
        ]);

        // url checl
        if (this.url) urls2check.push([
            this.url, 'url'
        ]);

        // color check
        if (this.color && !(typeof this.color === 'string' || typeof this.color === 'number'))
            fails.push('Color must be a string or a number!');

        // time check
        if (this.time && !(this.time instanceof Date))
            fails.push('Time must be a Date!');

        // footer check
        if (this.footer) {
            if (this.footer instanceof Object) {
                if (this.footer.icon_url) urls2check.push([
                    this.footer.icon_url, 'footer icon url'
                ]);
                if (this.footer.text) countList.push([
                    this.footer.text, 2048, 'footer text'
                ]);
            } else fails.push('Footer must be an object!');
        }

        // thumbnail check
        if (this.thumbnail) {
            if (this.thumbnail instanceof Object) {
                if (this.thumbnail.url) urls2check.push([
                    this.thumbnail.url, 'thumbnail url'
                ]);
            } else fails.push('Thumbnail must be an object!');
        }

        // image check
        if (this.image) {
            if (this.image instanceof Object) {
                if (this.image.url) urls2check.push([
                    this.image.url, 'image url'
                ]);
            } else fails.push('Image must be an object!');
        }

        // author must be an object
        if (this.author) {
            if (this.author instanceof Object) {
                if (this.author.name) countList.push([
                    this.author.name, 256, 'author name'
                ]);
                if (this.author.icon_url) urls2check.push([
                    this.author.icon_url, 'author icon url'
                ]);
                if (this.author.url) urls2check.push([
                    this.author.url, 'author url'
                ]);
            } else fails.push('Author must be an object!');
        }

        // check field amount
        if (this.fields.length > 25)
            fails.push(`Max amount of fields: 25, current amout: ${ this.fields.length }.`);

        // check field name, value and inline
        for (const field of this.fields) {
            const fn = this.fields.indexOf(field) + 1;

            if (field.name === '') fails.push(`Field #${fn} name cannot be empty string!`);
            if (field.value === '') fails.push(`Field #${fn} value cannot be empty string!`);

            if (field.inline && (typeof field.inline !== 'boolean'))
                fails.push(`Field #${fn} inline is not a boolean!`);

            countList.push(
                [field.name, 256, `field #${fn} name`],
                [field.value, 1024, `field #${fn} value`]
            );
        }

        // check url strings
        for (const url of urls2check) {
            if (typeof url[0] === 'string') {
                if (!isUrl(url[0])) fails.push(`URL "${url[1]}" is not a string!`);
            } else fails.push(`URL "${url[1]}" is not a string!`);
        }

        // check normal (countable) strings
        for (const countable of countList) {
            if (typeof countable[0] === 'string') {
                if (countable[0].length > countable[1])
                    fails.push(`Countable "${countable[3]}" is too long! Length: ${countable[0].length}, max length: ${countList[1]}.`);
                total += countable[0].length;
            } else fails.push(`Countable "${countable[3]}" is not a string!`);
        }

        // check embed size
        if (total > 6000) fails.push(`Embed is too big! Current size: ${ total }, max size 6000.`)

        // update class properties
        this.length = total;
        this.fails = fails;

        return fails.length === 0;
    }

    errorIfInvalid() {
        return this.isValid() ? this : new this.constructor('Embed failed', this.fails.join('\n')).error();
    }
}

const colors = {
    gerp: 16738816,     // GerpOrange
    error: 16711680     // ErrorRed
}

module.exports = {
    logger,
    Embed,
    colors,
    config,
}
