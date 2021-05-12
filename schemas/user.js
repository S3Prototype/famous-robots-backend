const mongoose = require('mongoose')

const user = new mongoose.Schema({
    username: String,
    password: String,
    seen: Array, //robots the user has seen already
    isAdmin: Boolean,
})

module.exports = mongoose.model('User', user)