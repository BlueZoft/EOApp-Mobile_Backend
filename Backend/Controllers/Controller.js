const asyncHandler = require('express-async-handler')
const User = require('../Models/userModel')
const nodemailer = require ('nodemailer')



/* 
@desc   This gets the updated loans in the database to the user, provided there is connection
@route  GET request on /api/loans
@access Public
*/

const getLoans = asyncHandler(async (req, res) => {

    const loan1 =await loan1.findAll()
    const loan2 =await loan2.findAll()
    const loan3 =await loan3.findAll()
    const loan4 =await loan4.findAll()

    var loanObj = {
        loan1: loan1,
        loan2: loan2,
        loan3: loan3,
        loan4: loan4,
    }
    
    res.status(200).json(loanObj)

})


/* 
@desc   This saves the user data in the database
@route  POST request on /api/userdata
@access Public
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
    Branch:req.body.branch
})

await user.save();

if (req.body.sex='female') {
    const salut = 'මිය' 
} else {
    const salut = 'මයා' 
}

const mail = 
<>

<h3>‍ත‍ොරතුරු</h3>
<ul>
    <li>නම: ${Name} ${salut}</li>
    <li>වයස: ${Age}</li>
    <li>දුරකථන අංකය: ${Telephone}</li>
    <li>ලිපිනය: ${Address} </li>
    <li>ළඟම ශාඛාව: ${Branch}</li>

</ul>
<h3>විමසීම: </h3>
<p>${Inquiry}</p>
</>

let transporter = nodemailer.createTransport({
    host: "mail.ariya.lk",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: 'hetarata@ariya.lk', // generated ethereal user
      pass: 'RDb82_killaz', // generated ethereal password
    },
    tls:{
        rejectUnauthorized:false
    }
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"Hetarata App" <hetarata@ariya.lk>', // sender address
    to: "akilaariyathilaka@gmail.com", // list of receivers
    subject: "‍හ‍ෙටරට විමසුමක්!", // Subject line
    html: mail, // plain text body
    
  });

console.log(" Response : User", user)

    if (user)
        req.status(200)
    else 
        req.status(404)

  
   
})



module.exports = {getLoans, setData, }