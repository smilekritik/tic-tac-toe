require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./middlewares/errorHandler');
const env = require('./config/env');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.frontendUrl }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

module.exports = app;
