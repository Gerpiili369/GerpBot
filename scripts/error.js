class CustomError extends Error {
    constructor(opts = {}) {
        super(opts.message);
        this.name = opts.name;
        this.code = opts.code;
    }
}

module.exports = CustomError;
