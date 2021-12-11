import express from 'express';
const app: express.Application = express();
const cors = require('cors')
const mongoose = require('mongoose')
import { Robot, robotModel  } from './schemas/robot'; './schemas/robot';
const robotRoutes = require('./routes/robotRoutes')
const authRoutes = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes')
require('dotenv').config();

mongoose.connect(
    `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASSWORD}@cluster0.rqrfn.mongodb.net/famousrobots?retryWrites=true&w=majority`,
    {
        useNewUrlParser:true,
        useUnifiedTopology:true
    },
    (err:any)=>{
        if(err)
            return console.log("Mongoose connection failed", err)

        console.log(`mongoose is connected`)
    }
)

    //Might add a little homepage to the backend if there's time.
app.set('views', './views');
app.set('view engine', 'ejs');

app.use(cors())
app.use(express.json({limit: '50mb'}))
app.use(express.urlencoded({limit:'50mb', extended:true}))
app.use('/users', userRoutes)
app.use('/robots', robotRoutes)
app.use('/refreshToken', authRoutes)

app.get('/', async (req, res)=>{
    const robotList:Robot[] = await robotModel.find()
    res.send(`Robot voting Backend by Shaquil Hansford.
        Current Robots:<br/> ${robotList.map(bot=>`<br />${bot.name}<br /><img style='max-width:200px' src='${bot.image}'/><br />`)} \n
        <h1 style='margin-bottom:200px'>Frontend coming soon!</h1>
    `)
}) 

var port = process.env.PORT || '3100';
app.listen(port, ()=>{console.log("Listening on port:", port)})