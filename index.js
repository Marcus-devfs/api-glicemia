require('dotenv').config()
const express = require('express')
const routes = require('./src/routes')
const mongoose = require('mongoose')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const app = express()
const port = process.env.PORT || 3000

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

if (allowedOrigins.length) {
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error('CORS não permitido'))
        }
      },
      credentials: true,
    })
  )
} else {
  app.use(cors())
}

app.use(helmet())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Muitas tentativas. Tente novamente em alguns minutos.' },
})

const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/user/login', authLimiter)
app.use('/user/create', authLimiter)
app.use('/user/forgot-password', authLimiter)
app.use('/track/lp', trackLimiter)

app.use(routes)

mongoose.connect(process.env.MONGODB_URL).then(res => {
   console.log('Connected to DB')
}).catch(err => {
   console.log('ERRO:', err.errors)
})

mongoose.Promise = global.Promise

app.listen(port, () => {
   console.log(`API on port ${port}`)
})
