const routes = require('express').Router()
const UserController = require('../controllers/UserController')
const { checkAuth } = require('../helpers/auth/checkAuth')
const MedicaoController = require('../controllers/MedicaoController')

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
routes.patch('/user/:id', checkAuth, UserController.update)
routes.patch('/user/password/:id', checkAuth, UserController.updatePassword)

//CategoryHome Routes
routes.get('/marking/list/:userId', checkAuth, MedicaoController.list)
routes.get('/marking/list/media/:userId', checkAuth, MedicaoController.listMedia)
routes.post('/marking/create/:userId', checkAuth, MedicaoController.add)
routes.delete('/marking/delete/:makingId', checkAuth, MedicaoController.delete)
routes.patch('/marking/update/:id', checkAuth, MedicaoController.update)

module.exports = routes 
