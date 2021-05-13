const mongoose = require('mongoose')

const user = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    votedForIDs: Array, //robots the user has seen already
    isAdmin: Boolean,
})

module.exports = mongoose.model('User', user)