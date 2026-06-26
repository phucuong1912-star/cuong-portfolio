const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 4177);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  const cleanUrl = decodeURIComponent((req.url || '/').split('?')[0]);
  const relativePath = cleanUrl === '/' ? 'index.html' : cleanUrl.replace(/^\//, '');
  const filePath = path.join(root, relativePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403, { 'content-type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'content-type': mime[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(port, '127.0.0.1');
