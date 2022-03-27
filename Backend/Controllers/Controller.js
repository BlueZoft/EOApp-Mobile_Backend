const asyncHandler = require('express-async-handler')

const user = require('../Models/userModel')


/* 
@desc   This gets the updated loans in the database to the user, provided there is connection
@route  GET request on /api/loans
@access Public
*/

const getLoans = asyncHandler(async (req, res) => {

    const loans =await user.find()
    
    res.status(200).json(loans)

})


/* 
@desc   This saves the user data in the database with NIC key
@route  POST request on /api/userdata
@access Private
*/

const setData = asyncHandler(async (req, res) => {

    if(!req.body.text) {
        res.status(400)
        throw new Error('No data coming')
    }
const user = await user.create({
    text: req.body.text
})

    

    res.status(200).req.body.text
   
})


/* 
@desc   This saves the user data in the database with NIC key
@route  PUT request on /api/userdata/id
@access Private
*/

const putData = asyncHandler(async (req, res) => {

    res.status(200).json({message: `update userdata of ${req.params.id}`})
   
})



module.exports = {getLoans, setData, putData,}