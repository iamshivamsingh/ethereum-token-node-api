const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const users = require('./routes/api/users');


const app = express();

//Passport middleware
app.use(passport.initialize())

//Passport config
require('./config/passport')(passport);

// Body parser middleware
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.get('/', (req, res) => res.send('Hello World'));

// Use Routes
app.use('/api/users', users);


const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Server running on port ${port}`));
// npm run server