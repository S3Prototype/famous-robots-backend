const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('./schemas/user')
const Robot = require('./schemas/robot')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const randomString = require('random-string')
const cloudinary = require('cloudinary').v2
const ObjectID = require('mongodb').ObjectID;
const validator = require('node-email-validation')

const REFRESH_SECRET = 'littlesecret000'
const ACCESS_SECRET = 'bigsecret100'

const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, './robotImages/')
    },
    filename: function(req, file, cb){
        cb(null, file.originalname)
    }  
})

const fileFilter = (req, file, cb)=>{
    if(!req.validated || !req.isAdmin){
        return cb(null, false) 
    }
    switch(file.mimetype){
        case 'image/jpeg':
        case 'image/gif':
        case 'image/png':
            cb(null, true)
        break;            
        default:
            cb(null, false)        
    }
}

const upload = multer({
    storage,
    limits: {fileSize: 1024*1024*5},//5mb
    fileFilter
})

// const store = new session.MemoryStore()

// console.log(process.env.NODE_ENV)

mongoose.connect(
    `mongodb+srv://RoomMaster297:30t^FQdBmHGn@cluster0.rqrfn.mongodb.net/famousrobots?retryWrites=true&w=majority`,
    {
        useNewUrlParser:true,
        useUnifiedTopology:true
    },
    (err)=>{
        if(!err)
            console.log(`mongoose is connected`)
        else
            console.log("Mongoose connection failed", err)
    }
)

app.use(cors())
app.use('/robots/images', express.static('robotImages'))
app.use(express.json())
app.use(express.urlencoded({extended:true}))

const generateID = ()=>{
    return randomString({length:17})+new Date().getMilliseconds()
}

const authenticateToken = (req, res, next)=>{
    // Redo all this. Just check and validate the token.
    // If the token is validated, set a req.validated = true.
    // Otherwise, req.validated = false.

    req.validated = false
    req.isAdmin = false

    const authHeader = req.headers['authorization']
    const addRobot =  req.headers['addrobot']
    const email = req.headers['email']
    console.log("The body is", req.body)

        //Get the token by splitting auth into an array and taking 2nd item
    const token = authHeader && authHeader.split(' ')[1]    
    if(!token){
        console.log("Token wasn't found while trying to authenticate.")
        next()
    } else {
            //Might have to promisify this, because need to call next()
            //when it's done.
            console.log("Verifying token now.")
        jwt.verify(token, ACCESS_SECRET, (err, user)=>{
            if(err){
                console.log('Error trying to verify an access token. JWT may be broken.')
                return next()                
            } else {                
                const foundToken = tokenContainer.find(item=>item.accessToken === token)
                console.log("Token verified. Now searching for it.")
                if(foundToken){
                    console.log("Found the token.", foundToken)
                    if(addRobot){
                        console.log("It was an addrobot request")
                        User.findOne({email},
                            async (err, userData)=>{
                                if(err){
                                    console.log("Error trying to find admin in database for adding robots", err)
                                    return res.status(502).json({success: false, message: `Failed to login ${req.body.email}. Possible database rror. Please try again.`})            
                                }

                                if(userData && userData.isAdmin){
                                    req.validated = true
                                    req.isAdmin = true
                                    req.token = foundToken
                                    console.log("User was an admin.")
                                    return next()
                                }

                                console.log("Neither error nor admin")

                                return res.status(401).json({success: false, message: `Please log in as an admin to add robots.`})
                            }    
                        )                        
                    } else {
                        console.log("It wasn't an addrobotrequest")
                        req.validated = true
                        req.token = foundToken
                        next()
                    }
                }
    
                if(!foundToken){
                    console.log("Could not find the token. Asking user to send refresh token.")
                    return res.status(401).json({success: false, message: "Access token expired. Send refresh token or log in with password."})
                }
            }
        })
    }

}

app.post('/api/addrobot', authenticateToken, upload.single("robotImage"), (req, res, next)=>{
    // Have to check if they even sent an image. If not, return with error.
    if(!req.isAdmin || !req.validated)
        return res.status(401).json({message: `Please log in as an admin to add a robot.`})

    if(!req.file || !req.file.path)
        return res.status(400).json({message: `Please add an image for your robot.`})
    
    Robot.findOne({name:req.body.name},
        async (err, robotData)=>{
            if(err)
                return res.status(502).json({message: `Possible database error. Your robot was not saved. Please try again. ${err}`})

                //If this robot already exists, can't add it.
            if(robotData)
                return res.status(400).json({message: `Could not create robot. "${req.body.name}" already exists!`})
            
            const newRobotData = {
                name: req.body.name,
                image: `http://localhost:3100/robots/images/${req.file.originalname}`,
                _id: new ObjectID(),
                votes: 0,
            }
            const newRobot = new Robot(newRobotData)
            newRobot.isNew = true
            try{
                if(await newRobot.save())
                    return res.status(201).json({
                        success: true,
                        message: `${newRobotData.name} successfully created.`,
                        newRobotData,
                    })
                else throw new Error(`Failed to save robot ${name} to database. Possible MongoDB error.`)
            } catch(err){
                console.log(err)
                return res.status(500).json({message: `Could not create ${name}. Server error. ${err}`})
            }
        }
    )
})

let tokenContainer = []
    //This is sent after the original authentication attempt fails.
app.post('/token', (req, res)=>{
    const refreshToken = req.body.token

    if(!refreshToken)
        return res.sendStatus(401)

    if(!tokenContainer.includes(accessToken))
        return res.sendStatus(403)

    jwt.verify(refreshToken, process.env.REFRESH_SECRET, (err, user)=>{
        if(err) return res.sendStatus(403)

        const accessToken = jwt.sign({name:req.body.email},  process.env.ACCESS_SECRET, {expiresIn: '30s'})

        res.json({accessToken})
    })
})

app.post('/users/login', authenticateToken, (req, res, next)=>{

    res.set({'Content-Type': 'application/json'})

    if(!req.body.email)
        if(!req.body.email === 'Admin' || !validator.is_email_valid(req.body.email)){
            console.log("We got in !req.body.email")
            return res.status(400).json({success: false, message: 'Failed to log in. Please provide a valid email.'})
        }

    if(!req.token && !req.body.password){
        return res.status(400).json({success: false, message: 'Please provide a password to log in.'})
    }

    User.findOne({email:req.body.email},
        async (err, userData)=>{
            if(err){
                console.log("Found an error looking in database", err)
                return res.status(502).json({success: false, message: `Failed to login ${req.body.email}. Possible database rror. Please try again.`})            
            }

            if(userData){    
                const {email, password, isAdmin, seen, name} = userData
                console.log("Found user", userData)

                const sendData = {
                    name,
                    email,
                    isAdmin,
                    seen,
                    loggedIn: true,
                }

                if(req.validated){
                    console.log("We entered req.validated")
                    return res.status(200).json({
                        userData: sendData,
                        message: `Successfully logged in ${email}`,
                        success: true,
                    })
                }
                
                if(req.body.password){
                    console.log("We entered req.body.password")
                    try{
                        if(!isAdmin){
                            const passwordIsCorrect = await bcrypt.compare(req.body.password, password)
                            
                            if(!passwordIsCorrect){
                                console.log("Incorrect password")
                                return res.status(401).json({success: false, message: 'Incorrect email or password.'})
                            }
                        }

                        console.log("Got past await bcrypt")

                        sendData.accessToken = jwt.sign({email}, ACCESS_SECRET, {expiresIn: '12h'})

                        sendData.refreshToken = jwt.sign({email}, REFRESH_SECRET)

                        console.log('JWT generated:', sendData.accessToken)
                        tokenContainer.push({
                            accessToken: sendData.accessToken, 
                            name: email
                        })
                    } catch (err) {
                        return res.status(502).json({success: false, message: `Authorization error. Your email and password may be correct, but we could not validate you at this time. ${err}`})
                    }  
                    
                    return res.status(200).json({
                        userData: sendData,
                        message: `Successfully logged in ${email} and generated auth tokens.`,
                        success: true,
                    }) 
                }

            } else {                
                return res.status(401).json({success: false, message: `Failed to login. email or password incorrect.`})
            }
        }
    )
})

app.post('/users/register', async (req, res)=>{
    
    if(!req.body.email || !validator.is_email_valid(req.body.email) || !req.body.password)
        return res.status(400).send({info: 'Failed to register. Please provide an email and password.'})

    User.findOne({email:req.body.email},
        async (err, userData)=>{
            if(err){
                console.log("Found an error trying to register user in database", err)
                return res.status(502).json({success: false, message: `Failed to register ${req.body.email}. Possible database rror. Please try again.`})          
            }
            if(!userData){
                const newUserData = {
                    name: req.body.name,
                    _id: new ObjectID(),
                    email: req.body.email,
                    isAdmin: false,
                }
                try{

                    newUserData.password = await bcrypt.hash(req.body.password, 10)
                    const newUser = new User(newUserData)
                    newUser.isNew = true
                    await newUser.save()
                        //From here user should be redirected to login page
                    return res.status(200).json({
                        _id: newUserData._id,
                        message: `User ${newUserData.email} created`,
                        email: newUserData.email
                    })
                } catch(err){
                    console.log("Failed to save user", err)
                    return res.status(502).json({success: false, message: `Failed to create ${newUserData.email}.`})
                }                
            } else {
                return res.status(400).json({success: false, message: `User ${req.body.email} already exists`})
            }                        
        }
    )
})

app.post('/users/logout', async (req, res)=>{
    try{
        tokenContainer = tokenContainer.filter(token=>token.accessToken !== req.body.accessToken && token.email !== req.body.email)
    } catch(err){
        return res.send({info: `Failed to logout user ${req.body.email}, ${err}`})
    }

    return res.send({info: `Successfully logged out ${req.body.email}`})
})

app.get('/users/:email/', authenticateToken, (req, res)=>{
})

app.get('/', function (req, res) {
    res.send(`Famous Robots Backend`)
}) 

var port = process.env.PORT || '3100';
app.listen(port, ()=>{console.log("Listening on port:", port)})