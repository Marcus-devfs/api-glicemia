const routes = require('express').Router()
const UserController = require('../controllers/UserController')
const { checkAuth } = require('../helpers/auth/checkAuth')
const MedicaoController = require('../controllers/MedicaoController')
const FileUserController = require('../controllers/FileUserController')
const PushController = require('../controllers/PushController')
const multer = require('multer')
const multerConfig = require('../config/multer')
const { checkCron } = require('../helpers/auth/checkCron')
//User Routes
routes.get('/', async (req, res) => {
    return res.status(200).json({ msg: 'Public Route' })
})
routes.post('/user/login', UserController.login)
routes.post('/user/forgot-password', UserController.forgotPassword)
routes.post('/user/reset-password', UserController.resetPassword)
routes.get('/user/list', checkAuth, UserController.list)
routes.post('/user/create', UserController.add)
routes.get('/user/:id', checkAuth, UserController.readById)
routes.post('/user/loginToken', checkAuth, UserController.loginByToken)
routes.delete('/user/:id', checkAuth, UserController.delete)
routes.patch('/user/update/:id', checkAuth, UserController.update)
routes.patch('/user/update/password/:id', checkAuth, UserController.updatePassword)
routes.post('/user/pdf-download/:id', checkAuth, UserController.registerPdfDownload)

//Marking Routes
routes.get('/marking/list/:userId', checkAuth, MedicaoController.list)
routes.get('/marking/list/media/:userId', checkAuth, MedicaoController.listMedia)
routes.post('/marking/create/:userId', checkAuth, MedicaoController.add)
routes.delete('/marking/delete/:makingId', checkAuth, MedicaoController.delete)
routes.patch('/marking/update/:makingId', checkAuth, MedicaoController.update)

//FileUser
routes.post('/file/upload', multer(multerConfig).single('file'), FileUserController.upload)

// Push notifications
routes.get('/push/vapid-key', PushController.getVapidKey)
routes.post('/push/subscribe', checkAuth, PushController.subscribe)
routes.delete('/push/subscribe', checkAuth, PushController.unsubscribe)
routes.get('/push/reminders/:userId', checkAuth, PushController.getReminders)
routes.patch('/push/reminders/:userId', checkAuth, PushController.updateReminders)
routes.post('/push/reminders', checkCron, PushController.sendReminders)


module.exports = routes 
