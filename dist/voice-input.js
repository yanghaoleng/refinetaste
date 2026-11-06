/* A short, opt-in voice note is transcribed on the server; never replace the draft. */
(()=>{
 let active=null;
 const status=(state,text)=>{if(state.status?.isConnected)state.status.textContent=text};
 function release(state){clearTimeout(state.timer);clearInterval(state.watch);try{state.processor?.disconnect();state.source?.disconnect();state.silent?.disconnect()}catch{};state.stream?.getTracks().forEach(track=>track.stop());if(state.context)state.context.close().catch(()=>{});if(state.button?.isConnected){state.button.disabled=false;state.button.setAttribute('aria-pressed','false');state.button.setAttribute('aria-label','语音输入');state.button.title='语音输入'}if(active===state)active=null}
 function cancel(state){state.cancelled=true;state.abort?.abort();release(state)}
 async function start(button){
  const input=document.querySelector('#exercise #chat-input'),form=button.closest('form'),notice=form?.querySelector('#voice-status');if(!input||active)return;
  if(!navigator.mediaDevices?.getUserMedia||!(window.AudioContext||window.webkitAudioContext)){if(notice)notice.textContent='当前浏览器不支持录音，请使用文本输入。';return}
  const state=active={button,input,status:notice,chunks:[],samples:0,cancelled:false};button.disabled=true;status(state,'正在请求麦克风权限…');
  try{
   state.stream=await navigator.mediaDevices.getUserMedia({audio:true});if(state.cancelled||!input.isConnected){cancel(state);return}
   const Context=window.AudioContext||window.webkitAudioContext;state.context=new Context();await state.context.resume();if(state.cancelled||!input.isConnected){cancel(state);return}
   state.source=state.context.createMediaStreamSource(state.stream);state.processor=state.context.createScriptProcessor(4096,1,1);state.silent=state.context.createGain();state.silent.gain.value=0;
   state.processor.onaudioprocess=e=>{if(state.cancelled)return;const chunk=new Float32Array(e.inputBuffer.getChannelData(0));state.chunks.push(chunk);state.samples+=chunk.length};state.source.connect(state.processor);state.processor.connect(state.silent);state.silent.connect(state.context.destination);
   button.disabled=false;button.setAttribute('aria-pressed','true');button.setAttribute('aria-label','停止录音并转文字');button.title='停止录音';status(state,'录音中，再点一次结束；最长 30 秒。音频会发送给豆包识别。');
   state.timer=setTimeout(()=>finish(state),30000);state.watch=setInterval(()=>{if(!input.isConnected||!form.isConnected)cancel(state)},250);
  }catch(error){if(!state.cancelled)status(state,error.name==='NotAllowedError'?'麦克风权限未开启，可在浏览器设置中允许后重试。':'无法使用麦克风，请检查设备或手动输入。');release(state)}
 }
 function pcm16(state){const source=new Float32Array(state.samples);let offset=0;for(const part of state.chunks){source.set(part,offset);offset+=part.length}const ratio=state.context.sampleRate/16000,length=Math.min(480000,Math.floor(source.length/ratio)),output=new Int16Array(length);for(let i=0;i<length;i++){const from=Math.floor(i*ratio),to=Math.min(source.length,Math.floor((i+1)*ratio));let value=0;for(let j=from;j<Math.max(from+1,to);j++)value+=source[j]||0;value=Math.max(-1,Math.min(1,value/Math.max(1,to-from)));output[i]=value<0?value*32768:value*32767}return output}
 async function finish(state){
  if(active!==state||state.finishing)return;state.finishing=true;state.button.disabled=true;clearTimeout(state.timer);let pcm;
  try{pcm=pcm16(state)}catch{status(state,'录音处理失败，请重试。');release(state);return}
  state.stream.getTracks().forEach(track=>track.stop());state.processor.disconnect();state.source.disconnect();state.silent.disconnect();state.context.close().catch(()=>{});state.context=null;state.chunks=[];
  if(pcm.byteLength<3200){status(state,'录音太短，请重新录制。');release(state);return}
  status(state,'正在转成文字…');state.abort=new AbortController();const timeout=setTimeout(()=>state.abort.abort(),35000);
  try{const id=crypto.randomUUID();let data={};for(let offset=0,sequence=0;offset<pcm.byteLength;offset+=96000,sequence++){const end=Math.min(offset+96000,pcm.byteLength),response=await fetch('api/voice',{method:'POST',headers:{'Content-Type':'audio/pcm','X-Voice-Id':id,'X-Voice-Sequence':String(sequence),'X-Voice-Final':end===pcm.byteLength?'1':'0'},body:pcm.buffer.slice(offset,end),signal:state.abort.signal});data=await response.json();if(!response.ok)throw Error(data.error||'识别失败，请重试。')}if(state.cancelled||!state.input.isConnected)return;const text=(data.text||'').trim();if(!text){status(state,'没有识别到语音，请重试。');return}const input=state.input;if(input.value.length+text.length>input.maxLength){status(state,'草稿字数已满，请复制这段识别结果：'+text);return}const end=input.selectionEnd??input.value.length;input.setRangeText(text,end,end,'end');input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();status(state,'已加入识别文字，请检查后再发送。')
  }catch(error){if(!state.cancelled)status(state,error.name==='AbortError'?'识别超时，请重试。':error.message||'识别失败，请重试。')}
  finally{clearTimeout(timeout);release(state)}
 }
 document.addEventListener('submit',event=>{if(active&&event.target.id==='chat-form'){event.preventDefault();event.stopImmediatePropagation();status(active,'请先结束录音并等待识别完成。')}},true);
 document.addEventListener('click',event=>{const button=event.target.closest('#voice-input');if(!button)return;if(active&&active.button===button)finish(active);else start(button)});
})();
