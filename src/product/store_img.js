import dataStore from 'nedb-promise';

export class ImagesStore {
    constructor({filename, autoload}) {
        this.store = dataStore({filename, autoload});
    }

    async findAll() {
        return this.store.find();
    }

    async find(props) {
        return this.store.find(props);
    }

    async findOne(props) {
        return this.store.findOne(props);
    }

    async insert(product) {
        let productDescription = product.description;
        if (!productDescription)
            throw new Error('Missing description property');
        return this.store.insert(product);
    }

    async update(props, product) {
        return this.store.update(props, product);
    }

    async remove(props) {
        return this.store.remove(props);
    }
}

export default new ImagesStore({filename: './db/dataset', autoload: true});