const express = require('express')
const router = express.Router()
const ObjectID = require('mongodb').ObjectID;
const validator = require('node-email-validation')
const bcrypt = require('bcryptjs')
const User = require('../schemas/user')
const Robot = require('../schemas/robot')
const jwt = require('jsonwebtoken')
const {authenticateToken, tokenContainer} = require('../utils/authHandler')
const { DEFAULT_ACCESS_SECRET, DEFAULT_REFRESH_SECRET } = require('../utils/backupSecrets')

router.post('/login', authenticateToken, (req, res, next)=>{
        //If they don't have an email, reject them, unless they're admin.
    if(!req.body.email)
        if(!req.isAdmin || !validator.is_email_valid(req.body.email)){
            //If they're not an admin, or their email is invalid
            return res.status(400).json({success: false, message: 'Failed to log in. Please provide a valid email.'})
        }

    if(!req.token && !req.body.password){
        return res.status(400).json({success: false, message: 'Please provide a password to log in.'})
    }

    User.findOne({email:req.body.email},
        async (err, userData)=>{
            if(err){
                return res.status(502).json({success: false, message: `Failed to login ${req.body.email}. Possible database rror. Please try again.`})            
            }

            const robotSet = await Robot.find()

            if(userData){    
                const {email, password, isAdmin, votedForIDs, name} = userData

                const sendData = {
                    name,
                    email,
                    isAdmin,
                    votedForIDs: votedForIDs || [],
                    loggedIn: true,
                }

                if(req.validated){
                    return res.status(200).json({
                        robotSet: robotSet.reverse(),
                        userData: sendData,
                        message: `Successfully logged in ${email}`,
                    })
                }
                
                if(req.body.password){
                    try{
                        if(!isAdmin){
                            const passwordIsCorrect = await bcrypt.compare(req.body.password, password)
                            
                            if(!passwordIsCorrect){
                                return res.status(401).json({message: 'Incorrect email or password.'})
                            }
                        }


                        sendData.accessToken = jwt.sign({email}, process.env.ACCESS_SECRET || DEFAULT_ACCESS_SECRET, {expiresIn: '24h'})

                        sendData.refreshToken = jwt.sign({email}, process.env.REFRESH_SECRET || DEFAULT_REFRESH_SECRET)

                        tokenContainer.push({
                            accessToken: sendData.accessToken, 
                            name: email
                        })
                    } catch (err) {
                        return res.status(502).json({message: `Server authorization error. Your email and password may or may not be correct, but we could not validate you at this time. ${err}`})
                    }  
                    
                    return res.status(200).json({
                        robotSet: robotSet.reverse(),
                        userData: sendData,
                        message: `Successfully logged in ${email} and generated auth tokens.`,
                    }) 
                }

            }               
            
            return res.status(401).json({message: `Failed to login. email or password incorrect.`})            
        }
    )
})

router.post('/register', async (req, res)=>{

    if(!req.body.email || !validator.is_email_valid(req.body.email) || !req.body.password)
        return res.status(400).send({message: 'Failed to register. Please provide an email and password.'})

    User.findOne({email:req.body.email},
        async (err, userData)=>{
            if(err){
                return res.status(502).json({message: `Failed to register ${req.body.email}. Possible database rror. Please try again.`})          
            }
            if(!userData){
                const robotSet = await Robot.find()
                const newUserData = {
                    _id: new ObjectID(),
                    email: req.body.email,
                    isAdmin: false,
                    loggedIn: true,
                    votedForIDs: [],
                }
                try{

                    newUserData.password = await bcrypt.hash(req.body.password, 10)
                    const newUser = new User(newUserData)
                    newUser.isNew = true
                    await newUser.save()

                    newUserData.accessToken = jwt.sign({email:req.body.email}, process.env.ACCESS_SECRET || DEFAULT_ACCESS_SECRET, {expiresIn: '24h'})

                    newUserData.refreshToken = jwt.sign({email:req.body.email}, process.env.REFRESH_SECRET || DEFAULT_REFRESH_SECRET)

                    tokenContainer.push({
                        accessToken: newUserData.accessToken, 
                        email: req.body.email
                    })

                    return res.status(200).json({
                        userData: newUserData,
                        robotSet: robotSet.reverse(),
                        message: `User ${newUserData.email} created`,   
                    })
                } catch(err){
                    console.log("Error registering user", err)
                    return res.status(502).json({message: `Failed to create ${newUserData.email}.`})
                }                
            }
            
            return res.status(400).json({message: `User ${req.body.email} already exists`})                                    
        }
    )
})

router.post('/logout', async (req, res)=>{
    try{
        tokenContainer = tokenContainer.filter(token=>token.accessToken !== req.body.accessToken && token.email !== req.body.email)
    } catch(err){
        return res.send({info: `Failed to logout user ${req.body.email}, ${err}`})
    }

    return res.send({info: `Successfully logged out ${req.body.email}`})
})

module.exports = router