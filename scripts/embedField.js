class Field {
    constructor(name, value, inline) {
        this.name = name;
        this.value = value;
        if (inline) this.inline = inline;
    }
}

module.exports = Field;
