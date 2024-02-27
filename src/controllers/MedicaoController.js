const Medicao = require('../models/Medicao')

class MedicaoController {

   list = async (req, res) => {
      try {
         const { userId } = req.params
         const response = await Medicao.find({ userId: userId }).exec()
         res.status(200).json(response)
      } catch (error) {
         res.status(400).json({ msg: 'Hello Orçamento' })
      }
   }

   listMedia = async (req, res) => {
      try {
         const { userId } = req.params
         const markings = await Medicao.find({ userId: userId }).exec()
         const jejum = markings?.filter(item => item?.period?.includes('Jejum'))
         const aposLanch = markings?.filter(item => !item?.period?.includes('Jejum'))
         res.status(200).json({ jejum, aposLanch })
      } catch (error) {
         res.status(400).json({ msg: 'Hello Orçamento' })
      }
   }

   add = async (req, res) => {
      try {
         const { userId } = req.params
         const { marking } = req.body;

         marking.userId = userId;

         if (marking.date) {
            const markingDate = new Date(marking.date + 'T12:00:00Z'); // Adiciona 'T12:00:00Z' para garantir a consistência no fuso horário
            marking.date = markingDate;
         }

         if (parseInt(marking?.diet) > 0) {
            marking.diet = true
         } else {
            marking.diet = false
         }

         const response = await Medicao.create(marking)
         res.status(201).json(response)
      } catch (err) {
         console.log(err)

         res.status(400).json({ success: false, error: err.response })
      }
   }

   readById = async (req, res) => {
      try {
         const { makingId } = req.params
         const response = await Medicao.findById(makingId).exec()

         res.status(200).json(response)
      } catch (error) {
         res.status(400).json({ success: false, error: error.response })
      }
   }

   update = async (req, res) => {
      try {
         const { makingId } = req.params
         const { making } = req.body
         const response = await Medicao.findByIdAndUpdate(makingId, making, { new: true }).exec()
         res.status(200).json(response)
      } catch (error) {
         res.status(400).json({ error })
      }
   }

   delete = async (req, res) => {
      try {
         const { makingId } = req.params
         const response = await Medicao.findByIdAndDelete(makingId).exec()
         res.status(200).json(response)
      } catch (error) {
         res.status(400).json({ error })
      }
   }


}

module.exports = new MedicaoController()