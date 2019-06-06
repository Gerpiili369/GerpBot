const
    isUrl = require('is-url'),
    colors = require('./common').colors,
    Field = require('./embedField');

class Embed {
    constructor(title, description = '', opts = {}) {
        const params = {
            title,
            description,
            opts,
        };

        if (title instanceof Object) {
            params.opts = title;
            params.title = title.title;
            params.description = title.description;
        }

        if (description instanceof Object) {
            params.opts = description;
            params.description = description.description;
        }

        this.title = params.title || '';
        this.description = params.description || '';
        this.url = params.opts.url || '';
        if (params.opts.color) this.color = params.opts.color;
        if (params.opts.timestamp) this.timestamp = params.opts.timestamp instanceof Date ? params.opts.timestamp : new Date(params.opts.timestamp);
        this.footer = params.opts.footer || { icon_url: '', text: '' };
        this.thumbnail = params.opts.thumbnail || { url: '' };
        this.image = params.opts.image || { url: '' };
        this.author = params.opts.author || { name: '', url: '', icon_url: '' };
        this.fields = [];
        this.Field = Field;
        this.multiEmbed = [];

        if (params.opts.fields instanceof Array) for (const field of params.opts.fields) this.addField(field.name, field.value, field.inline);
    }

    addField(name, value, inline) {
        if (name && value) this.fields.push(new this.Field(name, value, inline));
        return this;
    }

    addDesc(str = '') {
        this.description += str;
    }

    error(err, stack = false) {
        // Error: name, message, stack, code
        if (err) {
            if (err.name) this.author.name = err.name;
            if (err.message) this.title = err.message;
            if (err.stack && stack) this.description = err.stack;
            if (err.code) this.footer.text = err.code;
        }

        this.color = colors.error;

        return this;
    }

    fieldSplit() {
        const tempFields = [...this.fields];

        this.multiEmbed = [];

        while (tempFields.length > 0) this.multiEmbed.push(new this.constructor({
            color: this.color,
            fields: tempFields.splice(0, 25)
        }));

        const lastIndex = this.multiEmbed.length - 1;

        // First embed
        this.multiEmbed[0].title = this.title;
        this.multiEmbed[0].description = this.description;
        this.multiEmbed[0].url = this.url;
        this.multiEmbed[0].thumbnail = this.thumbnail;
        this.multiEmbed[0].author = this.author;

        // Last embed
        if (this.timestamp) this.multiEmbed[lastIndex].timestamp = this.timestamp;
        this.multiEmbed[lastIndex].footer = this.footer;
        this.multiEmbed[lastIndex].image = this.image;

        return this.multiEmbed;
    }

    pushToIfMulti(targetArray) {
        let item = null;
        if (this.multiEmbed.length > 0) {
            item = this.multiEmbed.splice(0, 1)[0];
            for (const embed of this.multiEmbed) {
                targetArray.push(embed.errorIfInvalid());
            }
        } else return this;
        return item;
    }

    isValid() {
        const
            urls2check = [],
            countList = [],
            fails = [];
        let total = 0;

        // Check title
        if (this.title) countList.push([this.title, 256, 'title']);

        // Check description
        if (this.description) countList.push([this.description, 2048, 'description']);

        // Check url
        if (this.url) urls2check.push([this.url, 'url']);

        // Check color
        if (this.color && !(typeof this.color === 'string' || typeof this.color === 'number')) fails.push('Color must be a string or a number!');

        // Check time
        if (this.time && !(this.time instanceof Date)) fails.push('Time must be a Date!');

        // Check footer
        if (this.footer) {
            if (this.footer instanceof Object) {
                if (this.footer.icon_url) urls2check.push([this.footer.icon_url, 'footer icon url']);
                if (this.footer.text) countList.push([this.footer.text, 2048, 'footer text']);
            } else fails.push('Footer must be an object!');
        }

        // Check thumbnail
        if (this.thumbnail) {
            if (this.thumbnail instanceof Object) {
                if (this.thumbnail.url) urls2check.push([this.thumbnail.url, 'thumbnail url']);
            } else fails.push('Thumbnail must be an object!');
        }

        // Check image
        if (this.image) {
            if (this.image instanceof Object) {
                if (this.image.url) urls2check.push([this.image.url, 'image url']);
            } else fails.push('Image must be an object!');
        }

        // Check author
        if (this.author) {
            if (this.author instanceof Object) {
                if (this.author.name) countList.push([this.author.name, 256, 'author name']);
                if (this.author.icon_url) urls2check.push([this.author.icon_url, 'author icon url']);
                if (this.author.url) urls2check.push([this.author.url, 'author url']);
            } else fails.push('Author must be an object!');
        }

        // Check field amount
        if (this.fields.length > 25) this.fieldSplit();

        // Check field name, value and inline
        for (const field of this.fields) {
            const fn = this.fields.indexOf(field) + 1;

            if (field.name === '') fails.push(`Field #${ fn } name cannot be empty string!`);
            if (field.value === '') fails.push(`Field #${ fn } value cannot be empty string!`);

            if (field.inline && (typeof field.inline !== 'boolean')) fails.push(`Field #${ fn } inline is not a boolean!`);

            countList.push(
                [field.name, 256, `field #${ fn } name`],
                [field.value, 1024, `field #${ fn } value`]
            );
        }

        // Check url strings
        for (const url of urls2check) {
            if (typeof url[0] === 'string') {
                if (!isUrl(url[0])) fails.push(`URL "${ url[1] }" is not a string!`);
            } else fails.push(`URL "${ url[1] }" is not a string!`);
        }

        // Check normal (countable) strings
        for (const countable of countList) {
            if (typeof countable[0] === 'string') {
                if (countable[0].length > countable[1]) fails.push(`Countable "${ countable[3] }" is too long! Length: ${ countable[0].length }, max length: ${ countList[1] }.`);
                total += countable[0].length;
            } else fails.push(`Countable "${ countable[3] }" is not a string!`);
        }

        // Check embed size
        if (total > 6000) fails.push(`Embed is too big! Current size: ${ total }, max size 6000.`);

        // Update class properties
        this.length = total;
        this.fails = fails;

        return fails.length === 0;
    }

    errorIfInvalid() {
        return this.isValid() ? this : new this.constructor('Embed failed', this.fails.join('\n')).error();
    }
}

module.exports = Embed;
