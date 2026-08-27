// 极简静态文件服务器：node serve.mjs <目录> [端口]
// 用于本地预览 Cocos web-mobile 构建产物（无任何依赖）
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';

const root = resolve(process.argv[2] || process.cwd());
const port = Number(process.argv[3] || 7456);

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.bin': 'application/octet-stream',
    '.pvr': 'application/octet-stream',
    '.astc': 'application/octet-stream',
    '.plist': 'application/xml',
    '.atlas': 'text/plain; charset=utf-8',
    '.skel': 'application/octet-stream',
    '.ico': 'image/x-icon',
    '.map': 'application/json',
    '.wasm': 'application/wasm',
};

http.createServer((req, res) => {
    try {
        let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        if (urlPath.endsWith('/')) urlPath += 'index.html';
        const filePath = join(root, urlPath);
        if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
            res.writeHead(404).end('404 Not Found: ' + urlPath);
            return;
        }
        res.writeHead(200, {
            'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-cache',
        });
        createReadStream(filePath).pipe(res);
    } catch (err) {
        res.writeHead(500).end('500 ' + String(err));
    }
}).listen(port, '127.0.0.1', () => {
    console.log(`serving ${root} at http://127.0.0.1:${port}`);
});
