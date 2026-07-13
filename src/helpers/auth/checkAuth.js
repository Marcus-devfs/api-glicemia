const jwt = require('jsonwebtoken')
const { getJwtSecret } = require('./jwtSecret')

const checkAuth = (req, res, next) => {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Não autorizado' })
    }

    try {
        const token = header.split(' ')[1]
        const decoded = jwt.verify(token, getJwtSecret())
        req.currentUser = decoded
        next()
    } catch (error) {
        return res.status(401).json({ message: 'Não autorizado' })
    }
}

module.exports = {
    checkAuth
}
