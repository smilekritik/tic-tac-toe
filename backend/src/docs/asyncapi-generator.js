const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function loadWebSocketDocs() {
  const docsPath = path.join(__dirname, 'websocket');
  const sections = [];

  // Authentication
  const authDoc = yaml.load(fs.readFileSync(path.join(docsPath, 'authentication.yaml'), 'utf8'));
  sections.push({
    title: 'Authentication',
    description: 'WebSocket connection authentication',
    events: authDoc.events
  });

  // Matchmaking
  const matchmakingDoc = yaml.load(fs.readFileSync(path.join(docsPath, 'matchmaking.yaml'), 'utf8'));
  sections.push({
    title: 'Matchmaking',
    description: 'Queue management and match finding',
    flow: matchmakingDoc.flow,
    events: matchmakingDoc.events
  });

  // Gameplay
  const gameplayDoc = yaml.load(fs.readFileSync(path.join(docsPath, 'gameplay.yaml'), 'utf8'));
  sections.push({
    title: 'Gameplay',
    description: 'Game moves and state management',
    flow: gameplayDoc.flow,
    events: gameplayDoc.events
  });

  // Errors
  const errorsDoc = yaml.load(fs.readFileSync(path.join(docsPath, 'errors.yaml'), 'utf8'));
  sections.push({
    title: 'Error Handling',
    description: 'Error events and codes',
    events: errorsDoc.events,
    errorCodes: errorsDoc.errorCodes
  });

  // Info
  const infoDoc = yaml.load(fs.readFileSync(path.join(docsPath, 'info.yaml'), 'utf8'));
  sections.push({
    title: 'Rooms & Timeouts',
    description: 'Connection rooms and timeout information',
    rooms: infoDoc.rooms,
    timeouts: infoDoc.timeouts
  });

  return sections;
}

function generateHTML(sections) {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tic-Tac-Toe WebSocket API Documentation</title>
    <link rel="stylesheet" href="/asyncapi-docs.css">
</head>
<body>
    <div class="swagger-ui">
        <div class="info">
            <h1>Tic-Tac-Toe WebSocket API <span class="version">v1.0.0</span></h1>
            <div class="description">Real-time Socket.IO events for matchmaking and gameplay</div>
        </div>

        <div class="servers">
            <strong>Server:</strong>
            <select>
                <option value="ws://localhost:5000">ws://localhost:5000 - Development server</option>
            </select>
        </div>

        <div class="main-content">`;

  sections.forEach(section => {
    html += `
            <div class="tag-section">
                <div class="tag-header collapsible">
                    <div>
                        <span class="tag-title">${section.title}</span>
                        <span class="tag-description">${section.description}</span>
                    </div>
                    <span class="expand-icon">▼</span>
                </div>
                <div class="operations">`;

    // Add flow diagram if exists
    if (section.flow) {
      html += `
                    <div class="flow-diagram">
                        <div class="flow-title">${section.flow.title}:</div>`;
      section.flow.steps.forEach(step => {
        html += `
                        <div class="flow-step">${step}</div>`;
      });
      html += `
                    </div>`;
    }

    // Add events
    if (section.events) {
      Object.entries(section.events).forEach(([eventName, event]) => {
        const direction = event.direction === 'send' ? 'send' : 'receive';
        const methodBadge = event.direction === 'send' ? 'method-send' : 'method-receive';
        const methodText = event.direction === 'send' ? 'SEND' : 'RECEIVE';

        html += `
                    <div class="operation ${direction}">
                        <div class="operation-header collapsible">
                            <span class="method-badge ${methodBadge}">${methodText}</span>
                            <span class="operation-path">${eventName}</span>
                            <span class="operation-summary">${event.summary}</span>
                        </div>
                        <div class="operation-details">
                            <div class="operation-content">
                                <div class="description">
                                    ${event.description}
                                </div>`;

        // Add payload
        if (event.payload) {
          const payloadTitle = event.direction === 'send' ? 'Request Payload' : 'Response Payload';
          html += `
                                <div class="section-title">${payloadTitle}</div>
                                <div class="payload-example">${formatPayload(event.payload)}</div>`;
        }

        // Add responses
        if (event.responses) {
          html += `
                                <div class="section-title">Responses</div>
                                <div class="responses">`;
          event.responses.forEach(response => {
            html += `
                                    <div class="response-item"><strong>${response.event}</strong> - ${response.description}</div>`;
          });
          html += `
                                </div>`;
        }

        html += `
                            </div>
                        </div>
                    </div>`;
      });
    }

    // Add error codes if exists
    if (section.errorCodes) {
      html += `
                    <div class="operation-content">
                        <div class="section-title">Error Codes</div>
                        <div class="error-codes">`;
      section.errorCodes.forEach(error => {
        html += `
                            <div class="error-code">
                                <div class="error-code-name">${error.code}</div>
                                ${error.description}
                            </div>`;
      });
      html += `
                        </div>
                    </div>`;
    }

    // Add rooms if exists
    if (section.rooms) {
      html += `
                    <div class="operation-content">
                        <div class="section-title">Rooms</div>
                        <div class="rooms-info">`;
      section.rooms.forEach(room => {
        html += `
                            <div class="room-item">
                                <span class="room-name">${room.name}</span> - ${room.description}
                            </div>`;
      });
      html += `
                        </div>`;
    }

    // Add timeouts if exists
    if (section.timeouts) {
      html += `
                        <div class="section-title">Timeouts</div>
                        <div class="timeout-info">`;
      section.timeouts.forEach(timeout => {
        if (timeout.name) {
          html += `
                            <div class="timeout-item">
                                <span class="timeout-name">${timeout.name}:</span> ${timeout.value}
                            </div>`;
        } else if (timeout.note) {
          html += `
                            <div style="margin-top: 10px; font-style: italic; color: #6b7280;">
                                ${timeout.note}
                            </div>`;
        }
      });
      html += `
                        </div>
                    </div>`;
    }

    html += `
                </div>
            </div>`;
  });

  html += `
        </div>
    </div>

    <script src="/asyncapi-docs.js"></script>
</body>
</html>`;

  return html;
}

function formatPayload(payload) {
  if (payload.description && payload.description.includes('Empty')) {
    return '// Empty payload\n{}';
  }

  if (payload.example) {
    return payload.example.trim();
  }

  // Generate example from properties
  const example = {};
  if (payload.properties) {
    Object.entries(payload.properties).forEach(([key, prop]) => {
      if (prop.example !== undefined) {
        example[key] = prop.example;
      } else if (prop.type === 'string') {
        if (prop.format === 'uuid') {
          example[key] = 'uuid';
        } else if (prop.enum) {
          example[key] = prop.enum.join(' | ');
        } else {
          example[key] = 'string';
        }
      } else if (prop.type === 'integer') {
        example[key] = prop.example || 0;
      } else if (prop.type === 'array') {
        example[key] = prop.example || '...';
      } else if (prop.type === 'object') {
        example[key] = '...';
      }
    });
  }

  return JSON.stringify(example, null, 2);
}

module.exports = { loadWebSocketDocs, generateHTML };
