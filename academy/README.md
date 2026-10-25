# 独立学习课堂

独立课堂复用 JOJO 设计班当前的静态前端与标准库服务端，分别维护内容、品牌、首页装饰、请求路径、Cookie、匿名身份、数据库、后台密钥和服务进程。构建输出位于忽略的 `.runtime/academies/`，生产使用从已提交 Git 快照生成的自包含发布包。

- 哲学：https://mikeywa.site/philosophy/ ，8 章 64 题，32 道比较判断和 32 道对话练习。
- 自媒体：https://mikeywa.site/mediaclass/ ，12 章 96 题，48 道比较判断和 48 道制作实作。
- 自我照顾：https://mikeywa.site/lifecoach/ （兼容 `/selfcare/`），11 章，首章连续会谈与可修改探索报告，后续 40 道比较判断、40 道开放练习（旧首章八题记录保留），课程与来源详见 [RURU人生教练](selfcare/README.md)。
- 设计：https://mikeywa.site/refinetaste/ 。
- 音乐：https://m.mikeywa.site/pianoclass/ ，李老师的音乐班，原有工具与课程继续独立。

五个首页在“用户隐私协议”左侧放置同等弱化的“更多课程”按钮，悬停、键盘聚焦或点击可展开小面板。面板内使用原生 `<a href>` 推荐另外四个站；支持再次点击、外部点击与 Escape 关闭，不读取其他站的学习记录。旧的大块推荐区已移除。

## 课程

哲学：把问题问清楚；理由怎样支撑结论；我们凭什么知道；自我、选择与责任；面对道德两难；公正与共同生活；从中国哲学进入日常；意义、审美与认真对话。比较题检查论证方法，开放题按是否回应问题、理由与反例判断，不按宗教、政治、人生立场或所选学派判分，结果页明确说明。例子、措辞与案例卡均为原创，没有复制来源条目、教材原题或原图。

自媒体：基础策略与受众；IP 塑造与定位；账号点子、发散与选题库；栏目、脚本与制作组织；拍摄基础；口播；访谈；教程、演示与测评；Vlog、纪实与人物故事；剪辑、字幕、声音与节奏；封面、标题与平台发布；复盘、协作与长期运营。每章分别给出具体制作任务、资源约束、参考思路与讨论要求。不保证流量、收入或算法效果，不把某个平台某阶段的技巧视为通用规则。

首页装饰为原生文字、纸张与排版，案例为可读的思想实验、脚本、制作记录与生活情境，未用 SVG 新绘人物或场景。哲学、自媒体使用像素角色，RURU人生教练按用户选择使用毛毡肉桂小太阳鹦鹉「小满」，各有十八种位图表情。当前不录制或上传声音和视频，不声称 AI 能看见未提交的成片；制作题依据文字与题设点评。

## 编写与运行

- 内容源：`build_philosophy.py`、`build_mediaclass.py`、`build_selfcare.py` 与 `course_common.py`。生成的各站 `course.json` 也入库，供审阅。
- 重建：`python3 academy/build_philosophy.py`、`python3 academy/build_mediaclass.py`、`python3 scripts/build-academies.py`。
- 本地哲学：`python3 scripts/dev-academies.py philosophy`，打开 `http://localhost:8843/philosophy/`。
- 本地 RURU：`python3 scripts/dev-academies.py selfcare`，打开 `http://localhost:8845/lifecoach/`。
- 本地自媒体：`python3 scripts/dev-academies.py mediaclass`，打开 `http://localhost:8844/mediaclass/`。
- 可选 `--ai-env /绝对路径/私有配置文件` 只读 AI 提供商字段；不复制其他站的身份密钥、管理密码或用户数据。无模型配置时明确显示真实不可用状态，不伪造评分。
- `?qa=1` 关闭行为采集，用于浏览器验收。真实 AI 联调应直接调用独立教练模块，避免写入正式用户对话与完成数据。
- 测试：`node --test tests/*.test.cjs` 和 `python3 -m unittest discover -s tests -v`。

## 发布与恢复

每次提交前先 pull。提交推送后按站点运行 `sh ops/academy/deploy.sh philosophy`、`sh ops/academy/deploy.sh mediaclass` 或 `sh ops/academy/deploy.sh selfcare`。脚本从 HEAD 快照构建，保留本地其他未提交改动，并原子切换版本目录。独立服务分别监听 8843、8844、8845，Nginx 在既有设计班路由旁只增加对应路径。

数据库位于 `/var/lib/<站点>/analytics.sqlite3`，私有环境在 `/etc/<站点>.env`。首次仅复用已授权 AI 提供商配置，新建 HMAC 密钥与后台访问码；访问码保存在权限 0600 的 `/etc/<站点>-access.json`，不输出、不入库。版本日志位于 `/opt/<站点>/releases.log`。健康或路由检查失败恢复原版本；Nginx 修改前备份并在失败时恢复。后续回滚只切换 current 并重启独立服务，数据库保留。

音乐站仅修改首页推荐与静态文件路由；在音乐仓库提交推送后使用其既有 `lilaoshi/ops/deploy.sh` 发布。设计班同样保留原题库和数据库，仅更新推荐入口。

## 参考与边界

核验日期：2026-10-24。题目使用通行概念和原创情境，以下为继续阅读入口，不把来源文章整段注入教练。每道题提供对应参考链接。

哲学参考 Stanford Encyclopedia of Philosophy 的 [Critical Thinking](https://plato.stanford.edu/entries/critical-thinking/)、[Classical Logic](https://plato.stanford.edu/entries/logic-classical/)、[Epistemology](https://plato.stanford.edu/entries/epistemology/)、[Personal Identity](https://plato.stanford.edu/entries/identity-personal/)、[Free Will](https://plato.stanford.edu/entries/freewill/)、[Virtue Ethics](https://plato.stanford.edu/entries/ethics-virtue/)、[Deontological Ethics](https://plato.stanford.edu/entries/ethics-deontological/)、[Consequentialism](https://plato.stanford.edu/entries/consequentialism/)、[Distributive Justice](https://plato.stanford.edu/entries/justice-distributive/)、[Confucius](https://plato.stanford.edu/entries/confucius/)、[Daoism](https://plato.stanford.edu/entries/daoism/)、[Beauty](https://plato.stanford.edu/entries/beauty/) 与 [The Meaning of Life](https://plato.stanford.edu/entries/life-meaning/)。争议概念不写成公认终局答案，传统内部解释差异在题目中明确保留。

制作参考 [BBC Academy：Self Shooting](https://downloads.bbc.co.uk/academy/collegeofproduction/docs/self_shooting_ts.pdf)、[BBC Academy：Interviewing](https://downloads.bbc.co.uk/academy/collegeofproduction/docs/interviewing_ts.pdf)、[YouTube 官方内容策略与品牌课程](https://news.youtube/get-started/)、[观众留存](https://support.google.com/youtube/answer/9314415?hl=zh-Hans)、[缩略图](https://support.google.com/youtube/answer/72431?hl=zh-Hans)、[字幕](https://support.google.com/youtube/answer/2734796?hl=zh-Hans)、[合作披露](https://support.google.com/youtube/answer/154235?hl=zh-Hans)、[TikTok Creative Codes](https://ads.tiktok.com/business/en/creative-codes) 与[小红书官方种草学](https://xue.xiaohongshu.com/)。不复刻平台素材；不同地区和平台的具体合规与发布设置需核对当期官方要求，课程不编造固定流量阈值。

2026-10-24：新增课程的独立名字与像素角色第一稿见 [形象与命名](identity/README.md)。已按用户确认同步应用到在线名称、首页、教练表情与图标。
