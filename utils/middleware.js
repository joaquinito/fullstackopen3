/*
Custom middleware functions.
*/

const jwt = require('jsonwebtoken')
const logger = require('./logger')
const User = require('../models/user')

const requestLogger = (request, response, next) => {
    logger.info('Method:', request.method)
    logger.info('Path:  ', request.path)
    logger.info('Body:  ', request.body)
    logger.info('---')
    next()
}

// Middleware function for extracting the JsonWebToken from the request's header
const tokenExtractor = (request, response, next) => {
    const authorization = request.get('authorization')
    if (authorization && authorization.startsWith('Bearer ')) {
        request.token = authorization.replace('Bearer ', '')
    }
    next()
}


// Middleware function for getting the user corresponding to the JsonWebToken 
// in the request's header
const userExtractor = async (request, response, next) => {

    const authorization = request.get('authorization')
    if (authorization && authorization.startsWith('Bearer ')) {

        const token = authorization.replace('Bearer ', '')
        const decodedToken = jwt.verify(token, process.env.SECRET)
        if (!decodedToken.id) {
            // 401 Unauthorized
            return response.status(401).json({ error: 'token missing or invalid' })
        }

        request.user = await User.findById(decodedToken.id)
    }
    else{
        request.user = null
    }
    
    next()
}

// Unknown endpoint
const unknownEndpoint = (request, response) => {
    response.status(404).send({ error: 'unknown endpoint' })
}

// Error handler middleware
const errorHandler = (error, request, response, next) => {
    if (error.name === 'CastError') {
        return response.status(400).send({ error: 'malformatted id' })
    }
    else if (error.name === 'ValidationError') {

        if (error.errors.username) {
            return response.status(400).json({ error: 'username is required' })
        }
        else if (error.errors.password) {
            return response.status(400).json({ error: 'password is required' })
        }
        else {
            return response.status(400).json({ error: error.message })
        }
    }
    // MongoDB error code 11000 indicates a duplicate key error
    else if (error.name === 'MongoServerError' && error.code === 11000) {
        return response.status(400).json({ error: 'username already exists' })
    }
    else if (error.name === 'JsonWebTokenError') {
        return response.status(401).json({ error: error.message })
    }

    next(error)
}

module.exports = {
    requestLogger,
    tokenExtractor,
    userExtractor,
    unknownEndpoint,
    errorHandler
}