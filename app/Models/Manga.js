'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Manga extends Model {
    static get table () {
        return 'manga';
    }
}

module.exports = Manga
