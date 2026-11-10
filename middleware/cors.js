const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const extraOrigins = (process.env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);

// Frontend ayrı bir adresten çalıştığı için tarayıcının isteklere izin vermesi gerekir.
function cors(req, res, next) {
  const { origin } = req.headers;

  res.vary('Origin');
  if (origin && (LOCAL_ORIGIN.test(origin) || extraOrigins.includes(origin))) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
}

module.exports = cors;
