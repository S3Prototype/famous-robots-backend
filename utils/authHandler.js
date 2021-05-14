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
    // ("The body is", req.body)

        //Get the token by splitting auth into an array and taking 2nd item
    const token = authHeader && authHeader.split(' ')[1]    
    if(!token){
        ("Token wasn't found while trying to authenticate.")
        next()
    } else {
            //Might have to promisify this, because need to call next()
            //when it's done.
            ("Verifying token now.")
        jwt.verify(token, process.env.ACCESS_SECRET || DEFAULT_ACCESS_SECRET, (err, user)=>{
            if(err){
                ('Error trying to verify an access token. JWT may be broken.')
                return next()                
            } else {                
                const foundToken = tokenContainer.find(item=>item.accessToken === token)
                ("Token verified. Now searching for it.")
                if(foundToken){
                    ("Found the token.", foundToken)
                    if(addRobot){
                        ("It was an addrobot request")
                        User.findOne({email: emailHeader},
                            async (err, userData)=>{
                                if(err){
                                    ("Error trying to find admin in database for adding robots", err)
                                    return res.status(502).json({success: false, message: `Failed to login ${req.body.email}. Possible database rror. Please try again.`})            
                                }

                                if(userData && userData.isAdmin){
                                    req.validated = true
                                    req.isAdmin = true
                                    req.token = foundToken
                                    ("User was an admin.")
                                    return next()
                                }

                                ("Neither error nor admin")

                                return res.status(401).json({success: false, message: `Please log in as an admin to add robots.`})
                            }    
                        )                        
                    } else {
                        ("It wasn't an addrobotrequest")
                        req.validated = true
                        req.token = foundToken
                        next()
                    }
                }
    
                if(!foundToken){
                    ("Could not find the token. Asking user to send refresh token.")
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