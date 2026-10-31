/* Nourish&Thrive app layer: Supabase login, cloud sync of saved data, and AI through the Supabase "ai" function. */
(function(){
  var SB_URL='https://jzctsfvowmuowfxaiayy.supabase.co';
  var SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6Y3RzZnZvd211b3dmeGFpYXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MDM2OTUsImV4cCI6MjEwODk3OTY5NX0.H62HF0V9dC1u6lkKiA4HEi1S0-2w9dYxSSr5v_Gmkrc';
  var AUTH_KEY='ntauth', OWNER_KEY='ntowner', DIRTY_KEY='ntdirty';
  var LOCAL_ONLY={session:1};
  var realFetch=window.fetch.bind(window);
  var rawSet=Storage.prototype.setItem,rawRemove=Storage.prototype.removeItem;

  function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}

  /* ---------- auth ---------- */
  var session=null;
  try{session=JSON.parse(lsGet(AUTH_KEY)||'null')}catch(e){}
  function saveSession(s){
    if(s&&s.access_token){
      session={access_token:s.access_token,refresh_token:s.refresh_token,expires_at:s.expires_at||Math.floor(Date.now()/1000)+(s.expires_in||3600),user:s.user};
      lsSet(AUTH_KEY,JSON.stringify(session));
    }else{session=null;lsDel(AUTH_KEY)}
  }
  async function authCall(path,body,token){
    var h={'Content-Type':'application/json',apikey:SB_KEY};
    if(token)h.Authorization='Bearer '+token;
    var r=await realFetch(SB_URL+'/auth/v1/'+path,{method:'POST',headers:h,body:JSON.stringify(body||{})});
    var d={};try{d=await r.json()}catch(e){}
    if(!r.ok){var m=d.msg||d.error_description||d.message||d.error||'Something went wrong';throw new Error(m)}
    return d;
  }
  var refreshing=null;
  async function token(){
    if(!session)throw new Error('Please log in again');
    if(session.expires_at-90>Date.now()/1000)return session.access_token;
    if(!refreshing)refreshing=authCall('token?grant_type=refresh_token',{refresh_token:session.refresh_token})
      .then(function(d){saveSession(d);return d.access_token})
      .finally(function(){refreshing=null});
    return refreshing;
  }
  async function rest(method,path,body,extra){
    var t=await token();
    var h={apikey:SB_KEY,Authorization:'Bearer '+t,'Content-Type':'application/json'};
    for(var k in (extra||{}))h[k]=extra[k];
    var r=await realFetch(SB_URL+'/rest/v1/'+path,{method:method,headers:h,body:body?JSON.stringify(body):undefined});
    if(!r.ok)throw new Error('Sync failed ('+r.status+')');
    return r.status===204?null:r.json().catch(function(){return null});
  }

  /* ---------- cloud sync ---------- */
  var dirty={};
  try{dirty=JSON.parse(lsGet(DIRTY_KEY)||'{}')||{}}catch(e){dirty={}}
  function saveDirty(){lsSet(DIRTY_KEY,JSON.stringify(dirty))}
  function cloudValue(key,v){
    if(key==='account'){try{var a=JSON.parse(v);delete a.pw;return JSON.stringify(a)}catch(e){}}
    return v;
  }
  var timer=null,flushing=false;
  function schedule(){clearTimeout(timer);timer=setTimeout(flush,800)}
  async function flush(){
    if(flushing||!session){return}
    var keys=Object.keys(dirty);if(!keys.length)return;
    flushing=true;
    var uid=session.user&&session.user.id;
    var ups=[],dels=[];
    keys.forEach(function(k){
      var v=lsGet('nt:'+k);
      if(v===null)dels.push(k);else ups.push({user_id:uid,key:k,value:cloudValue(k,v)});
    });
    try{
      if(ups.length)await rest('POST','user_data?on_conflict=user_id,key',ups,{Prefer:'resolution=merge-duplicates,return=minimal'});
      for(var i=0;i<dels.length;i++)await rest('DELETE','user_data?key=eq.'+encodeURIComponent(dels[i]));
      keys.forEach(function(k){if(dirty[k])delete dirty[k]});saveDirty();
    }catch(e){setTimeout(schedule,15000)}
    flushing=false;
    if(Object.keys(dirty).length)schedule();
  }
  function markDirty(key){if(LOCAL_ONLY[key])return;dirty[key]=1;saveDirty();schedule()}
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')flush()});

  /* Catch writes the app makes straight to localStorage, too. */
  try{
    Storage.prototype.setItem=function(k,v){rawSet.call(this,k,v);if(this===window.localStorage&&typeof k==='string'&&k.indexOf('nt:')===0)markDirty(k.slice(3))};
    Storage.prototype.removeItem=function(k){rawRemove.call(this,k);if(this===window.localStorage&&typeof k==='string'&&k.indexOf('nt:')===0)markDirty(k.slice(3))};
  }catch(e){}

  /* The app's window.storage API: this phone first, then the cloud. */
  var mem={};
  function sk(key,shared){return (shared?'nt-shared:':'nt:')+key}
  window.storage={
    get:async function(key,shared){var v=lsGet(sk(key,shared));if(v===null)v=mem[sk(key,shared)];return v===null||v===undefined?null:{key:key,value:v}},
    set:async function(key,value,shared){var k=sk(key,shared);mem[k]=String(value);lsSet(k,String(value));return {key:key,value:value}},
    delete:async function(key,shared){var k=sk(key,shared);delete mem[k];lsDel(k);return {key:key,deleted:true}},
    list:async function(prefix,shared){var out=[],p=sk(prefix||'',shared);try{for(var i=0;i<localStorage.length;i++){var kk=localStorage.key(i);if(kk&&kk.indexOf(p)===0)out.push(kk.slice((shared?'nt-shared:':'nt:').length))}}catch(e){}return {keys:out}}
  };

  async function pullFromCloud(user){
    if(Object.keys(dirty).length&&lsGet(OWNER_KEY)===user.id)await flush();
    var rows=await rest('GET','user_data?select=key,value');
    if(lsGet(OWNER_KEY)!==user.id){
      var old=[];try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&(k.indexOf('nt:')===0||k.indexOf('nt-')===0))old.push(k)}}catch(e){}
      old.forEach(function(k){try{rawRemove.call(localStorage,k)}catch(e){}});
      dirty={};saveDirty();
    }
    (rows||[]).forEach(function(r){
      if(dirty[r.key])return;
      var v=typeof r.value==='string'?r.value:JSON.stringify(r.value);
      origSetSilent('nt:'+r.key,v);
    });
    lsSet(OWNER_KEY,user.id);
  }
  function origSetSilent(k,v){try{rawSet.call(localStorage,k,v)}catch(e){}}


  /* ---------- shared data (Squad, challenge, recipes, bookings) and coach role ---------- */
  var isCoach=false;
  function enc(v){return encodeURIComponent(v)}
  function snap(id,row){return {id:id,exists:!!row,data:function(){return row?row.data:undefined}}}
  function docRef(path){
    var i=path.indexOf('/'),col=path.slice(0,i),id=path.slice(i+1);
    var q='shared_docs?collection=eq.'+enc(col)+'&doc_id=eq.'+enc(id);
    return {
      id:id,
      get:async function(){var rows=await rest('GET',q+'&select=data');return snap(id,rows&&rows[0])},
      set:async function(data){await rest('POST','shared_docs?on_conflict=collection,doc_id',[{collection:col,doc_id:id,data:data||{}}],{Prefer:'resolution=merge-duplicates,return=minimal'})},
      update:async function(data){var cur=await this.get();var d=Object.assign({},cur.exists?cur.data():{},data||{});await this.set(d)},
      delete:async function(){await rest('DELETE',q)},
      acquire:async function(){return {acquired:true}},
      release:async function(){}
    };
  }
  function colRef(col,max){
    return {
      limit:function(n){return colRef(col,n)},
      doc:function(id){return docRef(col+'/'+id)},
      get:async function(){var rows=await rest('GET','shared_docs?collection=eq.'+enc(col)+'&select=doc_id,data&order=updated_at.desc&limit='+(max||500));return {docs:(rows||[]).map(function(r){return snap(r.doc_id,r)}),size:(rows||[]).length,empty:!(rows||[]).length}}
    };
  }
  var dbApi={doc:docRef,collection:function(c){return colRef(c)}};
  var userApi={id:async function(){return session&&session.user?session.user.id:null},isOwner:async function(){return isCoach},email:async function(){return session&&session.user?session.user.email:null}};
  window.claude={use:async function(name){
    if(name==='db')return dbApi;
    if(name==='user')return userApi;
    var e=new Error('Not available in this app');e.code='unavailable';throw e;
  }};
  async function loadRole(){
    try{var r=await realFetch(SB_URL+'/rest/v1/rpc/is_coach',{method:'POST',headers:{apikey:SB_KEY,Authorization:'Bearer '+(await token()),'Content-Type':'application/json'},body:'{}'});isCoach=r.ok&&(await r.json())===true}catch(e){isCoach=false}
  }

  /* ---------- messages from the coach ---------- */
  var notesOpen=false,lastNotesCheck=0;
  async function showCoachNotes(){
    if(notesOpen||!session)return;
    lastNotesCheck=Date.now();
    var notes;
    try{notes=await rest('GET','coach_notes?read_at=is.null&order=created_at.asc&select=id,body,created_at')}catch(e){return}
    if(!notes||!notes.length||notesOpen)return;
    notesOpen=true;
    var i=0;
    var wrap=document.createElement('div');
    wrap.setAttribute('role','dialog');wrap.setAttribute('aria-label','Message from your coach');
    wrap.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(20,56,42,.45);display:flex;align-items:flex-end;justify-content:center;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom,0px))';
    wrap.innerHTML='<div style="background:#fff;border-radius:24px;max-width:440px;width:100%;padding:20px 20px 16px;box-shadow:0 20px 50px -20px rgba(20,56,42,.5);font-family:\'Figtree\',system-ui,sans-serif;color:#1E2B25">'+
      '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#2B7F5A">Message from your coach</div>'+
      '<div id="ntn-date" style="font-size:12px;color:#66766F;margin:2px 0 10px"></div>'+
      '<div id="ntn-body" style="font-size:15.5px;line-height:1.55;white-space:pre-wrap;max-height:50vh;overflow:auto"></div>'+
      '<button id="ntn-ok" style="width:100%;margin-top:16px;border:none;border-radius:999px;padding:13px;font-size:15px;font-weight:700;color:#fff;background:linear-gradient(140deg,#2F8A63,#154D37);font-family:inherit;cursor:pointer"></button></div>';
    document.body.appendChild(wrap);
    function show(){
      var n=notes[i];
      wrap.querySelector('#ntn-body').textContent=n.body;
      wrap.querySelector('#ntn-date').textContent=new Date(n.created_at).toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+(notes.length>1?'  ·  '+(i+1)+' of '+notes.length:'');
      wrap.querySelector('#ntn-ok').textContent=i<notes.length-1?'Next message':'Got it';
    }
    wrap.querySelector('#ntn-ok').onclick=function(){
      var n=notes[i];
      rest('PATCH','coach_notes?id=eq.'+n.id,{read_at:new Date().toISOString()},{Prefer:'return=minimal'}).catch(function(){});
      i++;if(i<notes.length)show();else{wrap.remove();notesOpen=false}
    };
    show();
  }
  window.ntCheckCoachNotes=showCoachNotes;
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&document.getElementById('nt-app')&&document.getElementById('nt-app').dataset.ran&&Date.now()-lastNotesCheck>60000)showCoachNotes()});

  /* Hooks the app calls on Log out and Delete account. */
  window.ntSignOut=async function(){
    try{await flush()}catch(e){}
    try{if(session)await authCall('logout',{},session.access_token)}catch(e){}
    saveSession(null);location.reload();
  };
  window.ntDeleteServerData=async function(){
    dirty={};saveDirty();
    if(session&&session.user)await rest('DELETE','user_data?user_id=eq.'+session.user.id);
  };

  /* ---------- AI: send the app's Claude calls to the Supabase "ai" function ---------- */
  window.fetch=async function(url,opts){
    var u=typeof url==='string'?url:(url&&url.url)||'';
    if(u.indexOf('api.anthropic.com')===-1)return realFetch(url,opts);
    var t;try{t=await token()}catch(e){return new Response(JSON.stringify({error:{message:'Please log in again to use the coach'}}),{status:401,headers:{'Content-Type':'application/json'}})}
    return realFetch(SB_URL+'/functions/v1/ai',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+t},body:opts&&opts.body,signal:opts&&opts.signal});
  };

  /* ---------- login screen ---------- */
  function startApp(){
    var src=document.getElementById('nt-app');
    if(!src||src.dataset.ran)return;src.dataset.ran='1';
    var s=document.createElement('script');s.text=src.textContent;document.body.appendChild(s);
  }
  async function enter(user,password){
    await pullFromCloud(user);
    origSetSilent('nt:session','in');
    if(lsGet('nt:account')===null&&lsGet('nt:profile')!==null){
      origSetSilent('nt:account',JSON.stringify({name:'Member',email:user.email,pw:password||'',joined:new Date().toISOString().slice(0,10)}));
    }else if(password&&lsGet('nt:account')){
      try{var a=JSON.parse(lsGet('nt:account'));a.pw=password;a.email=a.email||user.email;origSetSilent('nt:account',JSON.stringify(a))}catch(e){}
    }
    await loadRole();
    startApp();
    setTimeout(showCoachNotes,1500);
  }

  var css='.ntl{max-width:400px;margin:0 auto;padding:48px 22px 40px;font-family:"Figtree",system-ui,sans-serif;color:#1E2B25}'+
  '.ntl h1{font-family:"Quicksand","Figtree",sans-serif;font-size:34px;line-height:1.05;margin:0 0 6px;color:#1F6B4C}'+
  '.ntl p{margin:0 0 22px;color:#66766F;font-size:14.5px;line-height:1.5}'+
  '.ntl label{display:block;font-size:12.5px;font-weight:700;margin:14px 0 6px}'+
  '.ntl input{width:100%;box-sizing:border-box;border:1.5px solid #E2ECE6;border-radius:14px;padding:13px 14px;font-size:16px;background:#fff;color:#1E2B25;font-family:inherit}'+
  '.ntl .go{width:100%;margin-top:20px;border:none;border-radius:999px;padding:14px;font-size:15.5px;font-weight:700;color:#fff;background:linear-gradient(140deg,#2F8A63,#154D37);font-family:inherit;cursor:pointer}'+
  '.ntl .go:disabled{opacity:.6}'+
  '.ntl .lnk{display:block;width:100%;background:none;border:none;color:#1F6B4C;font-weight:600;font-size:14px;margin-top:14px;font-family:inherit;cursor:pointer}'+
  '.ntl .msg{margin-top:14px;font-size:13.5px;line-height:1.45;border-radius:12px;padding:10px 12px}'+
  '.ntl .err{background:#FBE9E5;color:#9A3422}.ntl .ok{background:#E7F0EA;color:#2F5A3F}';

  function showLogin(note){
    var root=document.getElementById('root');
    var mode='in';
    root.innerHTML='<style>'+css+'</style><form class="ntl" novalidate>'+
      '<h1>Nourish<br>&amp;Thrive</h1><p id="ntl-sub"></p>'+
      '<label for="ntl-e">Email</label><input id="ntl-e" type="email" autocomplete="email" autocapitalize="none">'+
      '<div id="ntl-pw"><label for="ntl-p">Password</label><input id="ntl-p" type="password" autocomplete="current-password"></div>'+
      '<button class="go" type="submit" id="ntl-go"></button>'+
      '<button class="lnk" type="button" id="ntl-sw"></button>'+
      '<button class="lnk" type="button" id="ntl-fg">Forgot password?</button>'+
      '<div id="ntl-msg"></div></form>';
    var f=root.querySelector('form'),e=root.querySelector('#ntl-e'),p=root.querySelector('#ntl-p'),go=root.querySelector('#ntl-go'),sw=root.querySelector('#ntl-sw'),fg=root.querySelector('#ntl-fg'),msg=root.querySelector('#ntl-msg'),sub=root.querySelector('#ntl-sub'),pw=root.querySelector('#ntl-pw');
    function say(t,ok){msg.innerHTML=t?'<div class="msg '+(ok?'ok':'err')+'"></div>':'';if(t)msg.firstChild.textContent=t}
    function render(){
      sub.textContent=mode==='in'?'Welcome back. Log in to your coach.':mode==='up'?'Create your account. Your progress is saved safely online.':'Enter your email and we will send you a link to reset your password.';
      go.textContent=mode==='in'?'Log in':mode==='up'?'Create account':'Send reset link';
      sw.textContent=mode==='in'?'New here? Create an account':'I already have an account';
      pw.style.display=mode==='reset'?'none':'block';fg.style.display=mode==='in'?'block':'none';
      p.autocomplete=mode==='up'?'new-password':'current-password';
    }
    sw.onclick=function(){mode=mode==='in'?'up':'in';say('');render()};
    fg.onclick=function(){mode='reset';say('');render()};
    f.onsubmit=async function(ev){
      ev.preventDefault();say('');
      var em=e.value.trim().toLowerCase(),pwd=p.value;
      if(em.indexOf('@')<1){say('Please enter a valid email address.');return}
      if(mode!=='reset'&&pwd.length<6){say('Password needs at least 6 characters.');return}
      go.disabled=true;var label=go.textContent;go.textContent='Please wait…';
      try{
        if(mode==='reset'){await authCall('recover',{email:em});say('Done. Check your email for the reset link.',true)}
        else if(mode==='up'){
          var d=await authCall('signup',{email:em,password:pwd});
          if(d.access_token){saveSession(d);await enter(d.user,pwd);return}
          say('Almost there. We sent a link to '+em+'. Tap it to confirm your email, then come back and log in.',true);mode='in';render();
        }else{
          var s=await authCall('token?grant_type=password',{email:em,password:pwd});
          saveSession(s);await enter(s.user,pwd);return;
        }
      }catch(err){
        var m=String(err&&err.message||'');
        say(/invalid login/i.test(m)?'Wrong email or password.':/not confirmed/i.test(m)?'Please confirm your email first. Check your inbox for our link.':/already registered|already exists/i.test(m)?'This email already has an account. Log in instead.':/Failed to fetch|network/i.test(m)?'No internet connection. Check it and try again.':m);
      }
      go.disabled=false;go.textContent=label;
    };
    render();if(note)say(note);
  }

  async function boot(){
    if(session&&session.user){
      try{await token();await enter(session.user,null);return}
      catch(e){
        if(/Failed to fetch|network/i.test(String(e&&e.message))&&lsGet(OWNER_KEY)===session.user.id){startApp();return}
        saveSession(null);showLogin('Please log in again.');return;
      }
    }
    showLogin();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
