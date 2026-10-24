#!/usr/bin/env python3
"""Build independent subject sites from the tested Design Class experience."""
import argparse,hashlib,importlib.util,json,re,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('links',ROOT/'scripts/link-academies.py');links=importlib.util.module_from_spec(spec);spec.loader.exec_module(links)
CONFIG=json.loads((ROOT/'academy/sites.json').read_text())
HERO={
'selfcare':[('今天的小照顾','先照顾好自己','身体：留意睡眠与精力|生活：选择一个做得到的小行动|连接：给在意的人留一点时间','慢慢来'),('一次好奇的邀约','聊聊你的世界','一个具体问题。<br>二十分钟，听一段真实经历。','聊一聊'),('从熟悉走向未知','给生活开一扇窗','一次社区活动。<br>一个新视角。<br>保留好奇，也保留边界。','去看看')],
'philosophy': [('主张与理由','我为什么相信？','主张：学习也需要留白|理由：休息能让人继续投入|追问：什么情况会构成反例？','为什么'),('思想实验','同一条船','材料、结构和历史，<br>你会采用哪一种标准？','同一'),('认真对话','先听清，再回应','一个立场。<br>一条理由。<br>另一种可能。','对话')],
'mediaclass':[('一页策划','先想给谁看','受众：第一次面对镜头的人|任务：说清一个具体问题|证明：让观众看见真实变化','开拍'),('镜头之前','好问题，让人开口','少一点预设。<br>多一点具体经历。','访谈'),('从灵感到成片','把想法做出来','选题 → 脚本 → 拍摄<br>粗剪 → 核对 → 发布','行动')]
}
COACH={
'selfcare':'你是中文日常自我照顾与人际沟通学习伙伴小满，帮助成年人练习睡眠与休息、活动与饮食常识、情绪觉察、边界、社会支持、跨领域探索和coffee chat的邀约、倾听、追问与后续联系。不是医疗、心理治疗或危机服务，不根据聊天诊断疾病、建议停药或开药，不把习惯调整当治疗替代；出现持续困扰建议联系合适的专业人员，紧迫危险优先当地紧急援助与身边可信的人。不要索要病史、真实联系方式或陌生人的个人资料，允许虚构案例。鼓励小步探索，不强迫外向、饮咖啡、频繁见人或与不安全的人接触；线上、散步和小组活动同样可行。不要把人当资源、以人脉地位给人排序，不保证友谊、职业机会或健康结果。尊重双方同意、拒绝、隐私、时间和可及性。',
'philosophy':'你是中文哲学入门教练，帮助学习者澄清概念、重建论证、比较理由、回应反例。不要把某一学派、人生选择或价值立场当唯一正确答案；区别文本解释、争议观点、经验事实与推论，不捏造哲学家语录。中国哲学不压缩成性格标签。思想实验不是现实人的诊断。',
'mediaclass':'你是中文自媒体运营与视频制作教练，帮助学习者连接受众、IP定位、选题、栏目、脚本、拍摄、口播、访谈、教程测评、纪实、剪辑和复盘。根据视频类型与资源评价，不背诵万能爆款公式，不保证流量、收入或平台算法。尊重被拍者和素材关系，不把演示当真实事件，不声称观看或听到题目未提供的媒体。平台当期规则未知时明确不确定。'
}
ART={'selfcare':[0,1,2,3,4,5,6,7,8,9],'philosophy':[4,3,8,7,3,11,4,9],'mediaclass':[8,10,4,5,1,10,9,11,6,5,12,14]}
def build(slug,out):
 cfg=CONFIG[slug];dst=out/slug
 if dst.exists():shutil.rmtree(dst)
 shutil.copytree(ROOT/'dist',dst/'dist');shutil.copytree(ROOT/'server',dst/'server',ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
 course=json.loads((ROOT/'academy'/slug/'course.json').read_text())
 for ch,art in zip(course['chapters'],ART[slug]):ch['art']=art
 (dst/'dist/course.json').write_text(json.dumps(course,ensure_ascii=False,indent=2)+'\n')
 # Namespace browser data, endpoint paths, server credentials, cookie signatures and cookies.
 for directory in ('dist','server'):
  for p in (dst/directory).rglob('*'):
   if p.suffix in ('.js','.css','.html','.py','.json') and p.name!='course.json':
    s=p.read_text().replace('REFINETASTE',cfg['env']).replace('refinetaste',slug).replace('JOJO 设计班',cfg['name']).replace('设计教练 JOJO',cfg['coach']).replace('JOJO',cfg['character'])
    if slug=='selfcare':s=s.replace('muguang-notes','selfcare-notes')
    p.write_text(s)
 app=dst/'server/app.py';s=app.read_text().replace('CORRECT = [1, 1, 1, 1, 0, 1, 1, 1]','CORRECT = '+repr([q['correct'] for q in course['questions'][:8]])).replace("NAMES = ['对比', '重复', '亲密', '对齐', '场景与调性', '信息层级', '用户路径', '协作表达']","NAMES = [q['principle'] for q in QUESTIONS[:8]]").replace('COMPAT_CHAPTER_SYLLABI={60:(tuple(range(60,70)),)}','COMPAT_CHAPTER_SYLLABI={}')
 s=s.replace("        files[BASE+'/icons.svg']='icons.svg'", "        files[BASE+'/icons.svg']='icons.svg'\n        files[BASE+'/academy.css']='academy.css'")
 app.write_text(s)
 p=dst/'dist/app.js';s=p.read_text().replace('chapterArt(ch.id)','chapterArt(ch.art??ch.id)').replace('发来的两个设计方案','发来的两个案例').replace('发来的设计案例','发来的案例')
 s=s.replace('简答题按 AI 对核心原则的判断计分。','简答题只按论证与回应要求判断，不给世界观或人生立场打分。' if slug=='philosophy' else '简答题按当前任务、理由与制作方案判断，不预测流量或收入。')
 if slug=='selfcare':s=s.replace('简答题按当前任务、理由与制作方案判断，不预测流量或收入。','简答题只检查情境判断、可行行动与彼此边界，不评价健康状况、性格或社交表现。').replace('说说你的想法…','用虚构例子说说你的想法…')
 p.write_text(s)
 p=dst/'dist/index.html';s=p.read_text();s=re.sub(r'<meta name="description" content="[^"]*">','<meta name="description" content="'+re.sub('<[^>]+>',' ',cfg['intro'])+'">',s)
 first=cfg['headline'][0];s=s.replace('好看，是有理由的。',f'{first[0]}，是有{first[1]}的。').replace('data-headline-subject>好看','data-headline-subject>'+first[0]).replace('data-headline-reason>理由','data-headline-reason>'+first[1])
 s=re.sub(r'<p class="intro">.*?</p>','<p class="intro">'+cfg['intro']+'</p>',s).replace('开始设计练习',cfg['cta'])
 scenes=[]
 for (tag,title,body,word),scene in zip(HERO[slug],['principles','experience','aigc']):
  rows=''.join('<p>'+row+'</p>' for row in body.split('|'))
  word_piece='' if slug=='selfcare' else f'<div class="hero-piece academy-word" data-hero-piece aria-hidden="true">{word}</div>'
  scenes.append(f'<section class="hero-scene" data-hero-scene="{scene}"><article class="hero-piece academy-paper" data-hero-piece><small>{tag}</small><strong>{title}</strong><div>{rows}</div></article>{word_piece}<img class="hero-piece academy-mascot" data-hero-piece src="assets/mascot.png" alt="{cfg["character"]}" width="240" height="280"></section>')
 hero='<div class="hero-art hero-carousel academy-hero" role="button" tabindex="0" aria-label="切换首页装饰">'+''.join(scenes)+'</div>\n</section>'
 s,n=re.subn(r'<div class="hero-art hero-carousel".*?</div>\n</section>',lambda _:hero,s,flags=re.S);assert n==1
 s=s.replace('</head>','<link rel="stylesheet" href="academy.css"></head>');p.write_text(s)
 (dst/'dist/academy.css').write_text((ROOT/'academy/academy.css').read_text()+f"\nhtml[data-theme=dark] body{{--accent:{cfg['accent']};--button:{cfg['accent']};--button-text:#17201a;--focus:{cfg['accent']}}}\nhtml[data-theme=light] body{{--accent:{cfg['accent']};--button:{cfg['ink']};--button-text:#ffffff;--focus:{cfg['ink']}}}\n")
 if slug=='selfcare':
  p=dst/'dist/academy.css';p.write_text(p.read_text()+'\n.academy-mascot,.brand-icon{image-rendering:auto}.brand-icon{border-radius:50%}#coach-avatar,.coach-header #coach-avatar{padding:0;border:0;box-shadow:none;background:none}\n')
 identity=ROOT/'academy/identity/compiled'/slug
 if identity.exists():shutil.copytree(identity,dst/'dist/assets',dirs_exist_ok=True)
 if slug=='selfcare':
  identity_version=hashlib.sha256(b''.join(p.read_bytes() for p in sorted(identity.rglob('*')) if p.is_file())).hexdigest()[:12]
  p=dst/'dist/site-icon.js';p.write_text(p.read_text().replace("mood+'-'+size,base",f"mood+'-'+size+'?v={identity_version}',base"))
  p=dst/'dist/index.html';text=p.read_text()
  text=re.sub(r'assets/(?:mascot\.png|chick-starry-(?:96|192)\.webp|favicon-starry\.(?:ico)|favicon-starry-32\.png|apple-touch-starry\.png)',lambda m:m[0]+'?v='+identity_version,text)
  p.write_text(text)
 s=(dst/'server/app.py').read_text().replace("        files[BASE+'/icons.svg']='icons.svg'","        files[BASE+'/icons.svg']='icons.svg'\n        files[BASE+'/assets/mascot.png']='assets/mascot.png'");(dst/'server/app.py').write_text(s)
 # Give the lesson sprites their own content-versioned URLs, including preloads and server routes.
 # Reusing the design classroom filenames can retain an already loaded chicken in existing browsers.
 assets={}
 for name in ('chick-emotions.webp','chick-positive-emotions.webp','chick-cool-expressions.webp','chick-gaze.webp'):
  source=dst/'dist/assets'/name;digest=hashlib.sha256(source.read_bytes()).hexdigest()[:12]
  target=cfg['identity']+'-'+source.stem.removeprefix('chick-')+'-'+digest+source.suffix
  source.rename(source.with_name(target));assets[name]=target
 for directory in ('dist','server'):
  for p in (dst/directory).rglob('*'):
   if p.suffix in ('.html','.css','.js','.py'):
    text=p.read_text()
    for old,new in assets.items():text=text.replace(old,new)
    p.write_text(text)
 p=dst/'dist/index.html';text=p.read_text()
 for name,attribute in [('course.css','href'),('app.js','src')]+([('site-icon.js','src')] if slug=='selfcare' else []):
  digest=hashlib.sha256((dst/'dist'/name).read_bytes()).hexdigest()[:12]
  text=text.replace(f'{attribute}="{name}"',f'{attribute}="{name}?v={digest}"')
 p.write_text(text)
 links.install(dst/'dist',slug)
 # Preserve the light menu and chapter numbering helper without embedding the design syllabus.
 p=dst/'dist/chapter-practice.js';s=p.read_text().split('window.RefinePractice.menu=')[0]
 menu={key:course[key] for key in ('tracks','chapters')};menu['questions']=[{k:q[k] for k in ('id','chapter','principle')} for q in course['questions']]
 p.write_text(s+'window.RefinePractice.menu='+json.dumps(menu,ensure_ascii=False,separators=(',',':'))+';\n')
 p=dst/'dist/hero-carousel.js';s=p.read_text();s,n=re.subn(r'const phrases=\[.*?\];','const phrases='+json.dumps(cfg['headline'],ensure_ascii=False)+';',s,count=1);assert n==1;p.write_text(s)
 # Specific subject expertise; keep bounded retries and validated grading response behavior.
 p=dst/'server/reviewer.py';s=p.read_text();s=s.replace('你是帮助设计、产品、内容与营销从业者训练判断的中文教练。',COACH[slug])
 start=s.index("    instruction='",s.index('def chat('));end=s.index("    if question.get('module')",start)
 common=s[start:end];tail=common[common.index('每次简短回答'):]
 s=s[:start]+"    instruction='"+COACH[slug]+tail+s[end:]
 if slug=='philosophy':
  needle="    payload={'model':os.environ["
  i=s.index(needle,s.index('def chat('));s=s[:i]+"    if assess:instruction+='哲学练习的correct只看有没有回应当前问题、给出相关理由并认真处理题目要求的反例或限制；不因结论、政治态度、宗教信仰、人生价值或是否符合某学派而判错。允许有条件的结论；不要求列出所有维度。'\n"+s[i:]
 if slug=='selfcare':
  needle="    payload={'model':os.environ[";i=s.index(needle,s.index('def chat('));s=s[:i]+"    if assess:instruction+='自我照顾练习的correct只评是否回应题设、提出与资源相称的具体行动、尊重同意与边界，并说明理由；合理选择独处、拒绝邀约、线上交流或暂缓探索都可判对，不以健康结果、外向程度、聊天次数或身体状态评分。不要求披露真实个人经历。'\n"+s[i:]
 s=s.replace('关键设计原则名称','关键概念名称').replace('只讨论当前题目相关的设计、创作与营销判断。',{'philosophy':'只讨论当前题目相关的哲学判断。','selfcare':'只讨论当前题目相关的日常自我照顾与人际沟通判断。'}.get(slug,'只讨论当前题目相关的创作与运营判断。'))
 p.write_text(s)
 p=dst/'dist/privacy.html';s=p.read_text().replace('设计判断','学习判断').replace('设计练习','学习练习');p.write_text(s)
 (dst/'site.json').write_text(json.dumps(dict(slug=slug,**cfg),ensure_ascii=False,indent=2)+'\n')
 shutil.copytree(ROOT/'ops/academy',dst/'ops')
 return dst
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--site',choices=list(CONFIG));parser.add_argument('--output',type=Path,default=ROOT/'.runtime/academies');a=parser.parse_args()
 for slug in ([a.site] if a.site else CONFIG):print(build(slug,a.output))
