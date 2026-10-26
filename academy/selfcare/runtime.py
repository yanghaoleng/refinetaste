"""Build-time adaptations kept local to RURU; fail loudly when shared anchors change."""
from pathlib import Path

HERE = Path(__file__).resolve().parent
COACH = '你是RURU人生教练的中文学习伙伴小满。帮助成年人从具体经历探究重要性感受，再练习自我照顾、关系、跨领域探索与coffee chat。重要性感受是感到具体生活中何者值得认真对待，是探究起点而非正确性证明，不等于被重视、贡献多或爱好高级。感受可通过接触具体经验、不同视角和事实来校准，不靠反复自我肯定。允许不知道、没感受、没爱好、虚构例子、跳过、暂停或暂不行动。主体性是有限条件下参与判断和回应，可以协商与修正，不是全能或必须独立成功。不擅断隐藏动机；可试探复述“可能在意……，贴近吗？”并允许修正。不按重要性感受强弱、人格价值、热爱或深刻程度评分。不是医疗、心理治疗或危机服务，不根据聊天诊断疾病、建议停药或开药，不把日常调整当治疗替代；持续困扰可联系合适的专业人员，紧迫危险优先当地紧急援助与可信的人。尊重双方同意、拒绝、隐私、时间和可及性，不索要病史、真实联系方式或陌生人的个人资料。独处、被支持或休息同样合理；即使没有方向也值得照顾自己。不保证健康、友谊或职业结果。'
ASSESS = '自我照顾练习只评是否回应主问、说明与实际条件相称的理由、尊重健康安全与彼此边界，不以健康结果、外向程度、聊天次数或身体状态评分。合理选择独处、拒绝邀约、线上交流或暂缓探索都可以。不要求披露真实个人经历，不要求选用追问答全，也不因没有行动而判错。“不知道”或“暂不做”是有效回应，可以温和邀请补充，不能据此判断人格、热爱或重要性感受强弱评分；选择被支持或休息也可以。题目的旧参考可能列了多个动作，它们只是备选，不能压过当前主问和rubric。'
EXPLORATION_CHAT = '本题是无评分的闲聊入口，不是评估或作业。每轮只说一两句：除非对方明确想结束或不被追问，否则严格两句，第一句用不带问号的短句自然接住刚才的回答，第二句只问一个具体、容易回答的问题。不要只抛一个问题，也不要替对方说感受。不编造自己看剧、读书或生活的经历，不用“我也……”假装有同样经历。例如对“刷剧”可以说“好呀，就从最近在看的聊起。你最近在看哪部剧？”；对“没啥，太累”可以说“听着是挺累的。最近哪件事最耗精力？”；对“看必读书单”可以说“是顺着书单找书看呀。最近翻开哪一本了？”句式可变，别照搬整套示例。通常30至70字，最多120字、最多一个问号。不要一口气追问多个方面，不用列表、长分析、总结框架或评价标准，不复读题目和内部提示。不要急着说“这说明你重视……”或贴价值标签，不把回答强行带向行动计划。回答“刷剧”就顺着具体的剧或片段聊；“没啥，太累”就顺着疲惫或想歇着聊，不训诫；“看必读书单”就问具体一本书或读到的内容，不评判跟风。不知道、没感受、跳过和暂不行动都可以。逐渐随语境聊事件、感受、缘由、在意的差别、现实限制或可选尝试，不按这串顺序盘问。只有用户问到概念或当前语境确实需要时才用生活话解释重要性感受，并允许对方修正理解，不引用教材或来源段落。不返回correct，不宣称练习已有验证效果。'

def replace(text, old, new):
    assert old in text, old[:100]
    return text.replace(old, new)

def install(dst):
    p = dst / 'dist/app.js'
    s = p.read_text()
    s = replace(s, "const assess=activeQuestion().kind==='open'&&!questionAnswered()", "const assess=activeQuestion().feedbackMode!=='exploration'&&activeQuestion().kind==='open'&&!questionAnswered()")
    s = replace(s, 'score&&!score.passed?', 'score&&!score.passed&&!score.exploration?')
    p.write_text(s + '\n' + '\n'.join((HERE / name).read_text() for name in ('runtime.js','session-core.js','guide-core.js','session.js','chapters-core.js','health-core.js','health.js')))
    p = dst / 'dist/academy.css'
    p.write_text(p.read_text() + '\n' + (HERE / 'runtime.css').read_text() + '\n' + (HERE / 'session.css').read_text())
    p = dst / 'dist/analytics.js'
    s = replace(p.read_text(), "location.pathname.startsWith('/selfcare/')", "(location.pathname.startsWith('/selfcare/')||location.pathname.startsWith('/lifecoach/'))")
    p.write_text(s)
    p = dst / 'server/app.py'
    s = p.read_text()
    s = replace(s, "CHAPTERS_BY_ID={chapter['id']:chapter for chapter in COURSE['chapters']}", "CHAPTERS_BY_ID={chapter['id']:chapter for chapter in [*COURSE['chapters'],*COURSE.get('legacyChapters',[])]}")
    s = replace(s, "for chapter in COURSE['chapters'])", "for chapter in [*COURSE['chapters'],*COURSE.get('legacyChapters',[])])")
    s = replace(s, "\nCHAPTER_QUESTIONS={", "\nACTIVE_CHAPTER_STARTS=tuple(start for start in CHAPTER_STARTS if not QUESTIONS[start].get('archived'))\nCHAPTER_QUESTIONS={")
    s = replace(s, "('chapter',len(COURSE['chapters'])),('nextChapter',len(COURSE['chapters']))", "('chapter',max(CHAPTERS_BY_ID)+1),('nextChapter',max(CHAPTERS_BY_ID)+1)")
    # -1 is already the schema's ungraded answer value. Never turn exploration into a grade.
    s = replace(s, "        q=QUESTIONS[row['q']]", "        q=QUESTIONS[row['q']]\n        if q.get('feedbackMode')=='exploration':return None")
    s = replace(s, "if type(q) is not int or q not in range(len(QUESTIONS)) or (not chat and QUESTIONS[q]['kind']!='open'):raise ValueError()", "if type(q) is not int or q not in range(len(QUESTIONS)) or (not chat and QUESTIONS[q]['kind']!='open'):raise ValueError()\n            if QUESTIONS[q].get('feedbackMode')=='exploration':\n                if not chat:raise ValueError()\n                assess=False")
    s = replace(s, "path=parsed.path", "path=selfcare_path(parsed.path)")
    s = replace(s, "path=urlparse(self.path).path", "path=selfcare_path(urlparse(self.path).path)")
    s = replace(s, "path = urlparse(self.path).path", "path = selfcare_path(urlparse(self.path).path)") if 'path = urlparse(self.path).path' in s else s
    s = replace(s, "BASE = '/selfcare'", "BASE = '/selfcare'\ndef selfcare_path(path):\n    return '/selfcare'+path[len('/lifecoach'):] if path=='/lifecoach' or path.startswith('/lifecoach/') else path")
    s = replace(s, "BASE = '/selfcare'", "import importlib.util\n_exp_spec=importlib.util.spec_from_file_location('ruru_exploration',ROOT/'server/exploration.py')\nexploration=importlib.util.module_from_spec(_exp_spec);_exp_spec.loader.exec_module(exploration)\nBASE = '/selfcare'")
    s = replace(s, "    def review_request(self,key,now):\n        try:", "    def review_request(self,key,now):\n        exploring=False\n        try:")
    s = replace(s, "            messages=data.get('messages')\n            if chat:messages=reviewer.validate_messages(messages)", "            exploring=data.get('mode') in ('exploration_session','exploration_report','health_session','practice_session')\n            session_request=exploration.validate_request(data) if exploring else None\n            if exploring:chat=True;assess=False\n            messages=data.get('messages')\n            if chat and not exploring:messages=reviewer.validate_messages(messages)")
    s = replace(s, "        except ValueError:return self.reply(400,{'error':'请针对本题写下 30—2000 字的思路。'})", "        except ValueError:return self.reply(400,{'error':'会谈记录格式或长度暂时无法处理。已有内容仍留在本机。' if exploring else '请针对本题写下 30—2000 字的思路。'})")
    s = replace(s, "        tracking=data.get('tracking')", "        tracking=None if exploring else data.get('tracking')")
    s = replace(s, "                reply=reviewer.chat(question,messages,assess=True) if assess else reviewer.chat(question,messages)", "                reply=exploration.respond(session_request,reviewer) if exploring else reviewer.chat(question,messages,assess=True) if assess else reviewer.chat(question,messages)")
    p.write_text(s)
    (dst / 'server/exploration.py').write_text((HERE / 'exploration.py').read_text())
    p = dst / 'server/reviewer.py'
    s = p.read_text()
    s = replace(s, 'def chat(question,messages,assess=False):', "def chat(question,messages,assess=False):\n    exploration=question.get('feedbackMode')=='exploration'\n    if exploration:assess=False")
    anchor = "    payload={'model':os.environ["
    i = s.index(anchor, s.index('def chat('))
    s = s[:i] + "    if exploration:\n        instruction=instruction.replace('每次简短回答，约80至180字','每次只用一两句，约30至70字')\n        instruction+=" + repr(EXPLORATION_CHAT) + "\n        question={key:question[key] for key in ('id','prompt','coachGuide') if key in question}\n    if question.get('archived'):instruction+='这是历史归档题，讨论的是心理学mattering，不是新版首章的重要性感受；不要把二者当同义概念。'\n" + s[i:]
    s = replace(s, "        emotion=result.get('emotion','neutral')", "        if exploration and (len(text.strip())>120 or text.count('？')+text.count('?')>1):raise ValueError()\n        emotion=result.get('emotion','neutral')")
    p.write_text(s)
    import importlib.util
    spec=importlib.util.spec_from_file_location('ruru_performance',HERE/'performance.py');perf=importlib.util.module_from_spec(spec);spec.loader.exec_module(perf);perf.install(dst)
