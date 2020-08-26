'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Chapter extends Model {
    static get table () {
        return 'chapter';
    }
}

module.exports = Chapter
