const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('./schemas/user')
const Robots = require('./schemas/robot')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const cloudinary = require('cloudinary').v2

const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, './robotImages/')
    },
    filename: function(req, file, cb){
        cb(null, file.originalname)
    }  
})

const fileFilter = (req, file, cb)=>{
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

console.log(process.env.NODE_ENV)

mongoose.connect(
    `mongodb+srv://RoomMaster297:21bOqE5aX7Du@cluster0.rqrfn.mongodb.net/FamousRobots?retryWrites=true&w=majority`,
    {
        useNewUrlParser:true,
        useUnifiedTopology:true
    },
    ()=>{
        console.log(`mongoose is connected`)
    })

app.use('/robots/images', express.static('robotImages'))
app.use(express.json())
app.use(express.urlencoded({extended:true}))
// app.use(cors())


const authenticateToken = (req, res, next)=>{
    const authHeader = req.headers['authorization']

    const token = authHeader && authHeader.split(' ')[1]
    if(!token) return res.status(401).send({info: "Log in to load up your API tokens."})

    jwt.verify(token, process.env.ACCESS_SECRET, (err, user)=>{
        if(err) return res.status(403).send({info: "Error loading your API tokens. Please log in."})

        const foundToken = tokenContainer.find(item=>item.accessToken === token)

        if(foundToken){
            req.user = foundToken.user
            next()
        } else {
            res.status(403).send({info: "User not authenticated. Please log in."})
        }
    })
}

app.post('/api/addrobot', upload.single('robotImage'), (req, res, next)=>{
    // Have to check if they even sent an image. If not, return with error.
    if(!req.file.path)
        return res.status(400).json({message: `Please add an image for your robot.`})
    
    // cloudinary.uploader.upload(req.file.path, (error, result)=>{
    //     if(result){
            Robots.findOne({name:req.body.name},
                async (err, robotData)=>{
                    if(err)
                        return res.status(500).json({message: `Server error. Your robot was not saved. Please try again. ${err}`})
                        //If we find a robot that matches, can't add this robot.
                        //It already exists.
                    if(robotData)
                        return res.status(400).json({message: `Could not create robot. "${req.body.robot.name}" already exists!`})
                    
                    const {name} = req.body   
                    const image = `http://localhost:3100/robots/images/${req.file.originalname}`
                    const id = Math.floor(Math.random()*1000000) 
                    const newRobot = new Robot({name, image, id, votes:0})
                    newRobot.isNew = true
                    try{
                        await newRobot.save()                
                        return res.send(200).json({
                            success: true,
                            message: `${name} successfully created.`,
                            robot: {
                                name,
                                image,
                                id,
                                votes: 0
                            }
                        })
                    } catch(err){
                        return res.send(500).json({message: `Could not create ${name}. Server error. ${err}`})
                    }
                }
            )
            // res.status(200).json({success: true}) // all done, send data back to client
    //     } //Cloudinary stuff
    // })

    // res.json({info: "Well done"})
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

        const accessToken = jwt.sign({name:req.body.username},  process.env.ACCESS_SECRET, {expiresIn: '30s'})

        res.json({accessToken})
    })
})

app.post('/users/login', (req, res)=>{

    if(!req.body.username)
        return res.send({info: 'Failed to log in. Please provide a username.'})

    User.findOne({username:req.body.username},
        async (err, userData)=>{
            if(err){
                console.log(err)
                return res.status(500).send({info: `Failed to login ${req.body.username}. Possible server error.`})
            }

            if(userData){     
                const {username, password, isAdmin} = userData
                console.log("Found user", userData)
                
                if(!await bcrypt.compare(req.body.password, password))
                    return res.send({info: "Incorrect username or password."})

                const accessToken = jwt.sign({username}, process.env.ACCESS_SECRET, {expiresIn: '12h'})
                const refreshToken = jwt.sign(username, process.env.REFRESH_SECRET)
                console.log("JWT name:", username)
                tokenContainer.push({
                    accessToken, 
                    name: username
                })
                
                return res.status(200).send({
                    username,
                    isAdmin,
                    accessToken,
                    refreshToken,
                    loggedIn: true,
                    info: `Successfully logged in ${username}`,
                    success: true,
                })
            }
            return res.status(400).send({info: `Failed to login. User ${req.body.username} not found.`})
        }
    )
})

app.post('/users/register', async (req, res)=>{
    
    if(!req.body.username || !req.body.password)
        return res.send({info: 'Failed to log in. Please provide a username and password.'})

    User.findOne({username:req.body.username},
        async (err, userData)=>{
            if(err) throw err
            if(!userData){
                const hashedPassword = await bcrypt.hash(req.body.password, 10)
                try{
                    const newData = {
                        username: req.body.username,
                        password: hashedPassword,
                    }

                    const newUser = new User(newData)
                    newUser.isNew = true
                    await newUser.save()
                    res.send({
                        info: `User ${newData.username} created`,
                        name:newDate.username
                    })
                } catch(err){
                    console.log("Failed to save user", err)
                    res.send({info: `Failed to create ${newData.username}.`})
                }                
            } else {
                res.send({info: `User ${req.body.username} already exists`})
            }                        
        }
    )
})

app.post('/users/logout', async (req, res)=>{
    try{
        tokenContainer = tokenContainer.filter(token=>token.accessToken !== req.body.accessToken && token.username !== req.body.username)
    } catch(err){
        return res.send({info: `Failed to logout user ${req.body.username}, ${err}`})
    }

    return res.send({info: `Successfully logged out ${req.body.username}`})
})

app.get('/users/:username/', authenticateToken, (req, res)=>{
})

app.get('/', function (req, res) {
    res.send(`Famous Robots Backend`)
}) 

var port = process.env.PORT || '3100';
app.listen(port, ()=>{console.log("Listening on port:", port)})