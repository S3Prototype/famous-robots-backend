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
    const addRobot =  req.headers['addrobot']
    const emailHeader = req.headers['email']

        //Get the token by splitting auth into an array and taking 2nd item
    const token = authHeader && authHeader.split(' ')[1]    
    if(!token){
        next()
    } else {
            //Might have to promisify this, because need to call next()
            //when it's done.
        jwt.verify(token, process.env.ACCESS_SECRET || DEFAULT_ACCESS_SECRET, (err, user)=>{
            if(err){
                return next()                
            } else {                
                const foundToken = tokenContainer.find(item=>item.accessToken === token)
                if(foundToken){
                    if(addRobot){
                        User.findOne({email: emailHeader},
                            async (err, userData)=>{
                                if(err){
                                    return res.status(502).json({success: false, message: `Failed to login ${req.body.email}. Possible database rror. Please try again.`})            
                                }

                                if(userData && userData.isAdmin){
                                    req.validated = true
                                    req.isAdmin = true
                                    req.token = foundToken
                                    return next()
                                }

                                return res.status(401).json({success: false, message: `Please log in as an admin to add robots.`})
                            }    
                        )                        
                    } else {
                        req.validated = true
                        req.token = foundToken
                        next()
                    }
                }
    
                if(!foundToken){
                    return res.status(401).json({success: false, message: "Access token expired. Send refresh token or log in with password."})
                }
            }
        })
    }

}

module.exports = {
    authenticateToken,
    tokenContainer
}