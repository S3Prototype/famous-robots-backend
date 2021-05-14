    //Don't miss those parens at the end. This require is also a function call
const DEFAULT_ACCESS_SECRET = require('random-string')()
const DEFAULT_REFRESH_SECRET = require('random-string')()

module.exports = {
    DEFAULT_ACCESS_SECRET,
    DEFAULT_REFRESH_SECRET,
}