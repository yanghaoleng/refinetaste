"""设计积累 / RefineTaste: same-origin analytics, aggregate-only administration, stdlib runtime."""
import os, json, sqlite3, hashlib, hmac, secrets, time, re, threading, mimetypes
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from http.cookies import SimpleCookie
from urllib.parse import urlparse, parse_qs
import reviewer

ROOT = Path(__file__).resolve().parent.parent
BASE = '/refinetaste'
ZONE = timezone(timedelta(hours=8))
DB = os.environ.get('REFINETASTE_DB', str(ROOT / '.runtime/analytics.sqlite3'))
SECRET = os.environ.get('REFINETASTE_SECRET', '')
PIN_HASH = os.environ.get('REFINETASTE_PIN_SHA256', '')
ORIGINS = set(os.environ.get('REFINETASTE_ORIGINS', 'https://mikeywa.site,https://www.mikeywa.site').split(','))
CORRECT = [1, 1, 1, 1, 0, 1, 1, 1]
COURSE = json.loads((ROOT / 'dist/course.json').read_text())
QUESTIONS = COURSE['questions']
NAMES = ['对比', '重复', '亲密', '对齐', '场景与调性', '信息层级', '用户路径', '协作表达']
UUID = re.compile(r'^[a-f0-9-]{36}$')
lock = threading.Lock()
sessions, attempts, collect_rates, review_rates = {}, {}, {}, {}
review_slots = threading.BoundedSemaphore(4)

@contextmanager
def connect():
    db = sqlite3.connect(DB, timeout=10)
    db.row_factory = sqlite3.Row
    try:
        with db:
            yield db
    finally:
        db.close()

def init_db():
    Path(DB).parent.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.executescript('''CREATE TABLE IF NOT EXISTS events(
          id TEXT PRIMARY KEY, day TEXT NOT NULL, ts REAL NOT NULL,
          visitor TEXT NOT NULL, session TEXT NOT NULL, kind TEXT NOT NULL,
          run TEXT, start INTEGER, q INTEGER, choice INTEGER);
          CREATE INDEX IF NOT EXISTS events_day ON events(day);
          CREATE UNIQUE INDEX IF NOT EXISTS answer_once ON events(run,q) WHERE kind='answer';
          CREATE UNIQUE INDEX IF NOT EXISTS start_once ON events(run) WHERE kind='start';
          CREATE UNIQUE INDEX IF NOT EXISTS complete_once ON events(run) WHERE kind='complete';
          CREATE TABLE IF NOT EXISTS review_usage(id TEXT PRIMARY KEY, day TEXT, client TEXT, q INTEGER);''')
        if 'course' not in [r[1] for r in db.execute('PRAGMA table_info(events)')]:
            db.execute('ALTER TABLE events ADD COLUMN course INTEGER NOT NULL DEFAULT 1')

def digest(s):
    return hmac.new(SECRET.encode(), s.encode(), hashlib.sha256).hexdigest()

def collect(data, now=None):
    now = time.time() if now is None else now
    kind = data.get('kind')
    if kind not in ('view','start','answer','complete','note_saved'):
        raise ValueError('invalid event')
    for key in ('id','visitor','session'):
        if not isinstance(data.get(key),str) or not UUID.fullmatch(data[key]):
            raise ValueError('invalid identity')
    run = data.get('run')
    if kind != 'view' and (not isinstance(run,str) or not UUID.fullmatch(run)):
        raise ValueError('invalid run')
    course = data.get('course',1)
    if type(course) is not int or course not in (1,2):raise ValueError('invalid course')
    start = data.get('start')
    if kind == 'start' and (type(start) is not int or start not in ((0,4,6) if course==1 else (0,8,16))):
        raise ValueError('invalid start')
    q, choice = data.get('q'), data.get('choice')
    if kind == 'answer' and (type(q) is not int or q not in range(8 if course==1 else 24) or type(choice) is not int or choice not in (0,1,-1)):
        raise ValueError('invalid answer')
    if kind=='answer':
        if course==1 and choice not in (0,1):raise ValueError('invalid answer')
        if course==2 and ((QUESTIONS[q]['kind']=='open' and choice!=-1) or (QUESTIONS[q]['kind']=='choice' and choice not in (0,1))):raise ValueError('invalid answer')
    day = datetime.fromtimestamp(now, ZONE).date().isoformat()
    visitor, session = digest(data['visitor']), digest(data['session'])
    with connect() as db:
        if kind in ('answer','complete','note_saved'):
            begun=db.execute("SELECT * FROM events WHERE kind='start' AND run=? AND visitor=? AND session=?",(run,visitor,session)).fetchone()
            if not begun: raise ValueError('run not started')
            if begun['course']!=course:raise ValueError('course mismatch')
            if kind=='answer' and (q < begun['start'] or (course==2 and q>=begun['start']+8)):raise ValueError('invalid question')
            if kind=='complete':
                count=db.execute("SELECT COUNT(*) FROM events WHERE run=? AND kind='answer'",(run,)).fetchone()[0]
                if count!=(8-begun['start'] if course==1 else 8): raise ValueError('run incomplete')
        db.execute('INSERT OR IGNORE INTO events(id,day,ts,visitor,session,kind,run,start,q,choice,course) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
          (data['id'],day,now,visitor,session,kind,run,start,q,choice,course))
        # Store only a rolling 90 days; no raw IP, UA, prompt or note text enters this table.
        db.execute('DELETE FROM events WHERE ts < ?', (now-90*86400,))

def summary(days, now=None):
    now = time.time() if now is None else now
    today = datetime.fromtimestamp(now,ZONE).date()
    first = today-timedelta(days=days-1)
    start = datetime.combine(first,datetime.min.time(),ZONE).timestamp()
    with connect() as db:
        rows = db.execute('SELECT * FROM events WHERE ts>=? AND ts<=?',(start,now)).fetchall()
        earliest=db.execute('SELECT MIN(ts) FROM events').fetchone()[0]
    views=[r for r in rows if r['kind']=='view']
    starts=[r for r in rows if r['kind']=='start']
    runids={r['run'] for r in starts}
    answers=[r for r in rows if r['kind']=='answer' and r['run'] in runids]
    completions={r['run'] for r in rows if r['kind']=='complete' and r['run'] in runids}
    active={r['visitor'] for r in rows}
    daily=[]
    for n in range(days):
        day=(first+timedelta(days=n)).isoformat()
        dv=[r for r in views if r['day']==day]
        ds=[r for r in starts if r['day']==day]
        daily.append({'day':day,'covered':bool(earliest is not None and day>=datetime.fromtimestamp(earliest,ZONE).date().isoformat()),'views':len(dv),'visitors':len({r['visitor'] for r in dv}),'starts':len(ds),'completed':sum(r['run'] in completions for r in ds)})
    questions=[]
    for version,catalog in ((1,[{'principle':name,'correct':CORRECT[i],'kind':'choice'} for i,name in enumerate(NAMES)]),(2,QUESTIONS)):
        for q,item in enumerate(catalog):
            a=[r for r in answers if r['q']==q and r['course']==version]
            submitted=a
            entrants={r['run'] for r in starts if r['course']==version and r['start']<=q and (version==1 or q<r['start']+8)}
            questions.append({'index':q,'course':version,'kind':item['kind'],'name':item['principle'],'answers':len(submitted),'correct':sum(r['choice']==item['correct'] for r in submitted) if item['kind']=='choice' else None,'eligible':len(entrants)})
    chapters=[]
    for version,starts_at in ((1,(0,4,6)),(2,(0,8,16))):
        for ch in starts_at:
            r=[r for r in starts if r['start']==ch and r['course']==version]
            chapters.append({'course':version,'start':ch,'runs':len(r),'completed':sum(x['run'] in completions for x in r)})
    return {'days':days,'from':first.isoformat(),'to':today.isoformat(),'timezone':'Asia/Shanghai',
      'generatedAt':datetime.fromtimestamp(now,ZONE).isoformat(),'collectedSince':datetime.fromtimestamp(earliest,ZONE).isoformat() if earliest else None,
      'metrics':{'views':len(views),'visitors':len(active),'sessions':len({r['session'] for r in rows}),'starts':len(starts),'completed':len(completions),'answers':len(answers),'notes':sum(r['kind']=='note_saved' for r in rows)},
      'daily':daily,'questions':questions,'chapters':chapters}

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def reply(self,code,data=None,cookie=None):
        raw=json.dumps(data,ensure_ascii=False).encode() if data is not None else b''
        self.send_response(code)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Content-Length',str(len(raw)))
        if cookie:self.send_header('Set-Cookie',cookie)
        self.end_headers()
        self.wfile.write(raw)
    def authorized(self):
        try:
            cookie=SimpleCookie(self.headers.get('Cookie',''))
            token=cookie['refinetaste_admin'].value
        except (KeyError,ValueError):return False
        with lock:return sessions.get(digest(token),0)>time.time()
    def body(self):
        try:
            size=int(self.headers.get('Content-Length','0'))
            if size<2 or size>16384:raise ValueError()
            data=json.loads(self.rfile.read(size))
            if not isinstance(data,dict):raise ValueError()
            return data
        except (ValueError,json.JSONDecodeError):raise ValueError('invalid body')
    def do_POST(self):
        path=urlparse(self.path).path
        if self.headers.get('Origin') not in ORIGINS:
            return self.reply(403,{'error':'origin rejected'})
        if path not in (BASE+'/api/login',BASE+'/api/logout',BASE+'/api/collect',BASE+'/api/review'):
            return self.reply(404,{'error':'not found'})
        key=digest(self.headers.get('X-Real-IP',self.client_address[0]))
        now=time.time()
        with lock:
            for mapping in (attempts,collect_rates,review_rates,sessions):
                if len(mapping)>10000:
                    mapping.clear()
        if path.endswith('/review'):
            return self.review_request(key,now)
        if path.endswith('/login'):
            with lock:
                count,until=attempts.get(key,(0,now+300))
                if until<=now:count,until=0,now+300
                if count>=5:return self.reply(429,{'error':'尝试过于频繁，请稍后再试。','retryAfter':max(1,int(until-now))})
            try:data=self.body()
            except ValueError:return self.reply(400,{'error':'invalid body'})
            code=str(data.get('code',''))
            valid=re.fullmatch(r'\d{6}',code) and hmac.compare_digest(hashlib.sha256(code.encode()).hexdigest(),PIN_HASH)
            if not valid:
                with lock:attempts[key]=(count+1,until)
                return self.reply(401,{'error':'访问码不正确。'})
            token=secrets.token_urlsafe(32)
            with lock:
                sessions[digest(token)]=now+8*3600
                attempts.pop(key,None)
            return self.reply(200,{'ok':True},f'refinetaste_admin={token}; HttpOnly; Secure; SameSite=Strict; Path={BASE}/api/')
        if path.endswith('/logout'):
            try:
                c=SimpleCookie(self.headers.get('Cookie',''));token=c['refinetaste_admin'].value
                with lock:sessions.pop(digest(token),None)
            except (KeyError,ValueError):pass
            return self.reply(200,{'ok':True},f'refinetaste_admin=; HttpOnly; Secure; SameSite=Strict; Path={BASE}/api/; Max-Age=0')
        with lock:
            count,until=collect_rates.get(key,(0,now+60))
            if until<=now:count,until=0,now+60
            collect_rates[key]=(count+1,until)
        if count>=180:return self.reply(429,{'error':'rate limited'})
        try:collect(self.body())
        except ValueError as ex:return self.reply(400,{'error':str(ex)})
        except sqlite3.Error:return self.reply(503,{'error':'storage unavailable'})
        return self.reply(204)
    def review_request(self,key,now):
        try:
            data=self.body()
            q=data.get('q');answer=data.get('answer');request_id=data.get('id');chat=data.get('mode')=='chat'
            messages=data.get('messages')
            if chat:messages=reviewer.validate_messages(messages)
            if type(q) is not int or q not in range(24) or (not chat and QUESTIONS[q]['kind']!='open'):raise ValueError()
            if not isinstance(answer,str) or not (1 if chat else 30)<=len(answer.strip())<=2000:raise ValueError()
            if not isinstance(request_id,str) or not UUID.fullmatch(request_id):raise ValueError()
        except ValueError:return self.reply(400,{'error':'请针对本题写下 30—2000 字的思路。'})
        if not reviewer.configured():return self.reply(503,{'error':'AI 暂未配置，暂时无法回复。你的想法已留在本机。'})
        day=datetime.fromtimestamp(now,ZONE).date().isoformat()
        with lock:
            count,until=review_rates.get(key,(0,now+60))
            if until<=now:count,until=0,now+60
            review_rates[key]=(count+1,until)
        if count>=4:return self.reply(429,{'error':'点评提交较快，请一分钟后再试。'})
        if not review_slots.acquire(blocking=False):return self.reply(429,{'error':'点评正在排队，请稍后重试。'})
        reserved=False
        try:
            with connect() as db:
                db.execute('BEGIN IMMEDIATE')
                db.execute('DELETE FROM review_usage WHERE day<?',(day,))
                if db.execute('SELECT COUNT(*) FROM review_usage WHERE day=? AND client=?',(day,key)).fetchone()[0]>=32 or db.execute('SELECT COUNT(*) FROM review_usage WHERE day=?',(day,)).fetchone()[0]>=300:
                    return self.reply(429,{'error':'今日模型点评额度已用完。可以先保存思路、对照提示，明天继续。'})
                try:db.execute('INSERT INTO review_usage VALUES(?,?,?,?)',(request_id,day,key,q))
                except sqlite3.IntegrityError:return self.reply(409,{'error':'这次请求已经提交，请等待结果或重新发起点评。'})
                reserved=True
            if chat:
                reply=reviewer.chat(QUESTIONS[q],messages)
                return self.reply(200,reply if isinstance(reply,dict) else {'reply':reply,'emotion':'neutral'})
            feedback=reviewer.review(QUESTIONS[q],answer.strip())
            return self.reply(200,{'feedback':feedback,'modelLabel':os.environ.get('REFINETASTE_AI_LABEL','设计教练')})
        except reviewer.ReviewUnavailable:
            if reserved:
                with connect() as db:db.execute('DELETE FROM review_usage WHERE id=?',(request_id,))
            return self.reply(502,{'error':'模型暂时没有完成点评，请重试。你的回答已留在本机，也可以先自行复盘。'})
        except sqlite3.Error:return self.reply(503,{'error':'点评服务暂时繁忙，请稍后重试。'})
        finally:review_slots.release()
    def do_GET(self):
        parsed=urlparse(self.path)
        path=parsed.path
        if path==BASE+'/api/health':
            try:
                with connect() as db:db.execute('SELECT 1 FROM events LIMIT 1')
            except sqlite3.Error:return self.reply(503,{'ok':False})
            return self.reply(200,{'ok':True})
        if path==BASE+'/api/summary':
            if not self.authorized():return self.reply(401,{'error':'authentication required'})
            try:
                days=int(parse_qs(parsed.query).get('days',['7'])[0])
                if days not in (7,30,90):raise ValueError()
                return self.reply(200,summary(days))
            except ValueError:return self.reply(400,{'error':'invalid period'})
            except sqlite3.Error:return self.reply(503,{'error':'storage unavailable'})
        if path==BASE or path==BASE+'/data':
            self.send_response(308);self.send_header('Location',path+'/');self.end_headers();return
        files={BASE+'/':'index.html',BASE+'/data/':'data/index.html',BASE+'/style.css':'style.css',BASE+'/app.js':'app.js',BASE+'/analytics.js':'analytics.js',BASE+'/data/admin.js':'data/admin.js',BASE+'/data/admin.css':'data/admin.css'}
        files[BASE+'/icons.svg']='icons.svg'
        for asset in ('theme.js','theme.css','motion.js','text-motion.js','text-motion.LICENSE.txt','motion.css','course.json','course.css'):
            files[BASE+'/'+asset]=asset
        for asset in ('chick-emotions.webp','chick-positive-emotions.webp','chick-starry-96.webp','chick-starry-192.webp','favicon-starry.ico','favicon-starry-32.png','apple-touch-starry.png','chick-positive-emotions.png','chick-emotions.png','chick-eyes-original.png','chick-eyes-128.webp','chick-eyes-512.webp','apple-touch-icon.png','favicon-32.png','favicon.ico'):
            files[BASE+'/assets/'+asset]='assets/'+asset
        if path not in files:return self.reply(404,{'error':'not found'})
        file=ROOT/'dist'/files[path]
        try:raw=file.read_bytes()
        except OSError:return self.reply(404,{'error':'not found'})
        self.send_response(200)
        mime=mimetypes.guess_type(file)[0] or 'application/octet-stream'
        self.send_header('Content-Type',mime+('; charset=utf-8' if mime.startswith('text/') or mime in ('application/javascript','image/svg+xml') else ''))
        self.send_header('Content-Length',str(len(raw)))
        self.send_header('Cache-Control','no-cache')
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'")
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','same-origin')
        self.end_headers();self.wfile.write(raw)

if __name__=='__main__':
    if len(SECRET)<32 or not re.fullmatch('[a-f0-9]{64}',PIN_HASH):
        raise SystemExit('REFINETASTE_SECRET and REFINETASTE_PIN_SHA256 must be configured')
    init_db()
    ThreadingHTTPServer(('127.0.0.1',int(os.environ.get('PORT','8797'))),Handler).serve_forever()
