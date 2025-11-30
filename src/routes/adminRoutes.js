const express = require('express');
const path = require('path');

const apiRouter = require('./routes/apiRoutes');

const app = express();

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/api', apiRouter);

app.use((req, res) => {
  res.status(404).send('Not Found');
});

module.exports = app;
