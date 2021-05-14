const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const { DEFAULT_ACCESS_SECRET, DEFAULT_REFRESH_SECRET } = require('../utils/backupSecrets')
const {tokenContainer} = require('../utils/authHandler')

//This is sent after the original authentication attempt fails.
router.post('/', (req, res)=>{
    const refreshToken = req.body.token

    if(!refreshToken)
        return res.sendStatus(401)

    if(!tokenContainer.includes(accessToken))
        return res.sendStatus(403)

    jwt.verify(refreshToken, process.env.REFRESH_SECRET || DEFAULT_REFRESH_SECRET, (err, user)=>{
        if(err) return res.sendStatus(403)

        const accessToken = jwt.sign({name:req.body.email}, process.env.ACCESS_SECRET || DEFAULT_ACCESS_SECRET, {expiresIn: '12h'})

        res.json({accessToken})
    })
})

module.exports = router