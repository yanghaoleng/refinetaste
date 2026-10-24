"""Original teaching scenarios, authored separately from the frontend runtime."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class Course:
 def __init__(self,slug,sources):self.slug=slug;self.sources=sources;self.chapters=[];self.questions=[];self.source=[]
 def chapter(self,title,subtitle,objective,source):
  self.chapters.append(dict(id=len(self.chapters),title=title,subtitle=subtitle,objective=objective,minutes='20—35 分钟',track=0));self.source=source
 def card(self,title,text):
  rows=[]
  for i,line in enumerate(text.split('|')):
   label,sep,body=line.partition('：');rows.append(dict(label=label if sep else f'记录 {i+1}',text=body if sep else label))
  return dict(kind='marketing',layout='plan',tag={'philosophy':'思想实验','selfcare':'生活练习'}.get(self.slug,'制作案头'),title=title,rows=rows,metrics=[],tone='neutral',footnote='原创教学情境 · 不是真实人物记录')
 def add(self,kind,principle,title,brief,visuals,rule,**extra):
  i=len(self.questions);q=dict(id=i,chapter=len(self.chapters)-1,module=self.slug+'-v1',kind=kind,format='情境比较' if kind=='choice' else '思考与实作',principle=principle,title=title,brief=brief,visuals=visuals,rule=rule,tip='在条件变化时，你的理由需要怎样调整？',coachOpening=[rule,'可以用自己的例子继续讨论。'],coachOpeningVersion=1,sources=[dict(title=self.sources[k][0],url=self.sources[k][1]) for k in self.source],correct=None,**extra)
  if kind=='choice':
   q['correct']=0
   if i%2:q['visuals'].reverse();q['labels'].reverse();q['correct']=1
   # Same premises and answer, a second question that asks learners to identify evidence.
   q['variants']=[dict(id='alternate',title='怎样判断：'+title,brief=brief+' 请选出理由更充分的一项。',correct=q['correct'],why=q['why'])]
  else:q['variants']=[dict(id='alternate',title=title,prompt=q['prompt']+' 请说明一个可能的限制或反例。')]
  self.questions.append(q)
 def C(self,p,t,b,g,bad,why):
  title={'philosophy':'分析记录','selfcare':'行动方案'}.get(self.slug,'制作方案')
  return self.add('choice',p,t,b,[self.card(title,g),self.card(title,bad)],why,labels=['候选分析' if self.slug=='philosophy' else '候选方案']*2,why=why)
 def O(self,p,t,b,prompt,reference,material):
  return self.add('open',p,t,b,[self.card('问题材料' if self.slug=='philosophy' else '现场材料',material)],reference,prompt=prompt,reference=reference,rubric=['回应题设的具体问题，给出可判断的思路','用理由或材料支撑关于“'+p+'”的判断','说明条件、取舍或一个可继续检查的问题'])
 def write(self):
  cfg=json.loads((ROOT/'academy/sites.json').read_text())[self.slug]
  assert len(self.questions)==len(self.chapters)*8
  for ch in self.chapters:
   qs=[q for q in self.questions if q['chapter']==ch['id']];assert [q['kind'] for q in qs].count('choice')==4 and len(qs)==8
  data=dict(version=1,tracks=[dict(id=0,title=cfg['track'],goal=cfg['goal'])],chapters=self.chapters,questions=self.questions)
  (ROOT/'academy'/self.slug).mkdir(exist_ok=True)
  (ROOT/'academy'/self.slug/'course.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
  print(self.slug,len(self.chapters),len(self.questions))
