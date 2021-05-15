const jwt = require('jsonwebtoken')
const { DEFAULT_ACCESS_SECRET } = require('./backupSecrets')


let tokenContainer = []
const authenticateToken = (req, res, next)=>{
    // Redo all this. Just check and validate the token.
    // If the token is validated, set a req.validated = true.
    // Otherwise, req.validated = false.
    res.set({'Content-Type':'application/json'})

    req.validated = false
    req.isAdmin = false

    const authHeader = req.headers['authorization']

        //Get the token by splitting auth into an array and taking 2nd item
    const token = authHeader && authHeader.split(' ')[1]    
    if(!token)
        return res.status(401).json({
            message: "No access token received. Send refresh token or log in with password."
        }) 

        //Might have to promisify this, because need to call next()
        //when it's done.
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

}

module.exports = {
    authenticateToken,
    tokenContainer
}