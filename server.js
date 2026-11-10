const express = require('express');
const logger = require('./middleware/logger');
const cors = require('./middleware/cors');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const taskRoutes = require('./routes/taskRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(logger);
app.use(cors);
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ name: 'TaskFlow API', status: 'ok', endpoints: { tasks: '/tasks', reports: '/reports/summary' } });
});

app.use('/tasks', taskRoutes);
app.use('/reports', reportRoutes);

// Sıra önemli: bu ikisi tüm route'lardan sonra gelmelidir.
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, (err) => {
  if (err) throw err;
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
