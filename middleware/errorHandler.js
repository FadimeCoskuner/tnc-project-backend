class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function notFound(req, res, next) {
  next(new AppError(404, `Endpoint bulunamadı: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
  // Yanıt gönderilmeye başlandıysa artık değiştirilemez, kapatmayı Express'e bırakır.
  if (res.headersSent) return next(err);

  const status = err.statusCode ?? err.status ?? 500;

  if (status >= 500) {
    console.error(err);
    return res.status(status).json({ error: { message: 'Sunucu hatası oluştu' } });
  }

  const message = err.type === 'entity.parse.failed' ? 'İstek gövdesi geçerli JSON değil' : err.message;
  res.status(status).json({ error: { message, details: err.details } });
}

module.exports = { AppError, notFound, errorHandler };
