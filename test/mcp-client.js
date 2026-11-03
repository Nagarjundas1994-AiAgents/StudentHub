// Minimal JSON-RPC client for the stateless Streamable HTTP MCP endpoints.
export function mcpClient(POST, [username, password]) {
  const opts = {
    auth: { username, password },
    headers: { Accept: 'application/json, text/event-stream' }
  };
  let nextId = 1;

  async function rpc(url, method, params) {
    const res = await POST(url, { jsonrpc: '2.0', id: nextId++, method, params }, opts);

    // The endpoint speaks SSE; the test client exposes the raw stream as res.text.
    const text = typeof res.text === 'function' ? await res.text() : String(res.text ?? '');
    if (!text) return res.data;
    const line = text.split(/\r?\n/).find(l => l.startsWith('data: '));
    return JSON.parse(line ? line.slice('data: '.length) : text);
  }

  return {
    rpc,
    async tools(url) {
      return (await rpc(url, 'tools/list', {})).result.tools;
    },
    async call(url, action, parameters = {}) {
      return rpc(url, 'tools/call', { name: 'call', arguments: { action, parameters } });
    }
  };
}
