const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const cookieParser = require('cookie-parser');

dotenv.config({path : './.env'});


bodyParser = require('body-parser');


const app = express();

const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));
app.set('view engine', 'twig');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());


app.use('/', require('./routes/pages'))
app.use('/auth', require('./routes/auth'));


const port = process.env.PORT || 3000;
app.listen(port, ()  => {
    console.log("The server is listening on " + port);
});