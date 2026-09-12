// 走马灯断言：多消息轮播队列/animationiteration 换条/点击分发/事件即时上屏
const fs = require('fs');
let fail = 0;
const ok = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) fail++; };
const core = fs.readFileSync('assets/scripts/ui/HomeUiCore.ts', 'utf8');

// 1. 轮播队列：公告全量 + 动态消息
ok('队列含公告全量(新→旧排序)', /\[\.\.\.NOTICE_DEFS\]\.sort\(\(a, b\) => b\.id - a\.id\)/.test(core));
ok('公告消息 tap=notice', /tap: 'notice' \}\);/.test(core));
ok('动态消息：新邮件', /hasUnread\(\)[\s\S]{0,200}邮箱有未读邮件/.test(core));
ok('动态消息：远征归来', /ExpeditionSystem\.instance\.hasClaimable\(\)[\s\S]{0,200}远征队伍归来/.test(core));
ok('动态消息：今日签到', /canClaimToday\(\)[\s\S]{0,200}今日签到奖励待领取/.test(core));
ok('动态消息：任务成就', /QuestSystem\.instance\.hasClaimable\(\)[\s\S]{0,200}有任务\/成就奖励/.test(core));
ok('动态消息：体力已满', /gm\.stamina\(\) >= gm\.staminaMax\(\)[\s\S]{0,200}体力已满，立即出战/.test(core));
ok('队列空兜底最新公告', /q\.length === 0[\s\S]{0,300}notices\[0\]/.test(core));

// 2. 轮换机制
ok('animationiteration 换条', /animationiteration[\s\S]{0,120}_advanceTicker\(\)/.test(core));
ok('游标循环取模', /q\[this\._tickerIdx % q\.length\]/.test(core));
ok('推进时重建队列吸收事件', /_advanceTicker\(\): void \{[\s\S]{0,200}_refreshNoticeBar\(\);/.test(core));
ok('文案双拼无缝循环', /cur\.text \+ '　　' \+ cur\.text \+ '　　'/.test(core));

// 3. 点击分发
ok('点击按消息类型分发', /_tickerTap === 'mail'[\s\S]{0,200}_openMailModal\(\)/.test(core));
ok('远征/玩法消息切玩法页', /_tickerTap === 'expedition' \|\| this\._tickerTap === 'play'[\s\S]{0,200}_switchPage\('play'\)/.test(core));
ok('体力消息切出战页', /_tickerTap === 'battle'[\s\S]{0,200}_switchPage\('battle'\)/.test(core));

// 4. 事件即时上屏
ok('MAIL_NEW 即时切条', /GameEvent\.MAIL_NEW[\s\S]{0,400}_advanceTicker\(\);/.test(core));
ok('EXPEDITION_READY 即时切条', /GameEvent\.EXPEDITION_READY[\s\S]{0,300}_advanceTicker\(\);/.test(core));
ok('未读公告红点保留', /_noticeRedEl\.classList\.toggle\('on', NoticeSystem\.instance\.hasUnread\(\)\)/.test(core));

process.exit(fail ? 1 : 0);
