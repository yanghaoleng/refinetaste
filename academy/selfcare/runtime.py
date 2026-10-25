"""Build-time adaptations kept local to RURU; fail loudly when shared anchors change."""
from pathlib import Path

HERE = Path(__file__).resolve().parent
COACH = '你是RURU人生教练的中文学习伙伴小满。帮助成年人从具体经历探究重要性感受，再练习自我照顾、关系、跨领域探索与coffee chat。重要性感受是感到具体生活中何者值得认真对待，是探究起点而非正确性证明，不等于被重视、贡献多或爱好高级。感受可通过接触具体经验、不同视角和事实来校准，不靠反复自我肯定。允许不知道、没感受、没爱好、虚构例子、跳过、暂停或暂不行动。主体性是有限条件下参与判断和回应，可以协商与修正，不是全能或必须独立成功。不擅断隐藏动机；可试探复述“可能在意……，贴近吗？”并允许修正。不按重要性感受强弱、人格价值、热爱或深刻程度评分。不是医疗、心理治疗或危机服务，不根据聊天诊断疾病、建议停药或开药，不把日常调整当治疗替代；持续困扰可联系合适的专业人员，紧迫危险优先当地紧急援助与可信的人。尊重双方同意、拒绝、隐私、时间和可及性，不索要病史、真实联系方式或陌生人的个人资料。独处、被支持或休息同样合理；即使没有方向也值得照顾自己。不保证健康、友谊或职业结果。'
ASSESS = '自我照顾练习只评是否回应主问、说明与实际条件相称的理由、尊重健康安全与彼此边界，不以健康结果、外向程度、聊天次数或身体状态评分。合理选择独处、拒绝邀约、线上交流或暂缓探索都可以。不要求披露真实个人经历，不要求选用追问答全，也不因没有行动而判错。“不知道”或“暂不做”是有效回应，可以温和邀请补充，不能据此判断人格、热爱或重要性感受强弱评分；选择被支持或休息也可以。题目的旧参考可能列了多个动作，它们只是备选，不能压过当前主问和rubric。'

def replace(text, old, new):
    assert old in text, old[:100]
    return text.replace(old, new)

def install(dst):
    p = dst / 'dist/app.js'
    s = p.read_text()
    s = replace(s, "const assess=activeQuestion().kind==='open'&&!questionAnswered()", "const assess=activeQuestion().feedbackMode!=='exploration'&&activeQuestion().kind==='open'&&!questionAnswered()")
    s = replace(s, 'score&&!score.passed?', 'score&&!score.passed&&!score.exploration?')
    p.write_text(s + '\n' + (HERE / 'runtime.js').read_text())
    p = dst / 'dist/academy.css'
    p.write_text(p.read_text() + '\n' + (HERE / 'runtime.css').read_text())
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
    p.write_text(s)
    p = dst / 'server/reviewer.py'
    s = p.read_text()
    s = replace(s, 'def chat(question,messages,assess=False):', "def chat(question,messages,assess=False):\n    if question.get('feedbackMode')=='exploration':assess=False")
    anchor = "    payload={'model':os.environ["
    i = s.index(anchor, s.index('def chat('))
    s = s[:i] + "    if question.get('feedbackMode')=='exploration':instruction+='本题是无评分的原创探索练习。只回应和邀请一个可选追问，不返回correct，不要求具体行动或完整隐私。不能宣称练习已有验证效果。'\n    if question.get('archived'):instruction+='这是历史归档题，讨论的是心理学mattering，不是新版首章的重要性感受；不要把二者当同义概念。'\n" + s[i:]
    p.write_text(s)
