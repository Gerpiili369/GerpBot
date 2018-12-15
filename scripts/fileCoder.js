module.exports = class ProFileCoder {
    constructor() {
        this.byteArray = [];
        this.dataArray = [];
        this.byteIndex = 0;
        this.types = {
            byte: 1,
            short: 2,
            int: 4,
            long: 8
        }
    }

    fromBuffer(buffer) {
        if (buffer instanceof Buffer)
            this.byteArray = this.hexStringToArray(buffer.toString('hex'));
        return this;
    }

    toBuffer() {
        return new Buffer(this.byteArray.join(''), 'hex');
    }

    addFromBuffer(buffer) {
        if (buffer instanceof Buffer) {
            this.byteArray.push(...this.hexStringToArray(buffer.toString('hex')));
        }
        return this;
    }

    addString(data) {
        if (data) {
            const
                utfArray = this.hexStringToArray(Buffer.from(data, 'utf-8').toString('hex')),
                length = utfArray.length,
                bitData = length.toString(2),
                lebArray = [];

            for (let i = bitData.length; i > 0; i -= 7) lebArray.push(
                parseInt(
                    (i - 7 > 0 ? '1' : '0') + bitData.substring(i - 7, i), 2
                ).toString(16).padStart(2, '0')
            )

            this.byteArray.push('0b', ...lebArray, ...utfArray)
        } else this.byteArray.push('00');
        return this;
    }

    addValue(data, type = 'int') {
        const
            size = this.types[type],
            bitData = Number(data).toString(2),
            byteArray = [];

        for (let i = bitData.length; i > 0; i -= 8) {
            let hexByte = parseInt(bitData.substring(i - 8, i), 2).toString(16)
            if (i - 8 > 0);
            byteArray.push(hexByte.padStart(2, '0'))
        }

        while(byteArray.length < size) byteArray.push('00');

        this.byteArray.push(...byteArray);
        return this;
    }

    decodeString(name = '') {
        switch(this.byteArray[this.byteIndex]) {
            case '00':
                this.byteIndex++
                this.dataArray.push({
                    name,
                    value: '',
                    type: 'string',
                });
                break;
            case '0b':
                this.byteIndex++

                const
                    utfArray = [],
                    lebArray = []
                let length = 0;

                for (let i = this.byteIndex; true; i++) {
                    let group = parseInt(this.byteArray[i], 16).toString(2);
                    if (group.length < 8) {
                        lebArray.push(group.padStart(7, '0'));
                        break;
                    } else lebArray.push(group.substring(1));
                }
                this.byteIndex += lebArray.length;

                length = parseInt(lebArray.reverse().join(''), 2)
                for (let i = this.byteIndex; i < this.byteIndex + length; i++) {
                    utfArray.push(this.byteArray[i])
                }

                this.byteIndex += length;
                this.dataArray.push({
                    name,
                    value: Buffer.from(utfArray.join(''), 'hex').toString('utf8'),
                    type: 'string',
                });
                break;
        }

        return this;
    }

    decodeValue(name = '', type = 'int') {
        const
            size = this.types[type],
            byteArray = [];

        for (let i = this.byteIndex; i < this.byteIndex + size; i++) {
            byteArray.push(this.byteArray[i])
        }

        this.byteIndex += size;
        this.dataArray.push({
            name,
            value: parseInt(byteArray.reverse().join(''), 16).toString(10),
            type,
        });
        return this;
    }

    hexStringToArray(string) {
        const array = [];
        for (let i = string.length; i > 0; i -= 2)
            array.push(string.substring(i - 2, i).padStart(2, '0'));
        return array.reverse();
    }
}
