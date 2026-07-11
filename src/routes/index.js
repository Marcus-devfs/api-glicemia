const routes = require('express').Router()
const UserController = require('../controllers/UserController')
const { checkAuth } = require('../helpers/auth/checkAuth')
const MedicaoController = require('../controllers/MedicaoController')
const FileUserController = require('../controllers/FileUserController')
const PushController = require('../controllers/PushController')
const AdminController = require('../controllers/AdminController')
const ContentController = require('../controllers/ContentController')
const ForumController = require('../controllers/ForumController')
const PaymentController = require('../controllers/PaymentController')
const { checkAdmin } = require('../helpers/auth/checkAdmin')
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

// Pagamentos Asaas
routes.post('/payments/webhook/asaas', PaymentController.asaasWebhook)
routes.post('/payments/pix', checkAuth, PaymentController.createPix)
routes.post('/payments/card-checkout', checkAuth, PaymentController.createCardCheckout)
routes.post('/payments/checkout', checkAuth, PaymentController.createCardCheckout)
routes.get('/payments/premium-status', checkAuth, PaymentController.getPremiumStatus)

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

// Admin
routes.get('/admin/me', checkAuth, checkAdmin, AdminController.me)
routes.get('/admin/dashboard', checkAuth, checkAdmin, AdminController.dashboard)
routes.get('/admin/users', checkAuth, checkAdmin, AdminController.listUsers)
routes.get('/admin/users/:id', checkAuth, checkAdmin, AdminController.getUserDetail)
routes.patch('/admin/users/:id/premium', checkAuth, checkAdmin, AdminController.setPremium)
routes.get('/admin/financial/summary', checkAuth, checkAdmin, AdminController.financialSummary)
routes.get('/admin/payments', checkAuth, checkAdmin, AdminController.listPayments)

// Conteúdo público (blog/dicas)
routes.get('/articles', ContentController.listArticles)
routes.get('/articles/:slug', ContentController.getArticleBySlug)

// Admin — conteúdo
routes.get('/admin/articles', checkAuth, checkAdmin, AdminController.listArticles)
routes.post('/admin/articles', checkAuth, checkAdmin, AdminController.createArticle)
routes.patch('/admin/articles/:id', checkAuth, checkAdmin, AdminController.updateArticle)
routes.delete('/admin/articles/:id', checkAuth, checkAdmin, AdminController.deleteArticle)

// Fórum (usuárias logadas)
routes.get('/forum/posts', checkAuth, ForumController.listPosts)
routes.post('/forum/posts', checkAuth, ForumController.createPost)
routes.get('/forum/posts/:id', checkAuth, ForumController.getPost)
routes.post('/forum/posts/:id/comments', checkAuth, ForumController.addComment)
routes.post('/forum/posts/:id/support', checkAuth, ForumController.toggleSupport)
routes.post('/forum/posts/:id/report', checkAuth, ForumController.reportPost)
routes.post('/forum/comments/:id/report', checkAuth, ForumController.reportComment)

// Admin — fórum
routes.get('/admin/forum/posts', checkAuth, checkAdmin, AdminController.listForumPosts)
routes.patch('/admin/forum/posts/:id', checkAuth, checkAdmin, AdminController.updateForumPost)
routes.delete('/admin/forum/posts/:id', checkAuth, checkAdmin, AdminController.deleteForumPost)
routes.get('/admin/forum/reports', checkAuth, checkAdmin, AdminController.listForumReports)
routes.patch('/admin/forum/reports/:id', checkAuth, checkAdmin, AdminController.resolveForumReport)


module.exports = routes 
