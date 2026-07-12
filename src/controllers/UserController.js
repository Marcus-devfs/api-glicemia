const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const UserModel = require('../models/User')
const bcrypt = require('bcrypt')
const { sendMail } = require('../lib/email/sendMail')
const { passwordResetHtml } = require('../lib/email/templates/passwordReset')
const PixPaymentModel = require('../models/PixPayment')
const { logAccess } = require('../lib/accessLog')
const { getAppSettings } = require('../lib/appSettings')

class UserController {

   list = async (req, res) => {
      try {
         const user = await UserModel.find().exec()
         res.status(201).json(user)
      } catch (error) {
         res.status(200).json({ msg: 'Hello MF Planejados!' })
      }
   }

   add = async (req, res) => {

      try {
         const userData = req.body.userData ?? req.body
         const { email, password = null } = userData

         if (!email || !userData.name) {
            return res.status(400).json({ msg: 'Missing required fields' })
         }

         const normalizedEmail = email.trim().toLowerCase()

         let senha = password

         if (!senha) {
            const newPassword = this.generateRadomPassword(6)
            senha = newPassword
         }

         const userExists = await UserModel.findOne({ email: normalizedEmail })

         if (userExists) {
            return res.status(500).json({ msg: 'User exists' })
         }

         const salt = await bcrypt.genSalt(10)
         const passwordHash = await bcrypt.hash(senha, salt)

         const newUser = await UserModel.create({
            ...userData,
            email: normalizedEmail,
            password: passwordHash,
         })

         let html = `
         <div style="background-color: #f1f1f1; padding: 30px; position: relative;">
            <div style="max-width: 400px; background-color: #fff; padding: 30px; border-radius: 12px; position: absolute; margin: auto; left: 0; right: 0; top: 0; bottom: 0;">
               <p style="font-size: 18px; text-align: center;">${newUser?.name},</p>
               <p style="font-size: 18px; text-align: center;">Bem-vinda ao GestaGlic!</p>
               <p style="font-size: 18px;">https://app.gestaglic.com.br/login</p>
               <p style="font-size: 18px;">Usuário: ${normalizedEmail}</p>
               <p style="font-size: 18px;">Senha: ${senha}</p>
            </div>
         </div>`

         try {
            await sendMail({
               to: normalizedEmail,
               subject: 'Bem-vinda ao GestaGlic — suas credenciais',
               html,
            })
         } catch (emailErr) {
            console.log('Erro ao enviar e-mail de cadastro:', emailErr.message)
         }

         res.status(201).json(newUser)

         logAccess(req, newUser._id, 'register', { email: normalizedEmail })

      } catch (error) {
         console.log(error)
         res.status(500).json({ error: error.response })
      }
   }

   login = async (req, res) => {

      const { email, password } = req.body
      try {
         const normalizedEmail = email?.trim().toLowerCase()
         const user = await UserModel.findOne({ email: normalizedEmail })
            .select('+password').populate('photoPerfil')

         if (!user || !user.password) {
            return res.status(401).json({ msg: 'Invalid Credentials' })
         }

         const result = await bcrypt.compare(password, user.password)

         if (!result) return res.status(401).json({ msg: 'Invalid Credentials' })

         const jwtToken = jwt.sign(
            {
               userId: user._id,
            },
            process.env.NEXT_PUBLIC_JWT_KEY,
         )
         user.token = jwtToken

         logAccess(req, user._id, 'login')

         return res.status(200).json(user)
      } catch (error) {
         console.log(error)
         return res.status(500).json({ msg: 'API error' })
      }
   }

   readById = async (req, res) => {
      try {
         const { id } = req.params
         const user = await UserModel.findById(id).populate('photoPerfil')
         res.status(200).json(user)
      } catch (error) {
         res.status(200).json({ error })
      }
   }

   loginByToken = async (req, res) => {
      try {

         const { userId } = req.currentUser
         const user = await UserModel.findOne({ _id: userId }).populate('photoPerfil')

         if (user) {
            const jwtToken = jwt.sign({ userId: user._id }, process.env.NEXT_PUBLIC_JWT_KEY);
            user.token = jwtToken
            logAccess(req, user._id, 'session_restore')
            return res.status(200).json(user)
         }

         return res.status(500).json({})
      } catch (error) {
         res.status(500).json(error)
      }
   }

   delete = async (req, res) => {
      try {
         const { id } = req.params
         const deletedUser = await UserModel.findByIdAndDelete(id).exec()
         res.status(201).json(deletedUser)
      } catch (error) {
         res.status(400).json({ error })
      }
   }

   update = async (req, res) => {
      try {
         const { id } = req.params

         if (req.currentUser?.userId !== id) {
            return res.status(403).json({ msg: 'Forbidden' })
         }

         const user = await UserModel.findById(id)
         if (!user) return res.status(404).json({ msg: 'User not found' })

         const body = req.body.userData ?? req.body
         const update = {}

         if (body.name != null) update.name = String(body.name).trim()

         if (body.pregnancy != null) {
            update.pregnancy = {
               dueDate: body.pregnancy.dueDate ? new Date(body.pregnancy.dueDate) : null,
               fetusCount: Math.min(4, Math.max(1, Number(body.pregnancy.fetusCount) || 1)),
            }
         }

         if (body.glucoseTargets != null && user.is_premium) {
            const t = body.glucoseTargets
            update.glucoseTargets = {
               jejum: Math.min(120, Math.max(60, Number(t.jejum) || user.glucoseTargets?.jejum || 95)),
               pos1h: Math.min(250, Math.max(100, Number(t.pos1h) || user.glucoseTargets?.pos1h || 179)),
               pos2h: Math.min(220, Math.max(100, Number(t.pos2h) || user.glucoseTargets?.pos2h || 152)),
            }
         }

         if (body.preferences?.weeklySummaryEmail != null && user.is_premium) {
            update['preferences.weeklySummaryEmail'] = Boolean(body.preferences.weeklySummaryEmail)
         }

         const response = await UserModel.findByIdAndUpdate(id, update, {
            new: true,
            runValidators: true,
         }).exec()

         res.status(200).json(response)
      } catch (error) {
         res.status(400).json({ error })
      }
   }

   updatePassword = async (req, res) => {

      const { id } = req.params
      const { passwordData } = req.body

      try {

         const user = await UserModel.findById(id)
            .select('+password')

         const result = await bcrypt.compare(passwordData?.password, user?.password)

         if (!result) return res.status(422).send({ msg: 'Senha atual inválida' })

         const newPass = passwordData?.newPassword
         const password = await bcrypt.hash(newPass, 10)
         const response = await UserModel.findByIdAndUpdate(id, { password: password }, { new: true })

         res.status(200).json(response)
      } catch (error) {
         console.log('erro aqui', error)
         res.status(400).json(error)
      }
   }

   registerPdfDownload = async (req, res) => {
      try {
         const { id } = req.params

         if (req.currentUser?.userId !== id) {
            return res.status(403).json({ msg: 'Forbidden' })
         }

         const user = await UserModel.findById(id)

         if (!user) {
            return res.status(404).json({ msg: 'User not found' })
         }

         const { premiumPrice, freePdfLimit } = await getAppSettings()

         if (user.is_premium) {
            logAccess(req, user._id, 'pdf_download', { premium: true })
            return res.status(200).json({
               allowed: true,
               pdf_downloads_count: user.pdf_downloads_count,
               is_premium: true,
               free_pdf_limit: freePdfLimit,
               remaining_free: null,
            })
         }

         if (user.pdf_downloads_count >= freePdfLimit) {
            const existing = await PixPaymentModel.findOne({
               userId: id,
               status: { $in: ['generated', 'pending'] },
            })
            if (!existing) {
               await PixPaymentModel.create({
                  userId: id,
                  amount: premiumPrice,
                  status: 'pending',
               })
            }

            return res.status(403).json({
               allowed: false,
               limit_reached: true,
               pdf_downloads_count: user.pdf_downloads_count,
               is_premium: false,
               free_pdf_limit: freePdfLimit,
               remaining_free: 0,
            })
         }

         user.pdf_downloads_count += 1
         await user.save()

         logAccess(req, user._id, 'pdf_download', {
            count: user.pdf_downloads_count,
         })

         return res.status(200).json({
            allowed: true,
            pdf_downloads_count: user.pdf_downloads_count,
            is_premium: false,
            free_pdf_limit: freePdfLimit,
            remaining_free: Math.max(0, freePdfLimit - user.pdf_downloads_count),
         })
      } catch (error) {
         console.log(error)
         return res.status(500).json({ msg: 'API error' })
      }
   }

   forgotPassword = async (req, res) => {
      try {
         const { email } = req.body
         const normalizedEmail = email?.trim().toLowerCase()

         const genericResponse = {
            msg: 'Se o e-mail existir, enviaremos um link de recuperação.',
         }

         if (!normalizedEmail) {
            return res.status(200).json(genericResponse)
         }

         const user = await UserModel.findOne({ email: normalizedEmail })

         if (!user) {
            return res.status(200).json(genericResponse)
         }

         const resetToken = crypto.randomBytes(32).toString('hex')
         const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')

         user.passwordResetToken = hashedToken
         user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000)
         await user.save()

         const appUrl = process.env.APP_URL || 'https://app.gestaglic.com.br'
         const resetUrl = `${appUrl}/redefinir-senha?token=${resetToken}`

         await sendMail({
            to: normalizedEmail,
            subject: 'Redefinir senha — GestaGlic',
            html: passwordResetHtml({ name: user.name, resetUrl }),
         })

         return res.status(200).json(genericResponse)
      } catch (error) {
         console.log('forgotPassword error:', error)
         return res.status(500).json({ msg: 'Erro ao enviar e-mail. Tente novamente.' })
      }
   }

   resetPassword = async (req, res) => {
      try {
         const { token, password } = req.body

         if (!token || !password) {
            return res.status(400).json({ msg: 'Token e senha são obrigatórios' })
         }

         if (password.length < 4) {
            return res.status(400).json({ msg: 'Senha deve ter no mínimo 4 caracteres' })
         }

         const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

         const user = await UserModel.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: new Date() },
         }).select('+passwordResetToken +passwordResetExpires')

         if (!user) {
            return res.status(400).json({ msg: 'Link inválido ou expirado. Solicite um novo.' })
         }

         user.password = await bcrypt.hash(password, 10)
         user.passwordResetToken = null
         user.passwordResetExpires = null
         await user.save()

         return res.status(200).json({ msg: 'Senha redefinida com sucesso!' })
      } catch (error) {
         console.log('resetPassword error:', error)
         return res.status(500).json({ msg: 'Erro ao redefinir senha' })
      }
   }

   generateRadomPassword(length) {
      var result = '';
      var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      var charactersLength = characters.length;
      for (var i = 0; i < length; i++) {
         result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
      }
      return result;
   }
}

module.exports = new UserController()