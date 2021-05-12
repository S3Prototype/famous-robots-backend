const mongoose = require('mongoose')

const robot = new mongoose.Schema({
    id: Number,
    name: String,
    image: String,
    votes: Number,
})

module.exports = mongoose.model('Robot', robot)