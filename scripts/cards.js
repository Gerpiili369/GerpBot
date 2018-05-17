module.exports = class Cards {
    /**
     * @arg {Number[]|String[]} [values]
     * @arg {Number} [amount]
     * @arg {Object} [suits]
     */
    constructor(values = [], amount = 1, suits = {default: "#ffffff"}) {
        this.suits = suits;
        this.values = values;

        /** @type {Card[]} */
        this.deck = [];

        /** @type {Card[]} */
        this.discarded = [];

        /** @type {{name: Card[]}} */
        this.hands = {};

        for (const suit in suits) for (let i = 0; i < amount; i++) {
            values.forEach(v => this.deck.push({
                suit: suit,
                value: v,
                color: suits[suit]
            }));
        }
    }

    /**
     * @arg {Card} list
     */
    shuffle(list = this.deck) {
        for (let i = 0; i < list.length * 10; i++) {
            let
                card1 = Math.floor(Math.random() * list.length),
                card2 = Math.floor(Math.random() * list.length),
                mem = list[card1];

            list[card1] = list[card2];
            list[card2] = mem;
        }
    }

    /**
     * @arg {Card} card
     * @arg {Number} [amount]
     */
    drawToHand(hand, amount = 1) {
        if (!this.hands[hand]) this.hands[hand] = [];
        for (let i = 0; i < amount; i++) this.hands[hand].push(this.deck.pop());
    }

    /**
     * @arg {Card} card
     */
    discard(card) {
        this.discarded.push(card);
    }

    resuffle() {
        this.shuffle(this.discarded);
        this.deck = this.discarded.concat(this.deck);
        this.discarded = [];
    }

    /**
     * @arg {Card[]} list
     * @returns {Card[]}
     */
    sort(list) {
        if (Array.isArray(list)) {
            let suits = {}, sortedList = [];

            for (let i = 0; i < list.length; i++) suits[list[i].suit] = list[i].color;
            for (const suit in suits) {
                let numberList = [], stringList = []

                for (let i = 0; i < list.length; i++) if (list[i].suit == suit) {
                    if (typeof list[i].value == 'number') numberList.push(list[i]);
                    if (typeof list[i].value == 'string') stringList.push(list[i]);
                }

                numberList.sort((a, b) => a.value - b.value);
                stringList.sort((a, b) => a.value < b.value ? -1 : a.value > b.value ? 1 : 0);

                sortedList = sortedList.concat(numberList, stringList);
            }
            return sortedList;
        } else return list;
    }
}

/**
 * @typedef {Object} Card
 * @property {String} suit
 * @property {String|Number} value
 * @property {String} color
 */
