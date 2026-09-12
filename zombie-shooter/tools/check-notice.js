// 公告功能断言：数据/系统/接线/红点/自动弹/两层 CSS
const fs = require('fs');
let fail = 0;
const ok = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) fail++; };

const notice = fs.readFileSync('assets/scripts/core/NoticeData.ts', 'utf8');
// HomeUi 拆分后按继承链 8 文件拼接检查
const UI_FILES = ['HomeUi.ts', 'HomeUiCore.ts', 'HomeUiMall.ts', 'HomeUiHeroes.ts', 'HomeUiStage.ts', 'HomeUiPlay.ts', 'HomeUiBase.ts', 'HomeUiStyle.ts'];
const ui = UI_FILES.map((f) => fs.readFileSync('assets/scripts/ui/' + f, 'utf8')).join('\n');

// 1. 数据与系统
ok('NOTICE_DEFS 三条公告', (notice.match(/    \{\s*\n        id: \d,/g) || []).length >= 3);
ok('公告 id 递增(3>2>1)', /id: 3,[\s\S]*id: 2,[\s\S]*id: 1,/.test(notice));
ok('latest() 取最大 id', /NOTICE_DEFS\.reduce\(\(a, b\) => \(b\.id > a\.id \? b : a\)/.test(notice));
ok('hasUnread 口径 lastReadId', /_lastReadId < this\.latest\(\)\.id/.test(notice));
ok('markAllRead 持久化', /markAllRead\(\)[\s\S]{0,300}this\._save\(\)/.test(notice));
ok('_load 白名单钳制坏值', /Math\.min\(Math\.max\(0, Math\.floor\(d\.lastReadId\)\), this\.latest\(\)\.id\)/.test(notice));
ok('坏档 try/catch 兜底', /_load\(\): void \{[\s\S]{0,600}\} catch \{/.test(notice));
ok('sys undefined 守卫', (notice.match(/typeof sys === 'undefined'/g) || []).length >= 2);
ok('独立存档键', /SAVE_KEY = 'zombie-shooter-notice'/.test(notice));

// 2. HomeUi 接线
ok('import NoticeSystem', /import \{ NoticeSystem, NOTICE_DEFS, NOTICE_KIND_NAMES \} from '\.\.\/core\/NoticeData';/.test(ui));
ok('_build 挂公告条', /this\._buildTopbar\(root\);\s*\n\s*this\._buildNoticeBar\(root\);/.test(ui));
ok('_refreshAll 刷公告条', /this\._refreshBase\(\);\s*\n\s*this\._refreshNoticeBar\(\);/.test(ui));
ok('公告条走马灯只滚未读公告', /for \(const n of NoticeSystem\.instance\.unreadList\(\)\)/.test(ui));
ok('公告条红点未读点亮', /_noticeRedEl\.classList\.toggle\('on', NoticeSystem\.instance\.hasUnread\(\)\)/.test(ui));
ok('弹窗打开即 markAllRead', /_openNoticeModal\(\): void \{\s*\n\s*NoticeSystem\.instance\.markAllRead\(\);/.test(ui));
ok('弹窗倒序渲染(新→旧)', /for \(let i = NOTICE_DEFS\.length - 1; i >= 0; i--\)/.test(ui));
ok('类型 tag 分色', /n\.kind === 'update' \? 'g' : n\.kind === 'activity' \? 'p' : 'b'/.test(ui));
ok('正文 pre-line 分段', /body\.textContent = n\.body;/.test(ui));
ok('自动弹：未读+会话一次+弹窗让路',
  /NoticeSystem\.instance\.hasUnread\(\) && !this\._autoNoticeShown/.test(ui) &&
  /!document\.querySelector\('#homeUi \.protoMask'\)/.test(ui) &&
  /protected _autoNoticeShown = false;/.test(ui));

// 3. 两层 CSS
ok('noticeBar base 层(--hs)', /#homeUi \.noticeBar \{[^}]*--hs,1/.test(ui));
ok('noticeBar 青瓷层(--pw)', /#homeUi \.noticeBar \{[^}]*--pw,2\.5/.test(ui));
ok('跑马灯 keyframes 定义', /@keyframes noticeScroll \{ to \{ transform: translateX\(-100%\); \} \}/.test(ui));
ok('青瓷层白名单后重声明动画', /#homeUi \.actChest\.ready \.acIc \{ animation: huiChest \.9s ease-in-out infinite; \}\s*\n[^@]*?#homeUi \.noticeText \{ animation: noticeScroll 16s linear infinite; \}/.test(ui));
ok('noticeText 两层声明', (ui.match(/#homeUi \.noticeText \{[^}]*\}/g) || []).length >= 3);
ok('nRed 红点两层', (ui.match(/#homeUi \.noticeBar \.nRed \{[^}]*\}/g) || []).length >= 2);
ok('公告弹窗样式两层', (ui.match(/#homeUi \.noticeBox \.nItem \{[^}]*\}/g) || []).length >= 2);

process.exit(fail ? 1 : 0);
