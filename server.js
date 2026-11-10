const path = require('path');
const express = require('express');
const logger = require('./middleware/logger');
const cors = require('./middleware/cors');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const taskRoutes = require('./routes/taskRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Logger'dan önce gelir; günlükte arayüz dosyaları değil, yalnızca API istekleri görünür.
app.use(express.static(path.join(__dirname, 'public')));

app.use(logger);
app.use(cors);
app.use(express.json());

app.use('/tasks', taskRoutes);
app.use('/reports', reportRoutes);

// Sıra önemli: bu ikisi tüm route'lardan sonra gelmelidir.
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, (err) => {
  if (err) throw err;
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
