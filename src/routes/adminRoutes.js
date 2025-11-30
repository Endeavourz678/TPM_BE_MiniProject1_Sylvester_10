// src/app.js
const express = require('express');
const path = require('path');

const apiRouter = require('./routes/apiRoutes');
// NOTE: no adminRouter here — we use apiRouter for both user + admin actions

const app = express();

// serve static files (public/)
app.use(express.static(path.join(__dirname, '..', 'public')));

// body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// API routes (user + admin endpoints merged)
app.use('/api', apiRouter);

// fallback 404
app.use((req, res) => {
  res.status(404).send('Not Found');
});

module.exports = app;
