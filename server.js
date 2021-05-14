const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const Robot = require('./schemas/robot')
const robotRoutes = require('./routes/robotRoutes')
const authRoutes = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes')

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

    //Might add a little homepage to the backend if there's time.
app.set('views', './views');
app.set('view engine', 'ejs');
    //

app.use(cors())
app.use(express.json({limit: '50mb'}))
app.use(express.urlencoded({limit:'50mb', extended:true}))
app.use('/users', userRoutes)
app.use('/robots', robotRoutes)
app.use('/refreshToken', authRoutes)

app.get('/', async (req, res)=>{
    const robotList = await Robot.find()
    res.send(`Famous Robots Backend by Shaquil Hansford.
            Current Robots:<br/> ${robotList.map(bot=>`<br />${bot.name}<br /><img style='max-width:200px' src='${bot.image}'/><br />`)} \n
            <h1 style='margin-bottom:200px'>Frontend coming soon!</h1>
    `)
}) 

var port = process.env.PORT || '3100';
app.listen(port, ()=>{console.log("Listening on port:", port)})