const Validator = require('validator');
const isEmpty = require('./is-empty');

module.exports = function validateChnagePasswordInput(data) {
    let errors = {};
    data.oldpassword = !isEmpty(data.oldpassword) ? data.oldpassword : '';
    data.newpassword = !isEmpty(data.newpassword) ? data.newpassword : '';
    data.cnewpassword = !isEmpty(data.cnewpassword) ? data.cnewpassword : '';
    
    if (Validator.isEmpty(data.oldpassword)) {
        errors.oldpassword = 'old password field is required';
    }else if(data.oldpassword.length < 8){
        errors.oldpassword = 'old password should be 8 characters long';
    }
    
    if (Validator.isEmpty(data.newpassword)) {
        errors.newpassword = 'new password field is required';
    }else if(data.newpassword.length < 8){
        errors.newpassword = 'new password should be 8 characters long';
    }

    if (Validator.isEmpty(data.cnewpassword)) {
        errors.cnewpassword = 'confirm password field is required';
    }else if(data.cnewpassword.length < 8){
        errors.cnewpassword = 'confirm password should be 8 characters long';
    }


    return {
        errors,
        isValid: isEmpty(errors)
    };
}