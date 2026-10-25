# RURU人生教练

面向成年人的日常学习课，10 章、80 道原创情境练习，每章 4 道比较判断与 4 道开放练习。入口为 `https://mikeywa.site/selfcare/`。命名按用户要求使用「RURU人生教练」，角色名小满，毛毡风格肉桂小太阳鹦鹉；不沿用其他课堂的角色。

## 课程顺序

1. 自我照顾，从看见需要开始：觉察需要、可行的小行动、资源约束、求助分工。
2. 睡眠、休息与恢复：睡眠机会、质量、休息安排、饮品与时段、持续困扰的专业支持。
3. 活动、饮食与日常健康：可及活动、减少久坐、多样饮食、身体信号与信息辨别。
4. 情绪、压力与温柔的边界：区分感受与推断、确认支持需要、拒绝、求助与支持地图。
5. 关系质量与日常连接：已有关系、具体邀请、独处、共同活动与社区参与。
6. 破圈，从一个真实问题开始：兴趣问题、跨领域视角、低门槛接触、经验与验证。
7. Coffee chat：邀约与准备：来由、问题、有限时长、时区、形式、改期、拒绝与适度跟进。
8. Coffee chat：倾听、追问与表达：经历问题、跟随追问、复述确认、沉默、轮流与自我介绍。
9. 差异、互惠与有分寸的交流：不懂就问、隐私、介绍同意、记录与传播、透明利益关系。
10. 结束、跟进与可持续探索：按时收尾、具体感谢、低成本尝试、学习笔记、轻量四周计划。

## 内容与判定

源文件为 `academy/build_selfcare.py`，复用 `course_common.py` 生成 `course.json`。题设、方案、参考思路与练习均为原创情境，没有复制书籍原题、原图或来源文章正文。每题的「参考阅读与练习说明」保留相关来源链接，来源是继续学习入口，不表示机构认可本课堂。

比较题在题设条件下判断方案；开放题只判断是否回应具体问题、给出可行行动和相关理由、尊重双方边界。独处、婉拒、线上交流、散步或暂缓探索可以是合理方案，不按外向程度、认识人数、身心状态、体型或健康结果评分。允许用虚构例子，不要求真实病史、姓名、联系方式或陌生人的隐私。

健康部分是成年人日常照顾与信息判断，不提供诊断、处方、药物调整或治疗方案。持续困扰或日常功能受到影响时引导寻求合适的专业帮助；日常自助不作为推迟求助的理由。Coffee chat不限于咖啡馆，也不限于求职；社区、兴趣、手艺与生活领域的交流均可。

## 来源核验

2026-10-24 核验以下官方资料与原研究。具体情境为作者据概念构造的教学练习，场景中的选择不是原研究直接验证过的个人处方。

- [NIMH：Caring for Your Mental Health](https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health)：自我照顾、个体差异、支持与专业求助。
- [CDC：About Sleep](https://www.cdc.gov/sleep/about/index.html)：睡眠时长与质量、日常习惯、持续问题的咨询。
- [WHO：Physical activity](https://www.who.int/news-room/fact-sheets/detail/physical-activity)：身体活动与日常生活、久坐。
- [WHO：Healthy diet](https://www.who.int/news-room/fact-sheets/detail/healthy-diet)：充足、平衡、适度与多样，结合个人和生活条件。
- [NIH：Physical Wellness Toolkit](https://www.nih.gov/health-information/your-healthiest-self-wellness-toolkits/physical-wellness-toolkit)：环境支持、现实目标与调整。
- [WHO：Doing What Matters in Times of Stress](https://www.who.int/publications/i/item/9789240003927)：日常压力应对的学习入口，页面提供中文版本。
- [NIH：Social Wellness Toolkit](https://www.nih.gov/health-information/your-healthiest-self-wellness-toolkits/social-wellness-toolkit)：参与社区、建立支持、关系中的尊重和边界。
- [UC Berkeley：Informational Interviews](https://www.career.berkeley.edu/start-exploring/informational-interviews/)：准备、联系、有限时长、提问和后续。课堂把短聊过程延伸为生活与跨领域探索练习，不将所有社交视作求职或资源交换。
- [Huang 等（2017）：It Doesn’t Hurt to Ask](https://www.hbs.edu/ris/Publication%20Files/Huang%20et%20al%202017_6945bc5e-3b3e-4c0a-addd-254c9e603c60.pdf)：特定对话情境中的提问、回应与好感研究。课堂不将其解释为问得越多越好或保证获得好感。

## 运行边界

RURU人生教练使用独立 `/selfcare/` 服务、8845 端口、`SELFCARE_` 环境、数据库、签名、访客标识、学习进度及 `selfcare-notes` 笔记键。素材由内置 image_gen 生成并保存，表情打包后与站点独立且带内容版本的地址绑定。构建、发布和恢复见上级 README。
