import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const profilePath = join(root, 'profiles', process.env.LEXIGRAPH_PROFILE ?? 'default.json');
const port = Number(process.env.PORT ?? 4173);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json' };
await mkdir(join(root, 'profiles'), { recursive: true });

async function profile() {
  try { return await readFile(profilePath, 'utf8'); }
  catch { return JSON.stringify({ version: 2, state: { reviews:{}, mistakes:[], history:[] } }); }
}

createServer(async (request, response) => {
  try {
    if (request.url === '/api/mode') return send(response, 200, '{"mode":"local-file"}', 'application/json');
    if (request.url === '/api/profile' && request.method === 'GET') return send(response, 200, await profile(), 'application/json');
    if (request.url === '/api/profile' && request.method === 'PUT') {
      let body = '';
      for await (const chunk of request) body += chunk;
      const parsed = JSON.parse(body);
      await writeFile(profilePath, JSON.stringify(parsed, null, 2) + '\n');
      return send(response, 204, '');
    }
    const cleanUrl = request.url.replace(/^\/lexigraph\/?/, '/');
    const urlPath = cleanUrl === '/' ? 'index.html' : cleanUrl.replace(/^\//, '');
    const safe = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
    const file = join(root, 'dist', safe);
    try { return send(response, 200, await readFile(file), types[extname(file)] ?? 'application/octet-stream'); }
    catch { return send(response, 200, await readFile(join(root, 'dist', 'index.html')), 'text/html; charset=utf-8'); }
  } catch (error) {
    send(response, 400, JSON.stringify({ error: String(error) }), 'application/json');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Lexigraph local mode: http://127.0.0.1:${port}`);
  console.log(`Profile: ${profilePath}`);
});

function send(response, status, body, type = 'text/plain; charset=utf-8') {
  response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  response.end(body);
}
