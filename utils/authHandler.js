const jwt = require('jsonwebtoken')
const User = require('../schemas/user')
const { DEFAULT_ACCESS_SECRET } = require('./backupSecrets')

let tokenContainer = []
const authenticateToken = async (req, res, next)=>{
    console.log("Request:", req.body)
    // Redo all this. Just check and validate the token.
    // If the token is validated, set a req.validated = true.
    // Otherwise, req.validated = false.
    res.set({'Content-Type':'application/json'})

    if(!req.body.email)
        return res.status(400).json({message:'Email address not valid.'})

    req.validated = false

    if(req.body.password)    
        return next()

    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]   
     
    if(!token){
        console.log("Token was not found")
        return res.status(401).json({
            message: "No access token received. Send refresh token or log in with password."
        })
    }
    else
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