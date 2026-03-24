const {
  loadWebSocketDocs,
  generateHTML,
} = require('../../src/docs/asyncapi-generator');

describe('asyncapi smoke', () => {
  it('loads websocket docs and generates HTML', () => {
    const sections = loadWebSocketDocs();
    const html = generateHTML(sections);

    expect(sections.length).toBeGreaterThan(0);
    expect(html).toContain('Tic-Tac-Toe WebSocket API');
  });
});
