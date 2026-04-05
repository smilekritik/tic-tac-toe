import { generateHtml, loadWebSocketDocs } from '../../src/docs/asyncapi-generator';

describe('asyncapi smoke', () => {
  it('loads websocket docs and generates html', () => {
    const sections = loadWebSocketDocs();
    const html = generateHtml(sections, 'ws://localhost:5001');

    expect(sections.length).toBeGreaterThan(0);
    expect(html).toContain('Tic-Tac-Toe WebSocket API');
    expect(html).toContain('matchmaking:join');
    expect(html).toContain('game:move');
  });
});
