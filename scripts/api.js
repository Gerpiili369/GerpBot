const
    fetch = require('node-fetch'),
    CustomError = require('./error');

class Api {
    constructor(endpoint, key) {
        this.endpoint = endpoint;
        this.key = key;
    }

    apiCall(url, name) {
        return new Promise((resolve, reject) => {
            fetch(this.endpoint + url)
                .then(res => res.json().catch(() => reject(new CustomError({
                    name: `Failed to get ${ name || 'data' }`,
                    message: 'Response is not JSON!'
                }))))
                .then(data => {
                    if (data.error) reject(data.error);
                    return data;
                })
                .then(resolve)
                .catch(reject);
        });
    }
}

module.exports = Api;
