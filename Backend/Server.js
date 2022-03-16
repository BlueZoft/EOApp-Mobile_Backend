const express = require('express')
const dotenv = require('dotenv').config()
const{errorHandler} = require('./Middleware/errorMiddleware')
const port = process.env.PORT || 5000

const app = express()

app.use(express.json())

app.use(express.urlencoded({extended: false}))

app.use('/api/loans', require('./Routes/loanRoute'))

app.use('/api/userdata', require('./Routes/userRoute'))

app.use(errorHandler)


app.listen(port, () => console.log(`Server started on port ${port}`))