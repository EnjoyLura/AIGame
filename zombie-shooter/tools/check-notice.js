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

// 2. HomeUi 接线（公告条跑马灯已下线：形态改为顶栏公告按钮 _homeNoticeBtn + 分类弹窗 _openNoticeModal）
ok('import NoticeSystem', /import \{ NoticeSystem, NOTICE_DEFS, NOTICE_KIND_NAMES \} from '\.\.\/core\/NoticeData';/.test(ui));
ok('_build 经顶栏挂公告入口', /this\._buildTopbar\(root\);/.test(ui) && /className = 'tinyIcon homeNoticeBtn'/.test(ui));
ok('_refreshAll 经 _refreshTop 刷公告', /protected _refreshAll\(\): void \{[\s\S]{0,40}this\._refreshTop\(\);/.test(ui));
ok('顶栏公告按钮红点由未读驱动', /this\._homeNoticeBtn\?\.classList\.toggle\('unread', NoticeSystem\.instance\.hasUnread\(\)\);/.test(ui));
ok('弹窗打开即 markAllRead', /_openNoticeModal\([^)]*\): void \{[\s\S]{0,40}NoticeSystem\.instance\.markAllRead\(\);/.test(ui));
ok('弹窗倒序渲染(新→旧)', /\.sort\(\(a, b\) => b\.id - a\.id\)/.test(ui));
ok('弹窗按分类页签过滤', /tabs: filters\.map\(f => f\.label\)/.test(ui) && /\.filter\(n => !cur\.kind \|\| n\.kind === cur\.kind\)/.test(ui));
ok('类型按 kind 分图标+tag', /tag: NOTICE_KIND_NAMES\[n\.kind\]/.test(ui) && /n\.kind === 'update' \? '🛠' : n\.kind === 'activity' \? '🎉' : '📢'/.test(ui));
ok('正文按换行分段(就地展开)', /for \(const line of n\.body\.split\('\\n'\)\)/.test(ui));
ok('自动弹：未读+会话一次+弹窗让路',
  /NoticeSystem\.instance\.hasUnread\(\) && !this\._autoNoticeShown/.test(ui) &&
  /!document\.querySelector\('#homeUi \.protoMask'\)/.test(ui) &&
  /protected _autoNoticeShown = false;/.test(ui));

// 3. 公告弹窗样式两层（.noticeBar/.noticeText/.nRed/noticeScroll 走马灯 CSS 已随公告条下线删除）
ok('公告弹窗样式两层', (ui.match(/#homeUi \.noticeBox \.nItem \{[^}]*\}/g) || []).length >= 2);

process.exit(fail ? 1 : 0);
