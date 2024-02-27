const Medicao = require('../models/Medicao')

class MedicaoController {

   list = async (req, res) => {
      try {
         const response = await Medicao.find().exec()
         res.status(200).json(response)
      } catch (error) {
         res.status(400).json({ msg: 'Hello Orçamento' })
      }
   }

   add = async (req, res) => {
      try {
         const { medicaoData } = req.body;
         const response = await Medicao.create(medicaoData)
         res.status(201).json(response)
      } catch (err) {
         res.status(400).json({ success: false, error: err.response })
      }
   }

   readById = async (req, res) => {
      try {
         const { medicaoData } = req.params
         const response = await Medicao.findById(medicaoData).exec()

         res.status(200).json(response)
      } catch (error) {
         res.status(400).json({ success: false, error: error.response })
      }
   }

   update = async (req, res) => {
      try {
         const { medicaoId } = req.params
         const { medicaoData } = req.body
         const response = await Medicao.findByIdAndUpdate(medicaoId, medicaoData, { new: true }).exec()
         res.status(200).json(response)
      } catch (error) {
         res.status(400).json({ error })
      }
   }

   delete = async (req, res) => {
      try {
         const { medicaoId } = req.params
         const response = await Medicao.findByIdAndDelete(medicaoId).exec()

         res.status(200).json(response)
      } catch (error) {
         res.status(400).json({ error })
      }
   }


}

module.exports = new MedicaoController()