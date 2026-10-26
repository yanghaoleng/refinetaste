/* Browser-local habit inventory. No health score and no disease inference. */
(()=>{
 const sources={mental:['NIMH · 自我照顾与支持','https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health'],social:['NIH · 社会连接','https://www.nih.gov/health-information/social-wellness-toolkit'],interview:['UC Berkeley · 信息访谈','https://www.career.berkeley.edu/start-exploring/informational-interviews/'],sleep:['CDC · 睡眠与质量','https://www.cdc.gov/sleep/about/'],shift:['NIH · 睡眠习惯与轮班','https://www.nhlbi.nih.gov/health/sleep-deprivation/healthy-sleep-habits'],diet:['WHO · 健康饮食','https://www.who.int/news-room/fact-sheets/detail/healthy-diet'],activity:['WHO · 身体活动','https://www.who.int/news-room/fact-sheets/detail/physical-activity'],safety:['NIH · 活动风险与求助','https://www.nhlbi.nih.gov/health/heart/physical-activity/risks'],breathing:['NIH · 睡眠呼吸暂停的表现','https://www.nhlbi.nih.gov/health/sleep-apnea/symptoms']};
 const options={
 readiness:['想先了解','准备试一点','已经在尝试','暂时不调整'],
 schedule:['大致固定','工作日和休息日不同','轮班或不固定','不想回答'],
 sleepAmount:['不足6小时','大约6—7小时','大约7—9小时','超过9小时','不确定','不想回答'],
 concerns:['想晚点睡自己的时间','入睡困难','夜里常醒','醒来不解乏','有人提到我睡着会呼吸停顿','没明显困扰','不确定'],
 causes:['工作或轮班','照顾别人','刷屏或娱乐','想独处一会儿','还不困','担心事情','其他','不确定'],
 duration:['最近几天','几周了','几个月或更久','不确定','不想回答'],
 impact:['白天困倦','工作学习受影响','开车或操作设备时犯困','没明显影响','不确定','不想回答'],
 meals:['外卖','食堂','自己做','家人或他人备餐','很不固定','不想回答'],
 foods:['蔬菜、水果','米面、杂粮等主食','豆、蛋、鱼、肉','奶及替代品','腌制或加工食品','甜食','含糖饮料','其他','想不起来'],
 frequency:['几乎每天','一周2—4次','一周1次或更少','不确定'],
 goals:['吃得更规律','精神和体力','搭配更有变化','方便、预算合适','医生已有的建议','体重目标','没有特别调整','不想控制饮食'],
 conditions:['时间紧','预算有限','可选的食物少','要兼顾家人','口味偏好','没特别限制','不想说'],
 activityDays:['0—1天','2—3天','4—7天','不确定','不想回答'],
 sitting:['工作、学习','通勤、开车','看屏幕、娱乐','照护或生活安排','不太固定','不想回答'],
 limits:['时间少','环境或场地不方便','疲劳','活动时有疼痛或不适','需要他人协助','没特别限制','不想说'],
 preferences:['走路、散步','通勤或家务中活动','轻柔伸展','跳舞','骑车','球类或其他运动','自己补充','暂时不知道'],
 sleepPriority:['留出休息时间','入睡前放松','减少夜间打断','了解白天疲惫','先了解，不调整'],
 dietPriority:['吃饭更规律','搭配多一点变化','看看饮料选择','了解盐和食品标签','先了解，不调整'],
 activityPriority:['少坐一会儿','找喜欢的活动','降低开始的负担','先了解身体不适','先了解，不调整']
 };
 const card=(key,title,type='multi',extra={})=>({key,title,type,...extra});
 function cards(topic,a={}){
  if(window.RuruChapters?.chapters[topic])return window.RuruChapters.cards(topic);
  if(topic==='sleep')return [card('schedule','你的作息通常是哪一种？','single'),...(a.schedule==='不想回答'?[]:[card('times',a.schedule==='轮班或不固定'?'用最近一次作息举例也可以。':'通常什么时候上床、起床？','times'),card('sleepAmount','你估计真正睡着了多久？','single')]),card('concerns','最近睡眠哪一点让你挂心？'),...(a.concerns?.includes('想晚点睡自己的时间')?[card('causes','晚点睡，通常和什么有关？')]:[]),...(a.concerns?.some(x=>!['没明显困扰','不确定'].includes(x))?[card('duration','这种情况大概持续多久了？','single'),card('impact','白天有没有受到影响？')]:[]),card('readiness','你现在更希望怎样？','single'),card('sleepPriority','如果想调整，你最想先看哪一点？','rank')];
  if(topic==='diet')return [card('meals','最近一周，通常在哪里解决吃饭？'),card('foods','最近一周吃过、喝过哪些？'),card('frequency','这些食物和饮料，大概多久一次？','frequency'),card('goals','你有在有意识地调整饮食吗？'),card('conditions','吃饭时，哪些现实条件要一起考虑？'),card('readiness','你现在更希望怎样？','single'),card('dietPriority','如果想调整，你最想先看哪一点？','rank')];
  return [card('activityDays','最近一周，有几天会活动身体？','single',{hint:'走路、通勤、家务也算，不只锻炼。'}),card('sitting','通常在哪些场景坐得比较久？'),card('limits','活动时，有哪些限制需要考虑？'),card('preferences','哪种活动你比较愿意接近？'),card('readiness','你现在更希望怎样？','single'),card('activityPriority','如果想调整，你最想先看哪一点？','rank')];
 }
 const copy=x=>JSON.parse(JSON.stringify(x));
 const create=topic=>({schema:1,topic,step:0,answers:{},notes:{},view:'cards',messages:[],revision:0,draft:'',chatSignature:''});
 const valid=(s,topic)=>s?.schema===1&&s.topic===topic&&s.answers&&typeof s.answers==='object'&&s.notes&&typeof s.notes==='object'&&Number.isInteger(s.step)&&Array.isArray(s.messages)&&s.messages.every(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string');
 function toggle(values,value){const current=Array.isArray(values)?values:[];if(current.includes(value))return current.filter(x=>x!==value);const exclusive=x=>['不想回答','不想说','不确定','没明显困扰','没明显影响','没特别限制','想不起来','暂时不知道','没有特别调整','不想控制饮食','先了解，不调整','先不安排顺序','都不太适用','还不确定'].includes(x);return exclusive(value)?[value]:[...current.filter(x=>!exclusive(x)),value]}
 function set(s,key,value){const n=copy(s);n.answers[key]=value;if(key!=='plan')delete n.answers.plan;if(key==='schedule'&&s.answers.schedule!==value){delete n.answers.times;if(value==='不想回答')delete n.answers.sleepAmount}if(key==='concerns'){if(!value.includes('想晚点睡自己的时间')){delete n.answers.causes;delete n.notes.causes}if(!value.some(x=>!['没明显困扰','不确定'].includes(x))){for(const k of ['duration','impact']){delete n.answers[k];delete n.notes[k]}}}if(key==='foods'){const f=n.answers.frequency||{};n.answers.frequency=Object.fromEntries(value.map(v=>[v,f[v]||'不确定']))}return n}
 function move(values,index,direction){const next=[...values],target=index+direction;if(target<0||target>=next.length)return next;[next[index],next[target]]=[next[target],next[index]];return next}
 function inBed(start,end){if(!/^\d{2}:\d{2}$/.test(start||'')||!/^\d{2}:\d{2}$/.test(end||''))return null;const mins=t=>{const [h,m]=t.split(':').map(Number);return h<=23&&m<=59?h*60+m:null},a=mins(start),b=mins(end);if(a===null||b===null||a===b)return null;return (b-a+1440)%1440}
 function summary(s){return JSON.stringify({topic:s.topic,answers:s.answers,notes:s.notes},null,2)}
 function feedback(s){
  if(window.RuruChapters?.chapters[s.topic])return window.RuruChapters.feedback(s);
  const a=s.answers,known=[],effects=[],unknown=[],next=[],safety=[];
  for(const [key,val] of Object.entries(a)){if(key==='times'){for(const [day,t] of Object.entries(val||{})){known.push((day==='work'?'工作日':day==='off'?'休息日':a.schedule==='轮班或不固定'?'最近一次':'通常')+'：上床 '+(t.bed||'未填')+'；尝试入睡 '+(t.try||'未填')+'；起床 '+(t.wake||'未填'));const minutes=inBed(t.bed,t.wake);if(minutes!==null)known.push('上床至起床间隔 '+Math.floor(minutes/60)+'小时'+minutes%60+'分（在床窗口，不是实际睡眠）')}}else if(key==='frequency'){for(const [food,freq] of Object.entries(val||{}))known.push(food+'：'+freq)}else if(Array.isArray(val)&&val.length)known.push((key.endsWith('Priority')?'本人选择的优先顺序：':'')+val.join(' → '));else if(typeof val==='string'&&val)known.push(val)}
  for(const note of Object.values(s.notes||{}))if(note.trim())known.push('你补充：'+note.trim());
  if(s.topic==='sleep'){
   effects.push({text:'睡眠要一起看实际睡眠、质量和白天状态。单凭几点睡，或在床多久，不能判断你睡得够不够。',source:'sleep'});
   if(a.schedule==='轮班或不固定')effects.push({text:'轮班会限制可睡的时段，可以先找可保护的休息窗口；不把早睡早起当成人人都能做到的标准。',source:'shift'});
   if(a.causes?.includes('刷屏或娱乐'))effects.push({text:'如果屏幕活动挤占了想留给睡眠的时间，可以试着留一小段缓冲；需要先看它是否真的影响你的休息。',source:'shift'});
   unknown.push('还不知道每晚实际睡眠、夜间清醒和白天状态的完整变化，不能据此诊断睡眠障碍。');
   if(a.concerns?.includes('有人提到我睡着会呼吸停顿'))safety.push({text:'睡着呼吸停顿值得和专业人员讨论，这里无法判断原因。',source:'breathing'});
   if(['几周了','几个月或更久'].includes(a.duration)&&a.impact?.some(x=>['白天困倦','工作学习受影响'].includes(x)))safety.push({text:'困扰持续并影响白天生活，可以找合适的医疗专业人员讨论。',source:'sleep'});
   if(a.impact?.includes('开车或操作设备时犯困'))safety.push({text:'犯困时先避免驾驶或危险操作，安排安全休息或替代出行；持续困倦可寻求专业帮助。',source:'sleep'});
  }else if(s.topic==='diet'){
   effects.push({text:'饮食要看长期搭配、频率、总量和生活条件；喜欢某种食物不等于营养不足，也不代表需要减重。',source:'diet'});
   const frequent=food=>a.foods?.includes(food)&&['几乎每天','一周2—4次'].includes(a.frequency?.[food]);
   if(frequent('含糖饮料'))effects.push({text:'常喝含糖饮料可能增加游离糖摄入；可以了解无糖替代。不能由此推断你有糖尿病，单一食物也不是疾病的唯一原因。',source:'diet'});
   if(frequent('腌制或加工食品'))effects.push({text:'部分腌制或加工食品钠较高，可以比较食品标签。长期高盐饮食会增加血压升高的风险，但这份盘点不能判断你的总盐量或血压。',source:'diet'});
   unknown.push('没有记录总体食量和完整搭配，无法判断营养是否充足；不需要为继续盘点提供体重或热量。');
  }else{
   effects.push({text:'生活里的走路、出行和家务也属于身体活动。可以按自己的条件从少量开始，减少久坐，不必一次完成整套锻炼。',source:'activity'});
   unknown.push('还不知道活动强度、时长及身体条件，不能用活动天数判断是否达到指南，也不能推定你懒惰。');
   if(a.limits?.includes('活动时有疼痛或不适'))safety.push({text:'不适时先停下或减少活动，持续或反复不适应咨询专业人员。胸痛、晕厥或严重异常呼吸困难时停止活动并及时求助；严重症状正在发生时寻求当地急救。',source:'safety'});
  }
  const priorities=a[s.topic+'Priority']||[];if(priorities.length)next.push('你想先关注：'+priorities.join(' → ')+'。这是你的偏好顺序，不是健康风险排名。');else next.push('还没选调整方向，可以先了解，也可以不行动。');
  const methods={sleep:{'留出休息时间':a.causes?.some(x=>['工作或轮班','照顾别人'].includes(x))?'先看看有没有一小段可协商、有人能分担的休息窗口。':'给一次睡前留一点缓冲，不要求立刻提前到某个钟点。','入睡前放松':'试一种你愿意的安静过渡，比如先放下手头一件非紧急的事。','减少夜间打断':'先留意一次夜间打断来自哪里，再选一个可调整的环境因素。','了解白天疲惫':'简单记几天实际睡眠和白天感受；持续受影响时与专业人员讨论。'},diet:{'吃饭更规律':'给一顿饭找一个现实可行的时间，或备一份方便获得的食物。','搭配多一点变化':'在现有预算和选择内，下一顿增加或轮换一种食材，不用追求昂贵搭配。','看看饮料选择':'下次想喝时比较一种无糖饮品，是否更换仍由你决定。','了解盐和食品标签':'比较一次同类食品的钠标示，不凭口味估算总盐量。'},activity:{'少坐一会儿':'找一次方便的间隙，按身体条件换姿势或短暂活动，不适时先停。','找喜欢的活动':a.preferences?.length?'从你选的“'+a.preferences[0]+'”了解一种负担得起的做法，也可以换方向。':'先想一种你愿意接近的活动，不必马上锻炼。','降低开始的负担':'把一次活动缩小到当前条件能承受的程度；需要协助时先安排支持。','先了解身体不适':'先暂停引起不适的活动，持续或反复不适应寻求合适的专业评估。'}};
  const suggestions=priorities.filter(p=>methods[s.topic][p]).slice(0,2).map(p=>methods[s.topic][p]);
  if(a.readiness==='暂时不调整'||priorities.includes('先了解，不调整')){suggestions.length=0;next.push('先保留这些信息，不需要安排动作。')}else if(suggestions.length)next.push(a.readiness==='已经在尝试'?'也可以先看看现有做法是否减轻了负担。':'下面是可选办法，是否尝试由你决定。');
  if(!known.length)known.push('这次还没有提供习惯信息。');
  return {known,effects,unknown,next,safety,suggestions};
 }
 function context(s){const title=window.RuruChapters?.chapters[s.topic]?.title||{sleep:'睡眠与休息',diet:'吃饭与饮食',activity:'活动与久坐'}[s.topic];return '本次主题：'+title+'。以下为本人点选或补充，未提供的内容仍未知：\n'+feedback(s).known.join('\n')}
 window.RuruHealth={sources,options,cards,create,valid,toggle,set,move,inBed,summary,feedback,context};
})();
