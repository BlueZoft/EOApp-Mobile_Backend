const asyncHandler = require('express-async-handler')



/* 
@desc   This gets the updated loans in the cloud to the user
@route  GET request on /api/loans
@access Public
*/

const getLoans = asyncHandler(async (req, res) => {
    res.status(200).json({message: 'get loans to the client'})

})


/* 
@desc   This saves the user data in the database with NIC key
@route  SET request on /api/userdata
@access Private
*/

const setData = asyncHandler(async (req, res) => {

    if(!req.body.text) {
        res.status(400)
        throw new Error('Please add NIC')
    }

    res.status(200).json({message: 'save userdata'})
   
})


/* 
@desc   This saves the user data in the database with NIC key
@route  PUT request on /api/userdata/id
@access Private
*/

const putData = asyncHandler(async (req, res) => {
    res.status(200).json({message: `update userdata of ${req.params.id}`})
   
})



module.exports = {
    getLoans, setData, putData,
}