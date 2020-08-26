'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Image extends Model {
    static get table () {
        return 'image';
    }
}

module.exports = Image
