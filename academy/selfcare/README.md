# RURU人生教练

面向成年人的原创生活练习，11 章、88 道当前练习：40 道情境比较、40 道简短开放练习、8 步首章探索。角色仍为毛毡肉桂小太阳鹦鹉「小满」。正式入口为 `https://mikeywa.site/lifecoach/`，旧 `https://mikeywa.site/selfcare/` 保留为同一服务的兼容入口。

## 课程顺序

1. **先找到，你真正想认真对待的事**：重要性感受。每题只显示一句日常问题，从闲暇、记着的事和好奇聊起。8 题顺序不变，不随机、不打分；深入的事件、感受、缘由与取舍随聊天逐渐展开。
2. 自我照顾，从看见需要开始。
3. 睡眠、休息与恢复。
4. 活动、饮食与日常健康。
5. 情绪、压力与温柔的边界。
6. 关系质量与日常连接。
7. 破圈，从一个真实问题开始。
8. Coffee chat：邀约与准备。
9. Coffee chat：倾听、追问与表达。
10. 差异、互惠与有分寸的交流。
11. 结束、跟进与可持续探索。

## 重要性感受与反馈

这里的重要性感受指：在具体生活中感到何者值得认真对待、继续了解。它是进一步探究的起点，不是正确性证明，不等于自己被重视、贡献多或爱好高级。练习通过回看具体经验、接触现实和不同视角来校准关切，允许调整或放下。主体性是有限处境中参与判断和回应，可以协商和修正；不要求全能、完全独立或立刻有成果。

2026-10-25 根据线上反馈精简入口：默认题目页不再显示情境铺垫、概念段落、追问清单、引用或反复的作答说明。输入框只提示“随便聊聊就好”。末题原有线索卡收进可选“留张便签”，保存键与旧笔记兼容。概念与来源保留在本课程说明，内部聊天提示不会作为页面文字显示。

AI 每轮先一句自然回应，再只问一个具体问题，通常 30—70 字。只在用户问到或语境需要时解释概念，不按固定链条盘问，不评判刷剧、疲惫、书单或没有答案。首章专用响应校验限制为最多 120 字、最多一个问号；其他章节仍用原反馈方式。请求给模型的题目资料仅含短主问与内部对话方向，不携带引用、参考答案或评价清单。

首章允许没爱好、没感受、不知道、虚构例子、跳过、暂停或暂不行动；AI 只作试探复述与可选追问，不擅断隐藏动机。界面没有正确/错误标记或百分制结果，不给重要性感受强弱、人格价值、热爱或深刻程度评分。每一步可以直接继续，AI 不可用也能完成探索、保存线索卡。浏览器记录的是已浏览/已记录/已跳过，后端沿用已有 `choice=-1` 的无评分记录，绝不把它当答对。线索卡留在本机，可收藏到笔记；没有线索时保留“暂没找到，先留意让我停一下的时刻”。

这些是原创探索练习，不是量表，也没有经过效果验证。2026-10-25 核对节目官方简介：

- [翻转电台：再谈“重要性感受”](https://www.xiaoyuzhoufm.com/episode/64de00fd80c9ec4c5f8a3481)：进一步了解的必要、面对困境与创造性解决、感受与推论的区别。
- [翻转电台：公共正义中的“重要性感受”](https://www.xiaoyuzhoufm.com/episode/5e4ff46a418a84a046973d8c)：感受可经具体经验训练，作为起点而非终点。

只依据官方公开简介作概念导引，没有声称听取完整音频或复刻节目练习。书、剧、做饭等入口与课程里的具体练习是本课的原创教学安排，不声称这些安排已由节目或研究验证。

## 后续题目

逐题检查了原有 80 题。40 道比较题已有一次具体情境与一个主问，保留其教学目标和健康安全边界；40 道开放题全部落实为一个主问加可选追问，去除一次回答多项作业的压力。例如“列两个需要并规划行动”改为“如果有人能帮你分担一件事，你最希望是什么，也可以暂时不被打扰”；“四周同时照顾身体、关系和破圈”改为“下个月最想给哪件事留一点空间”。逐题对照与保留理由见 [题目审查](REVIEW.md)。

后续比较题仍按题设条件判断方案；开放题只检查主问回应、相关理由和健康安全/同意/边界，不要求答全可选追问。“不知道/暂不做”可有效，不因没有行动判错。不按健康结果、性格、外向程度、体型或认识人数评价人。允许虚构例子，不要求真实病史、姓名、联系方式或陌生人的隐私。

健康内容是成年人日常照顾与信息判断，不提供诊断、处方、药物调整或治疗方案。持续困扰或生活功能受影响时引导合适的专业支持；自助不用于推迟求助。Coffee chat 也可以是线上、散步、社区或兴趣交流，不限求职或喝咖啡。即使没有方向，也值得休息；照顾自己不只是为了多产出。

## 题库与旧数据兼容

- `build_selfcare.py` 保留原 0—79 题及章节 0—9 的稳定 ID；开放题的措辞和选用追问在 `selfcare/curriculum.py` 中修订。
- 新首章用章节 ID 11、全新题 ID 88—95，不把旧末章答案套入新问题。显示顺序与稳定 ID 分开，最后学习章节按已有 ID 恢复。
- 旧末章 80—87 题保存在 `legacy-mattering-v1.json`，并以 `archived` 记录兼容旧标签页、历史进度、对话与笔记。当前菜单不显示、不要求新学习者完成。旧笔记明确提示：心理学 mattering（被重视/贡献）与新首章概念不同，旧引用不再作为新章依据。
- `course.json` 为 v2，数组内有 96 个稳定编号记录，其中 8 个是归档；当前有效练习仍为 88。`legacyChapters` 仅供后台与历史读取。
- 前端 RURU 专用适配在 `runtime.js/css/py`，其他课堂继续使用共享运行时。自我照顾服务仍是独立 8845 端口、`SELFCARE_` 配置、原数据库与签名。
- 新旧路径同源且使用相同 `selfcare-course-v2`、`selfcare-chapter-scores`、`selfcare-notes`、`selfcare-visitor` 等存储键，未重置或迁移旧数据。管理员 cookie 名称/Path 与原 `/selfcare/api/` 保持一致；后台继续通过原受保护 API 工作。新路径同时提供完整资源和 API 别名。

## 来源与运行

以下健康与交流来源沿用原课程核验，不以机构认可或确定个人效果作宣传：

- [NIMH：Caring for Your Mental Health](https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health)：自我照顾、个体差异、支持与专业求助。
- [CDC：About Sleep](https://www.cdc.gov/sleep/about/index.html)：睡眠时长与质量、日常习惯、持续问题的咨询。
- [WHO：Physical activity](https://www.who.int/news-room/fact-sheets/detail/physical-activity)：身体活动与日常生活、久坐。
- [WHO：Healthy diet](https://www.who.int/news-room/fact-sheets/detail/healthy-diet)：充足、平衡、适度与多样，结合个人和生活条件。
- [NIH：Physical Wellness Toolkit](https://www.nih.gov/health-information/your-healthiest-self-wellness-toolkits/physical-wellness-toolkit)：环境支持、现实目标与调整。
- [WHO：Doing What Matters in Times of Stress](https://www.who.int/publications/i/item/9789240003927)：日常压力应对的学习入口，页面提供中文版本。
- [NIH：Social Wellness Toolkit](https://www.nih.gov/health-information/your-healthiest-self-wellness-toolkits/social-wellness-toolkit)：参与社区、建立支持、关系中的尊重和边界。
- [UC Berkeley：Informational Interviews](https://www.career.berkeley.edu/start-exploring/informational-interviews/)：准备、联系、有限时长、提问和后续。课堂把短聊过程延伸为生活与跨领域探索练习，不将所有社交视作求职或资源交换。
- [Huang 等（2017）：It Doesn’t Hurt to Ask](https://www.hbs.edu/ris/Publication%20Files/Huang%20et%20al%202017_6945bc5e-3b3e-4c0a-addd-254c9e603c60.pdf)：特定对话情境中的提问、回应与好感研究。课堂不将其解释为问得越多越好或保证获得好感。


本地：`python3 academy/build_selfcare.py` 后运行 `python3 scripts/dev-academies.py selfcare`，打开 `http://localhost:8845/lifecoach/?qa=1`。`?qa=1` 关闭行为采集，用于验收。无 AI 配置时会明确提示不可用；首章仍可自主记录和继续。构建、测试和既有正式发布流程见上级 README。
