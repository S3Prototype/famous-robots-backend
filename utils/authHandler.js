const jwt = require('jsonwebtoken')
const User = require('../schemas/user')
const { DEFAULT_ACCESS_SECRET } = require('./backupSecrets')

let tokenContainer = []
const authenticateToken = async (req, res, next)=>{
    res.set({'Content-Type':'application/json'})

    req.validated = false

    if(req.body && req.body.password)    
        return next()

    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]   

    if(!token && (!req.body || !req.body.email)){
        console.log("Token was not found, and no email provided.")
        return res.status(401).json({
            message: "Account credentials unverifiable. Please log in again."
        })
    }
    
    jwt.verify(token, process.env.ACCESS_SECRET || DEFAULT_ACCESS_SECRET, (err, user)=>{
        if(!err){
            const foundToken = tokenContainer.find(item=>item.accessToken === token)
            if(foundToken){
                req.validated = true
                req.token = foundToken
                return next()
            }
        }
        console.log('Error, access token expired.', err)
        return res.status(401).json({
            message: "Access token expired. Send refresh token or log in with password."
        })
    })
}

module.exports = {
    authenticateToken,
    tokenContainer
}