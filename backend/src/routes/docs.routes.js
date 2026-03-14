const express = require('express');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('../docs/openapi');
const { loadWebSocketDocs, generateHTML } = require('../docs/asyncapi-generator');

const router = express.Router();

// Swagger UI
router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Tic-Tac-Toe API Docs',
}));

// Swagger JSON
router.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpecs);
});

// AsyncAPI HTML
router.get('/asyncapi-docs', (req, res) => {
  try {
    const sections = loadWebSocketDocs();
    const html = generateHTML(sections);
    res.send(html);
  } catch (error) {
    console.error('Error generating AsyncAPI docs:', error);
    res.status(500).send('Error generating documentation');
  }
});

// AsyncAPI CSS
router.get('/asyncapi-docs.css', (req, res) => {
  const cssPath = path.join(__dirname, '..', 'docs', 'asyncapi-docs.css');
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(cssPath);
});

// AsyncAPI JS
router.get('/asyncapi-docs.js', (req, res) => {
  const jsPath = path.join(__dirname, '..', 'docs', 'asyncapi-docs.js');
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(jsPath);
});

module.exports = router;
