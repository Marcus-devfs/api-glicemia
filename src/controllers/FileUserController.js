const FileUser = require('../models/FileUser')
const User = require('../models/User')

exports.upload = async (req, res) => {
    const { originalName: name, size, key, location: url = '' } = req.file

    const { userId = null } = req.query

    const fileUserData = await FileUser.findOne({ userId: userId })

    let fileId = fileUserData?._id

    const file = await FileUser.create({
        name,
        size,
        url,
        key,
        userId
    })

    const updatedData = { $push: { photoPerfil: file._id } };


    if (fileId) {
        const deleteFile = await FileUser.findByIdAndDelete(fileId)
        await User.findByIdAndUpdate(userId, { $pull: { photoPerfil: fileId } }, { new: true })
    }

    if (file?._id) {
        await User.findByIdAndUpdate(userId, updatedData, { new: true })
        return res.status(201).json({ file })
    }
    res.status(500).json({})
}
