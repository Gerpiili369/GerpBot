const Api = require('./common.js').Api;

module.exports = class GitHub extends Api {
    constructor() {
        super('https://api.github.com');
    }

    getReleases(user, repo) {
        return this.apiCall(`/repos/${ user }/${ repo }/releases`, 'releases');
    }
}
