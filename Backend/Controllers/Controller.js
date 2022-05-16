const asyncHandler = require('express-async-handler')
const User = require('../Models/userModel')
const nodemailer = require ('nodemailer')



/* 
@desc   This gets the updated loans in the database to the user, provided there is connection
@route  GET request on /api/loans
*/

const getLoans = asyncHandler(async (req, res) => {
    console.log("get loans called")
    const loann1 =await loan1.findAll()
    const loann2 =await loan2.findAll()
    const loann3 =await loan3.findAll()
    const loann4 =await loan4.findAll()

    var loanObj = {
        loan1: loann1,
        loan2: loann2,
        loan3: loann3,
        loan4: loann4,
    }
    console.log(" Response ", loanObj)
    res.status(200).json(loanObj)

})



/* 
@desc   This saves the user data in the database
@route  POST request on /api/userdata
*/

const setData = asyncHandler(async (req, res) => {



const user = new User({
    Name: req.body.name,
    Age: req.body.age,
    NIC: req.body.NIC,
    Sex: req.body.sex,
    Telephone: req.body.tel,
    Address: req.body.addr,
    email: req.body.email,
    Inquiry: req.body.inquiry,
    Branch:req.body.branch,
    askLoan:req.body.askLoan
})

await user.save();



console.log(" Response : User", user)

    if (user)
        req.status(200)
    else 
        req.status(404)

  
   
})


/* 
@desc   This gets user information to compare with the user form
@route  GET request on /api/users
*/


const getData = asyncHandler(async (req, res) => {

    const futureUser =await URLSearchParams.findAll
    
    res.status(200).json(futureUser)

})


module.exports = {getLoans, setData, getData}