/* 临时 typecheck 脚本（用 Cocos 内置 TypeScript，noEmit） */
const ts = require('C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/typescript.js');
const cfg = ts.readConfigFile('tsconfig.json', ts.sys.readFile).config;
const parsed = ts.parseJsonConfigFileContent(cfg, ts.sys, '.');
const prog = ts.createProgram(parsed.fileNames, parsed.options);
const diags = ts.getPreEmitDiagnostics(prog);
const byFile = {};
for (const d of diags) {
    const f = d.file ? d.file.fileName.split('\\').join('/') : 'global';
    byFile[f] = (byFile[f] || 0) + 1;
    if (d.file && /assets\/scripts/.test(f)) {
        const pos = d.file.getLineAndCharacterOfPosition(d.start);
        console.log(`${f}:${pos.line + 1}:${pos.character + 1} TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
    }
}
console.log('--- totals per file ---');
for (const f of Object.keys(byFile)) {
    console.log(f, byFile[f]);
}
console.log('TOTAL', diags.length);
