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
        const props = {
            urls2check: [],
            countList: [],
            fails: [],
            total: 0,
        };

        // Check title, desciption, url, color and time.
        checkBasic(this, props);

        // Check footer, thumbnail, image and author.
        checkObjects(this, props);

        // Check field amount and each name value and inline.
        checkFields(this, props);

        // Check that url values are actual urls and make sure strings are not too long.
        checkStrings(props);

        // Check embed size
        if (props.total > 6000) props.fails.push(`Embed is too big! Current size: ${ props.total }, max size 6000.`);

        // Update class properties
        this.length = props.total;
        this.fails = props.fails;

        return props.fails.length === 0;
    }

    errorIfInvalid() {
        return this.isValid() ? this : new this.constructor('Embed failed', this.fails.join('\n')).error();
    }
}

function checkBasic(embed = new Embed(), props = { urls2check: [], countList: [], fails: [] }) {
    // Check title
    if (embed.title) props.countList.push([embed.title, 256, 'title']);

    // Check description
    if (embed.description) props.countList.push([embed.description, 2048, 'description']);

    // Check url
    if (embed.url) props.urls2check.push([embed.url, 'url']);

    // Check color
    if (embed.color && !(typeof embed.color === 'string' || typeof embed.color === 'number')) props.fails.push('Color must be a string or a number!');

    // Check time
    if (embed.time && !(embed.time instanceof Date)) props.fails.push('Time must be a Date!');

    return props;
}

function checkObjects(embed = new Embed(), props = { urls2check: [], countList: [], fails: [] }) {
    // Check footer
    if (embed.footer) {
        if (embed.footer instanceof Object) {
            if (embed.footer.icon_url) props.urls2check.push([embed.footer.icon_url, 'footer icon url']);
            if (embed.footer.text) props.countList.push([embed.footer.text, 2048, 'footer text']);
        } else props.fails.push('Footer must be an object!');
    }

    // Check thumbnail
    if (embed.thumbnail) {
        if (embed.thumbnail instanceof Object) {
            if (embed.thumbnail.url) props.urls2check.push([embed.thumbnail.url, 'thumbnail url']);
        } else props.fails.push('Thumbnail must be an object!');
    }

    // Check image
    if (embed.image) {
        if (embed.image instanceof Object) {
            if (embed.image.url) props.urls2check.push([embed.image.url, 'image url']);
        } else props.fails.push('Image must be an object!');
    }

    // Check author
    if (embed.author) {
        if (embed.author instanceof Object) {
            if (embed.author.name) props.countList.push([embed.author.name, 256, 'author name']);
            if (embed.author.icon_url) props.urls2check.push([embed.author.icon_url, 'author icon url']);
            if (embed.author.url) props.urls2check.push([embed.author.url, 'author url']);
        } else props.fails.push('Author must be an object!');
    }

    return props;
}

function checkFields(embed = new Embed(), props = { countList: [], fails: [] }) {
    // Check field amount
    if (embed.fields.length > 25) embed.fieldSplit();

    // Check field name, value and inline
    for (const field of embed.fields) {
        const fn = embed.fields.indexOf(field) + 1;

        if (field.name === '') props.fails.push(`Field #${ fn } name cannot be empty string!`);
        if (field.value === '') props.fails.push(`Field #${ fn } value cannot be empty string!`);

        if (field.inline && (typeof field.inline !== 'boolean')) props.fails.push(`Field #${ fn } inline is not a boolean!`);

        props.countList.push(
            [field.name, 256, `field #${ fn } name`],
            [field.value, 1024, `field #${ fn } value`]
        );
    }

    return props;
}

function checkStrings(props = { urls2check: [], countList: [], fails: [], total: 0 }) {
    // Check url strings
    for (const url of props.urls2check) {
        if (typeof url[0] === 'string') {
            if (!isUrl(url[0])) props.fails.push(`URL "${ url[1] }" is not a string!`);
        } else props.fails.push(`URL "${ url[1] }" is not a string!`);
    }

    // Check normal (countable) strings
    for (const countable of props.countList) {
        if (typeof countable[0] === 'string') {
            if (countable[0].length > countable[1]) props.fails.push(`Countable "${ countable[3] }" is too long! Length: ${ countable[0].length }, max length: ${ props.countList[1] }.`);
            props.total += countable[0].length;
        } else props.fails.push(`Countable "${ countable[3] }" is not a string!`);
    }

    return props;
}

module.exports = Embed;
