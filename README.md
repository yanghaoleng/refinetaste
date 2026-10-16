# 设计积累 · RefineTaste

把「感觉不对」变成说得清的设计判断。面向运营与设计协作的中文审美练习网站。

- 网站：https://mikeywa.site/refinetaste/
- 统计后台：https://mikeywa.site/refinetaste/data/

## 学习内容

8 个原创教学练习：名片四原则（对比、重复、亲密、对齐）、资源位调性、优惠信息层级、用户路径、协作反馈。选择后解释理由，支持课程预设追问、本机笔记与文本导出。响应式布局、系统明暗主题、减少动态效果。

业务案例均为教学模拟，基础概念采用《写给大家看的设计书》四原则；案例与讲解并非书中原文或插图。尚未接入语言模型。后续接入模型需要服务端代理，禁止在静态页面放 API 密钥。

## 运行

仅看前端：`python3 -m http.server 5173 --directory dist`。

完整站点使用 Python 3.10+，无需安装第三方依赖。设置环境变量后运行 `python3 server/app.py`，访问 `http://localhost:8797/refinetaste/`。生产访问码只配置在服务器环境中，不包含在公开源码。

| 变量 | 含义 |
| --- | --- |
| `REFINETASTE_SECRET` | 至少 32 字符的随机 HMAC 密钥 |
| `REFINETASTE_PIN_SHA256` | 自选六位数字访问码的 SHA-256 |
| `REFINETASTE_DB` | SQLite 文件绝对路径，默认 `.runtime/analytics.sqlite3` |
| `REFINETASTE_ORIGINS` | 逗号分隔的允许来源，本地开发加入 `http://localhost:8797` |
| `PORT` | 仅监听 127.0.0.1，默认 8797 |

环境文件不入库。参考 `.env.example`。服务不会自动加载本地 `.env`；通过 shell 或 systemd 注入。

## 数据口径

匿名事件从接入后开始累计，不回填旧站记录。访客随机 ID 经服务端 HMAC 后保存，匿名访客数不等于真实人数。换设备、清空存储会重复计数；脚本拦截或网络错误会漏计。

- 访问：页面打开次数。
- 练习启动：每次进入或重新练习，创建新轮次。
- 首次答题：每轮每题只计第一次提交。
- 完成：提交该入口剩余全部题目并到达回顾。入口 1 / 5 / 7 分别需要 8 / 4 / 2 题。
- 期间完成率：所选期间启动的轮次中，已完成轮次 / 启动轮次，按启动日归属。跨期开始的旧轮次不纳入本期练习分析。
- 保存笔记：只计操作，不上传正文。

时区 `Asia/Shanghai`，支持 7 / 30 / 90 个自然日（含今日）。事件滚动保留 90 天，仅在收到事件时执行过期清理。历史覆盖不足时不构造环比。后台返回汇总，不提供原始事件、个人轨迹、IP 或 UA。

`?qa=1` 开启当前标签页的 QA 模式，排除统计；`?qa=0` 恢复采集。

## 接口与权限

- `GET /refinetaste/api/health`：服务与存储检查。
- `POST /refinetaste/api/collect`：来源校验、体积限制、节流、事件白名单与去重。
- `POST /refinetaste/api/login`：服务端验证访问码，5 次失败后限流 5 分钟。
- `GET /refinetaste/api/summary?days=7`：需要有效服务端会话。
- `POST /refinetaste/api/logout`：失效当前会话。

管理 cookie 使用 HttpOnly / Secure / SameSite=Strict，无持久化过期属性，服务端最长 8 小时有效，重启服务使会话失效。登录与采集的临时限流键使用 IP 的 HMAC，仅留内存；应用不记录请求日志，Nginx 本路径访问日志关闭。六位码适用于小规模汇总看板，未实现多用户账号。匿名事件可由浏览器伪造，不应用于审计或人员考核。

## 部署

`ops/refinetaste.service` 使用 systemd DynamicUser 与独立 StateDirectory。发布到 `/opt/refinetaste/releases/<release>`，`current` 软链接原子切换；数据库在 `/var/lib/refinetaste/`，环境配置在 `/etc/refinetaste.env`，均在发布目录之外。Nginx 在既有站点引入 `ops/nginx-refinetaste.conf`，只路由 `/refinetaste`，不修改其他应用路径。核验 `nginx -T` 的实际启用入口；本次主站的 `/etc/nginx/sites-enabled/mikeywa.site` 为独立文件，并非指向 sites-available 的软链接，不能只编辑后者。

更新时先测试、提交、推送，再上传版本，验证服务、Nginx 配置、授权/未授权接口与前端资源。回滚切换 `current` 至上一个目录并重启服务。本版 schema 向后兼容，勿删除数据目录。备份可使用 SQLite backup API，在服务器单独管理，不上传公开仓库。

## 验证

```sh
python3 -m unittest discover -s tests -v
node --check dist/app.js
node --check dist/analytics.js
node --check dist/data/admin.js
git diff --check
```

测试使用隔离临时数据库，覆盖首次提交去重、完成校验、不同章节入口、时间窗口/上海日界线、隐私字段、空数据、来源限制、未授权访问、登录节流与退出失效。

## 品牌与图标

品牌头像为内置 imagegen 生成的叫叫小鸡金丝眼镜同人眼部特写，原图与 WebP/PNG/ICO 派生资源位于 `dist/assets/`，生成提示词见 `design/brand-icon-prompt.md`。

界面图标统一使用 [Iconoir](https://iconoir.com/) 7.12.1 官方 regular SVG，统一 2.5px 线宽；源码子集和 MIT 授权位于 `vendor/iconoir/`，通过 `python3 scripts/build-icons.py` 生成自托管 `dist/icons.svg`。不依赖外部 CDN。图表路径属于数据可视化，并非界面图标。

色彩以叫叫官网 CSS 中的黄色 `#ffdc00` 和深棕 `#260f00` 为参考，默认浅色背景，主要按钮使用深棕；保留手动切换主题。课程、案例、按钮与统计图表使用同一套色彩变量。
