import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

type AsyncApiEvent = {
  direction?: string;
  summary?: string;
  description?: string;
  payload?: {
    description?: string;
    example?: string;
    properties?: Record<string, Record<string, unknown>>;
  };
  responses?: Array<{
    event: string;
    description: string;
  }>;
};

type AsyncApiSection = {
  title: string;
  description: string;
  flow?: {
    title: string;
    steps: string[];
  };
  events?: Record<string, AsyncApiEvent>;
  errorCodes?: Array<{
    code: string;
    description: string;
  }>;
  rooms?: Array<{
    name: string;
    description: string;
  }>;
  timeouts?: Array<{
    name?: string;
    value?: string;
    note?: string;
  }>;
};

function loadYaml(filename: string): Record<string, unknown> {
  const docsPath = path.join(__dirname, 'websocket', filename);
  return (yaml.load(fs.readFileSync(docsPath, 'utf8')) || {}) as Record<string, unknown>;
}

export function loadWebSocketDocs(): AsyncApiSection[] {
  const authDoc = loadYaml('authentication.yaml');
  const matchmakingDoc = loadYaml('matchmaking.yaml');
  const gameplayDoc = loadYaml('gameplay.yaml');
  const errorsDoc = loadYaml('errors.yaml');
  const infoDoc = loadYaml('info.yaml');

  return [
    {
      title: 'Authentication',
      description: 'WebSocket connection authentication',
      events: authDoc.events as Record<string, AsyncApiEvent>,
    },
    {
      title: 'Matchmaking',
      description: 'Queue management and match finding',
      flow: matchmakingDoc.flow as AsyncApiSection['flow'],
      events: matchmakingDoc.events as Record<string, AsyncApiEvent>,
    },
    {
      title: 'Gameplay',
      description: 'Game moves and state management',
      flow: gameplayDoc.flow as AsyncApiSection['flow'],
      events: gameplayDoc.events as Record<string, AsyncApiEvent>,
    },
    {
      title: 'Error Handling',
      description: 'Error events and codes',
      events: errorsDoc.events as Record<string, AsyncApiEvent>,
      errorCodes: errorsDoc.errorCodes as AsyncApiSection['errorCodes'],
    },
    {
      title: 'Rooms & Timeouts',
      description: 'Connection rooms and timeout information',
      rooms: infoDoc.rooms as AsyncApiSection['rooms'],
      timeouts: infoDoc.timeouts as AsyncApiSection['timeouts'],
    },
  ];
}

function formatPayload(payload: AsyncApiEvent['payload']): string {
  if (!payload) {
    return '';
  }

  if (payload.description && payload.description.includes('Empty')) {
    return '// Empty payload\n{}';
  }

  if (payload.example) {
    return payload.example.trim();
  }

  const example: Record<string, unknown> = {};
  const properties = payload.properties || {};
  for (const [key, prop] of Object.entries(properties)) {
    if (prop.example !== undefined) {
      example[key] = prop.example;
    } else if (prop.type === 'string') {
      if (prop.format === 'uuid') {
        example[key] = 'uuid';
      } else if (Array.isArray(prop.enum)) {
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
  }

  return JSON.stringify(example, null, 2);
}

export function generateHtml(sections: AsyncApiSection[], serverUrl: string): string {
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
            <h1>Tic-Tac-Toe WebSocket API <span class="version">v1.1.0</span></h1>
            <div class="description">Real-time Socket.IO events for matchmaking and gameplay</div>
        </div>

        <div class="servers">
            <strong>Server:</strong>
            <select>
                <option value="${serverUrl}">${serverUrl} - Development server</option>
            </select>
        </div>

        <div class="main-content">`;

  for (const section of sections) {
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

    if (section.flow) {
      html += `
                    <div class="flow-diagram">
                        <div class="flow-title">${section.flow.title}:</div>`;
      for (const step of section.flow.steps) {
        html += `
                        <div class="flow-step">${step}</div>`;
      }
      html += `
                    </div>`;
    }

    if (section.events) {
      for (const [eventName, event] of Object.entries(section.events)) {
        const direction = event.direction === 'send' ? 'send' : 'receive';
        const methodBadge = event.direction === 'send' ? 'method-send' : 'method-receive';
        const methodText = event.direction === 'send' ? 'SEND' : 'RECEIVE';

        html += `
                    <div class="operation ${direction}">
                        <div class="operation-header collapsible">
                            <span class="method-badge ${methodBadge}">${methodText}</span>
                            <span class="operation-path">${eventName}</span>
                            <span class="operation-summary">${event.summary || ''}</span>
                        </div>
                        <div class="operation-details">
                            <div class="operation-content">
                                <div class="description">
                                    ${event.description || ''}
                                </div>`;

        if (event.payload) {
          const payloadTitle = event.direction === 'send' ? 'Request Payload' : 'Response Payload';
          html += `
                                <div class="section-title">${payloadTitle}</div>
                                <div class="payload-example">${formatPayload(event.payload)}</div>`;
        }

        if (event.responses) {
          html += `
                                <div class="section-title">Responses</div>
                                <div class="responses">`;
          for (const response of event.responses) {
            html += `
                                    <div class="response-item"><strong>${response.event}</strong> - ${response.description}</div>`;
          }
          html += `
                                </div>`;
        }

        html += `
                            </div>
                        </div>
                    </div>`;
      }
    }

    if (section.errorCodes) {
      html += `
                    <div class="operation-content">
                        <div class="section-title">Error Codes</div>
                        <div class="error-codes">`;
      for (const error of section.errorCodes) {
        html += `
                            <div class="error-code">
                                <div class="error-code-name">${error.code}</div>
                                ${error.description}
                            </div>`;
      }
      html += `
                        </div>
                    </div>`;
    }

    if (section.rooms) {
      html += `
                    <div class="operation-content">
                        <div class="section-title">Rooms</div>
                        <div class="rooms-info">`;
      for (const room of section.rooms) {
        html += `
                            <div class="room-item">
                                <span class="room-name">${room.name}</span> - ${room.description}
                            </div>`;
      }
      html += `
                        </div>`;
    }

    if (section.timeouts) {
      html += `
                        <div class="section-title">Timeouts</div>
                        <div class="timeout-info">`;
      for (const timeout of section.timeouts) {
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
      }
      html += `
                        </div>
                    </div>`;
    }

    html += `
                </div>
            </div>`;
  }

  html += `
        </div>
    </div>

    <script src="/asyncapi-docs.js"></script>
</body>
</html>`;

  return html;
}
