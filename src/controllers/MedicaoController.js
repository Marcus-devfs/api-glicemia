const Medicao = require('../models/Medicao')

class MedicaoController {

   list = async (req, res) => {
      try {
         const { userId } = req.params
         const { page = 1, limit = 10 } = req.query;

         const pageNumber = parseInt(page);
         const limitNumber = parseInt(limit);

         const skip = (pageNumber - 1) * limitNumber;
         const response = await Medicao.find({ userId: userId })
            .skip(skip)
            .limit(limitNumber)
            .exec();

         res.status(200).json(response)
      } catch (error) {
         res.status(400).json({ msg: 'Hello Orçamento' })
      }
   }

   listMedia = async (req, res) => {
      try {
         const { userId } = req.params
         const { year } = req.query
         const markings = await Medicao.find({ userId: userId }).exec()
         const targetYear = parseInt(year);
         const jejum = markings?.filter(item => item?.period?.includes('Jejum') && new Date(item.date).getFullYear() === targetYear);
         const aposLanch = markings?.filter(item => !item?.period?.includes('Jejum') && new Date(item.date).getFullYear() === targetYear);
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
         const { marking } = req.body
         if (marking.date) {
            const markingDate = new Date(marking?.date);
            markingDate.setHours(12, 0, 0, 0);
            marking.date = markingDate;
         }

         if (parseInt(marking?.diet) > 0) {
            marking.diet = true
         } else {
            marking.diet = false
         }

         const response = await Medicao.findByIdAndUpdate(makingId, marking, { new: true }).exec()
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