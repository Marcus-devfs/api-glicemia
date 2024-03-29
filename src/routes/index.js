const routes = require('express').Router()
const UserController = require('../controllers/UserController')
const { checkAuth } = require('../helpers/auth/checkAuth')
const MedicaoController = require('../controllers/MedicaoController')
const FileUserController = require('../controllers/FileUserController')
const multer = require('multer')
const multerConfig = require('../config/multer')
//User Routes
routes.get('/', async (req, res) => {
    return res.status(200).json({ msg: 'Public Route' })
})
routes.post('/user/login', UserController.login)
routes.get('/user/list', checkAuth, UserController.list)
routes.post('/user/create', UserController.add)
routes.get('/user/:id', checkAuth, UserController.readById)
routes.post('/user/loginToken', checkAuth, UserController.loginByToken)
routes.delete('/user/:id', checkAuth, UserController.delete)
routes.patch('/user/update/:id', checkAuth, UserController.update)
routes.patch('/user/update/password/:id', checkAuth, UserController.updatePassword)

//Marking Routes
routes.get('/marking/list/:userId', checkAuth, MedicaoController.list)
routes.get('/marking/list/media/:userId', checkAuth, MedicaoController.listMedia)
routes.post('/marking/create/:userId', checkAuth, MedicaoController.add)
routes.delete('/marking/delete/:makingId', checkAuth, MedicaoController.delete)
routes.patch('/marking/update/:makingId', checkAuth, MedicaoController.update)

//FileUser
routes.post('/file/upload', multer(multerConfig).single('file'), FileUserController.upload)


module.exports = routes 
