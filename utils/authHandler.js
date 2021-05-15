const jwt = require('jsonwebtoken')
const User = require('../schemas/user')
const { DEFAULT_ACCESS_SECRET } = require('./backupSecrets')

let tokenContainer = []
const authenticateToken = async (req, res, next)=>{
    // Redo all this. Just check and validate the token.
    // If the token is validated, set a req.validated = true.
    // Otherwise, req.validated = false.
    res.set({'Content-Type':'application/json'})

    if(!req.body.email)
        return res.status(400).json({message:'Email address not valid.'})

    req.isAdmin = false
    req.validated = false

    if(req.body.email === 'Admin'){
        const adminQuery = await User.findOne({email:'Admin', password:req.body.password})
            //If adminQuery has email prop, query was successful
        req.isAdmin = adminQuery.email ? true : false
    }

    const authHeader = req.headers['authorization']

        //Get the token by splitting auth into an array and taking 2nd item
    const token = authHeader && authHeader.split(' ')[1]    
    if(!token)
        return res.status(401).json({
            message: "No access token received. Send refresh token or log in with password."
        })

    if(!req.body.password)
        jwt.verify(token, process.env.ACCESS_SECRET || DEFAULT_ACCESS_SECRET, (err, user)=>{
            if(!err){
                const foundToken = tokenContainer.find(item=>item.accessToken === token)
                if(foundToken){
                    req.validated = true
                    req.token = foundToken
                    return next()
                }
            }

            return res.status(401).json({
                message: "Access token expired. Send refresh token or log in with password."
            })
        })
    else return next()
}

module.exports = {
    authenticateToken,
    tokenContainer
}