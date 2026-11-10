const express = require('express');
const logger = require('./middleware/logger');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const taskRoutes = require('./routes/taskRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(logger);
app.use(express.json());

app.use('/tasks', taskRoutes);

// Sıra önemli: bu ikisi tüm route'lardan sonra gelmelidir.
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, (err) => {
  if (err) throw err;
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
