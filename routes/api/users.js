const express = require('express');
var validator = require('validator');
const mysql = require('mysql');
var nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
var Web3 = require('web3');
const router = express.Router();
var con = require("../../config/database");

//Web3 initiated
var web3 = new Web3();
const precision = 1000000000000000000;
web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const validateRegisterInput = require('../../validation/register');
const validateLoginInput = require('../../validation/login');
const validateChnagePasswordInput = require('../../validation/change-password');

// @route   GET api/users/signup
// @desc    Tests users route
// @access  Public
router.post('/signup', (req, res) => {
    const { errors, isValid } = validateRegisterInput(req.body);
    // Check Validation
    if (!isValid) {
        return res.status(400).json(errors);
    }

    checkEmailExistQuery = 'SELECT * FROM user WHERE email = ' + mysql.escape(req.body.email);
    con.query(checkEmailExistQuery, function (err, result) {
        if (err) throw err;
        if(result.length  == 1){
            errors.email = 'Email already exists';
            return res.status(400).json(errors);
        }else{
            const newUser = {
                email: req.body.email,
                password: req.body.password
            };
            bcrypt.genSalt(10, (err, salt) => {
                bcrypt.hash(newUser.password, salt, (err, hash) => {
                    if (err) throw err;
                    newUser.password = hash;
                    var InsertSql = "INSERT INTO user set ?";
                    con.query(InsertSql, newUser , function (err, result) {
                        if (err) throw err;
                        //send verification mail
                        let randomHashed = randomHash(8);
                        mail(newUser.email,randomHashed);

                        var userId = result.insertId;
                        const account=	web3.personal.newAccount("epc#123_usr");
                        var insertAddress = "INSERT INTO user address ?";
                        var insertAddressJson = {
                            user_id: userId,
                            address : account
                        }
                        con.query(insertAddress, insertAddressJson , function (err, result) {   
                            if (err) throw err;
                            const userData = {
                                user_id: userId,
                                hash: randomHashed
                            };
                            var emailSql = "INSERT INTO email_verify set ?";
                            con.query(emailSql, userData , function (err, result) {
                                if (err) throw err;
                                return res.status(200).json({'emailId':result.insertId});
                            })
                        })
                    });
                });
            });
        }
    });
});


// @route   POST api/users/verifypasscode
// @desc    Tests users route
// @access  Public

router.post('/verifypasscode', (req, res)=>{
    errors = {};
    const emailId = req.body.emailId;
    const emailHash = req.body.emailHash;

    checkEmailVerify = 'select * from email_verify where id = ' + mysql.escape(emailId); 
    con.query(checkEmailVerify, function(err, userResult) {
        if (err) throw err;
        if(userResult.length  != 1){
            errors.error = 'Email id not found';
            return res.status(400).json(errors);
        }
        let hash = userResult[0].hash;
        if(hash != emailHash){
            errors.error = 'Email hash not found';
            return res.status(400).json(errors);
        }
        let userId = userResult[0].user_id;

        updateEmailStatus = 'update user set status = 1 where id = ' + mysql.escape(userId); 
        con.query(updateEmailStatus, function(err, userData) {
            if (err) throw err;
        })

        getUserData = 'select * from user where id = ' + mysql.escape(userId); 
        con.query(getUserData, function(err, userData) {
            if (err) throw err;
            const payload = { id: userData[0].id, email: userData[0].email }; // Create JWT Payload
            // Sign Token
            jwt.sign(
                payload,
                'shivamsingh',//security key
                (err, token) => {
                res.json({
                    success: true,
                    token: 'Bearer ' + token
                });
                }
            );
        })
    })
})



// @route   POST api/users/login
// @desc    Tests users route
// @access  Public

router.post('/login', (req, res) => {
    const { errors, isValid } = validateLoginInput(req.body);
    // Check Validation
    if (!isValid) {
        return res.status(400).json(errors);
    }

    const email = req.body.email;
    const password = req.body.password;

    checkEmailExistQuery = 'SELECT * FROM user WHERE email = ' + mysql.escape(email);
    con.query(checkEmailExistQuery, function (err, userResult) {
        if (err) throw err;
        if(userResult.length  != 1){
            errors.email = 'Email not found';
            return res.status(400).json(errors);
        }else{
            let userId = userResult[0].id;
            con.query('SELECT * FROM email_verify WHERE user_id = ' + userId, function (err, result){
                let status = result[0].status;
                if(status == 0){
                    errors.email = 'Please verify your email';
                    return res.status(400).json(errors);
                }else{
                    bcrypt.compare(password, userResult[0].password).then(isMatch => {
                        if (isMatch) {
                            // User Matched
                            const payload = { id: userResult[0].id, email: userResult[0].email }; // Create JWT Payload
                            // Sign Token
                            jwt.sign(
                                payload,
                                'shivamsingh',//security key
                                (err, token) => {
                                res.json({
                                    success: true,
                                    token: 'Bearer ' + token
                                });
                                }
                            );
                        }else {
                            errors.email = 'Password incorrect';
                            return res.status(400).json(errors);
                        }
                    })
                }
            })
        }
    });
})
// @route   POST api/users/current
// @desc    Return current user
// @access  Private

router.post(
    '/change_password',
    passport.authenticate('jwt', { session: false }),
    (req, res) => {
        let userId = req.user.id
        const { errors, isValid } = validateChnagePasswordInput(req.body);
        // Check Validation
        if (!isValid) {
            return res.status(400).json(errors);
        }
        let oldpassword = req.body.oldpassword;
        con.query('SELECT * FROM user WHERE id = ' + userId, function (err, result){
            bcrypt.compare(oldpassword, result[0].password).then(isMatch => {
                if(isMatch){
                    bcrypt.genSalt(10, (err, salt) => {
                        bcrypt.hash(req.body.newpassword, salt, (err, hash) => {
                            if (err) throw err;
                            con.query('update user set ? where id = :userId',{userId:userId, password:hash}, function(err, result){
                                if (err) throw err;
                                error.success = 'Password change successfully';
                                return res.status(200).json(error);
                            })
                        })
                    })
                }else{
                    errors.oldpassword = 'old password did not match';
                    return res.status(400).json(errors);
                }
            })
        })
    }
);


// @route   GET api/users/useraddress
// @desc    Tests users route
// @access  Private

router.post(
    '/useraddress',
    passport.authenticate('jwt', { session: false }),
    (req, res) => {
        let userId = req.user.id
        con.query('SELECT address FROM address WHERE user_id = ' + userId, function (err, result){
            if (err) throw err;
            return res.status(200).json(result[0]);
        })
});


//function for sending mail

function mail(email,text){
    var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: '',
        pass: ''
    }
    });
    var mailOptions = {
        from: 'shvmsngh99@gmail.com',
        to: email,
        subject: 'Sending Email using Node.js',
        text: 'Your email verification passcode is ' + text
    };
    
    transporter.sendMail(mailOptions, function(error, info){
    if (error) {
        console.log(error);
    } else {
        console.log('Email sent: ' + info.response);
    }
    });
}
function randomHash(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}


module.exports = router;
