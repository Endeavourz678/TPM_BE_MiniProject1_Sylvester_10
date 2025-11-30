const express = require('express');
const path = require('path');

const apiRouter = require('./routes/apiRoutes');

const app = express();

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// serve home.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'home.html'));
});

app.use('/api', apiRouter);

app.get('/health', (req, res) => res.send('OK'));

app.use((req, res) => {
  res.status(404).send('Not Found');
});

module.exports = app;
