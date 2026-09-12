// 邮件活起来断言：时间维度/投放器/到达广播/一键领取/主城入口/两层 CSS
const fs = require('fs');
let fail = 0;
const ok = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) fail++; };
const read = (f) => fs.readFileSync(f, 'utf8');

const mail = read('assets/scripts/core/MailSystem.ts');
const cfg = read('assets/scripts/config/GameConfig.ts');
const hud = read('assets/scripts/ui/DomHud.ts');
const core = read('assets/scripts/ui/HomeUiCore.ts');
const style = read('assets/scripts/ui/HomeUiStyle.ts');

// 1. 数据模型：时间戳与有效期
ok('MailDef 带 ts/expireDays', /ts\?: number;/.test(mail) && /expireDays\?: number;/.test(mail));
ok('MailState 带 ts/expireAt', /ts: number;/.test(mail) && /expireAt: number;/.test(mail));
ok('expireAt=ts+天数×86400', /def\.ts && def\.expireDays \? def\.ts \+ def\.expireDays \* 86400 : 0/.test(mail));
ok('初始邮件无有效期(永久)', (mail.match(/expireDays:/g) || []).length >= 3 && /id: 'm_welcome',\s*\n\s*kind: 'notice',/.test(mail));
ok('mailTimeText 今天/昨天/N天前', /'今天'/.test(mail) && /'昨天'/.test(mail) && /天前`/.test(mail));
ok('mailExpiringSoon <24h', /m\.expireAt - now < 86400/.test(mail));

// 2. 过期清理与查询
ok('mails() 先惰性清理过期', /mails\(\): MailState\[\] \{\s*\n\s*this\._purgeExpired\(\);/.test(mail));
ok('过期删除含未领附件作废', /_purgeExpired\(\): void \{[\s\S]{0,800}delete this\._claimed\[id\];/.test(mail));
ok('unreadCount 存在', /unreadCount\(\): number \{/.test(mail));
ok('claimAll 返回领取封数', /claimAll\(\): number \{[\s\S]{0,300}return n;/.test(mail));

// 3. 投放与广播
ok('deliver 自动补投递时间', /deliver\(def: MailDef\): void \{[\s\S]{0,400}def\.ts = Math\.floor\(Date\.now\(\) \/ 1000\);/.test(mail));
ok('deliver 广播 MAIL_NEW', /eventCenter\.emit\(GameEvent\.MAIL_NEW, def\);/.test(mail));
ok('GameEvent.MAIL_NEW 注册', /MAIL_NEW = 'mail-new',/.test(cfg));
ok('章节贺电投放(每5关)', /STAGE_CLEAR[\s\S]{0,200}stageId % 5 === 0[\s\S]{0,300}m_chapter_\$\{stageId\}/.test(mail));
ok('无尽破纪录战报(≥10波)', /GAME_OVER[\s\S]{0,300}isEndless[\s\S]{0,200}wave >= 10[\s\S]{0,200}m_wave_\$\{wave\}/.test(mail));
ok('回归邮件(≥48h)', /_lastSeenTs > 0 && now - this\._lastSeenTs >= 48 \* 3600/.test(mail));
ok('每日运营邮件按天去重', /_lastDailyDay !== dayKey/.test(mail) && /m_daily_\$\{dayKey\}/.test(mail));
ok('每日轮换池 3 封', (mail.match(/id: `m_daily_\$\{dayKey\}`/g) || []).length === 3);
ok('运营邮件 3 天有效期', /\{ \.\.\.pool\[[^\]]+\], expireDays: 3 \}\)/.test(mail));
ok('投放状态持久化', /lastSeenTs: this\._lastSeenTs,/.test(mail) && /lastDailyDay: this\._lastDailyDay,/.test(mail));
ok('坏档白名单钳制', /typeof d\.lastSeenTs === 'number' && d\.lastSeenTs > 0/.test(mail));

// 4. DomHud 战斗页邮箱
ok('DomHud import 时间/过期工具', /import \{ MailSystem, MailState, mailTimeText, mailExpiringSoon \} from '\.\.\/core\/MailSystem';/.test(hud));
ok('列表一键领取(claimAll)', /mailClaimBar[\s\S]{0,600}ms\.claimAll\(\)/.test(hud));
ok('行内时间拼接', /mailTimeText\(m\.ts\)/.test(hud));
ok('过期黄色提醒 tag', /mailExpiringSoon\(m\)[\s\S]{0,200}⏳ 附件将过期/.test(hud));

// 5. 主城入口与弹窗
ok('顶栏邮箱按钮(齿轮前)', /homeMailBtn[\s\S]{0,300}_openMailModal\(\)/.test(core));
ok('Core import 邮件工具', /import \{ MailSystem, mailTimeText, mailExpiringSoon, MailDef \} from '\.\.\/core\/MailSystem';/.test(core));
ok('顶栏红点接 hasUnread', /_homeMailBtn\?\.classList\.toggle\('unread', MailSystem\.instance\.hasUnread\(\)\)/.test(core));
ok('show() 挂每日投放', /protected show\(\): void \{\s*\n\s*if \(this\._root\) \{\s*\n\s*\/\/ 每日\/回归邮件投放[\s\S]{0,200}feedDaily\(\);/.test(core));
ok('MAIL_NEW 到达 toast+红点', /eventCenter\.on\(GameEvent\.MAIL_NEW, \(def: MailDef\) => \{[\s\S]{0,400}新邮件[\s\S]{0,200}_refreshTop\(\);/.test(core));
ok('主城弹窗一键领取', /mailClaimAll[\s\S]{0,500}claimAll\(\)/.test(core));
ok('详情态 markRead + 返回列表', /_openMailModal\(\): void \{[\s\S]{0,900}ms\.markRead\(openId\);[\s\S]{0,2000}↩ 返回列表/.test(core));
ok('列表/详情两态就地重绘', /const render = \(openId: string \| null\): void => \{[\s\S]{0,300}if \(openId\) \{[\s\S]{0,6000}---- 列表态 ----/.test(core));
ok('详情附件区+过期警告', /mailDetailAttach[\s\S]{0,1200}mailExpiringSoon\(m\)[\s\S]{0,400}24 小时内过期/.test(core));
ok('删除邮件走系统接口', /ms\.remove\(openId\);/.test(core));

// 6. 两层 CSS（base --hs,1 + 青瓷 --pw,2.5）
for (const c of ['homeMailBtn', 'mailListRow', 'mTag', 'mailDetailAttach']) {
  ok(`CSS 两层: ${c}`, (style.match(new RegExp(`#homeUi \\.${c}[^{]*\\{[^}]*--hs,1`, 'g')) || []).length >= 1 &&
    (style.match(new RegExp(`#homeUi \\.${c}[^{]*\\{[^}]*--pw,2\\.5`, 'g')) || []).length >= 1);
}
ok('红点 unread 两层', /homeMailBtn\.unread::after \{ display: block; \}/.test(style) &&
  style.includes('#homeUi .homeMailBtn.unread::after') && /homeMailBtn::after \{ top: calc\(0px \* var\(--pw,2\.5\)\)/.test(style));

process.exit(fail ? 1 : 0);
