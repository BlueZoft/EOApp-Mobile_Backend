const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err)
  const status = err.name === 'ValidationError' || err.name === 'CastError' ? 400
    : err.type === 'entity.too.large' ? 413
    : err.type === 'entity.parse.failed' ? 400
    : res.statusCode >= 400 ? res.statusCode : 500
  res.status(status).json({ message: status >= 500 ? 'An unexpected server error occurred' : err.message })
}
module.exports = { errorHandler }
