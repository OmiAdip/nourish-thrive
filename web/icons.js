/* DropASize icons: one light line set used everywhere, replacing emojis. */
(function(){
  var P={
    bowl:'M3 11h18a9 9 0 0 1-18 0Z M8 7c0-1.5 1-2 1-3.5 M12 7c0-1.5 1-2 1-3.5 M16 7c0-1.5 1-2 1-3.5',
    egg:'M12 3c3.5 0 6.5 5 6.5 9.5a6.5 6.5 0 0 1-13 0C5.5 8 8.5 3 12 3Z',
    cup:'M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V8Z M16 10h1.5a2.5 2.5 0 0 1 0 5H16 M8 3.5v2 M11 3.5v2',
    apple:'M12 7c-2-1.5-7-1.5-7 4.5S9 21 12 19c3 2 7-1.5 7-7.5S14 5.5 12 7Z M12 7c0-2 1-3.5 3-4',
    leaf:'M5 19c0-8 5-14 15-14 0 10-6 15-14 15 M5 19c3-5 6-7 9-8.5',
    drop:'M12 3.5c3 4 6 7.3 6 10.5a6 6 0 0 1-12 0c0-3.2 3-6.5 6-10.5Z',
    flame:'M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-2 2-3 4-3 6-1-1-1.5-2-1.5-3C7 10 6 12.5 6 15a6 6 0 0 0 6 6Z',
    dumbbell:'M3 10v4 M6 7.5v9 M18 7.5v9 M21 10v4 M6 12h12',
    run:'M14 4.5a1.5 1.5 0 1 0 0 .01 M10 21l2-6-3-3 2-4 3 3h3 M7 12l2-4h4 M12 15l3 2v4',
    shoe:'M3 16v-5.5l4 1 3-3.5 3 3.5 8 2.5v2H3Z M3 19h18',
    lotus:'M12 18c-4 0-8-2-9-5 3 0 6 1 9 5Zm0 0c4 0 8-2 9-5-3 0-6 1-9 5Zm0 0c-2-3-2-8 0-12 2 4 2 9 0 12Z',
    heart:'M12 20s-7.5-4.5-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.5-7.5 10-7.5 10Z',
    moon:'M19 14.5A7.5 7.5 0 0 1 9.5 5 7.5 7.5 0 1 0 19 14.5Z',
    sun:'M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z M12 2.5v2 M12 19.5v2 M2.5 12h2 M19.5 12h2 M5.3 5.3l1.4 1.4 M17.3 17.3l1.4 1.4 M5.3 18.7l1.4-1.4 M17.3 6.7l1.4-1.4',
    sparkle:'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z M19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16Z',
    check:'M4.5 12.5l5 5 10-11',
    lock:'M6 11h12v9H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3',
    trophy:'M7 4h10v5a5 5 0 0 1-10 0V4Z M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11 M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5 M12 14v4 M8.5 20.5h7',
    star:'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z',
    calendar:'M4 6h16v14H4z M4 10h16 M8 3.5v4 M16 3.5v4',
    clock:'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z M12 7.5V12l3 2',
    timer:'M12 6a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z M12 10v4 M10 2.5h4 M18.5 6.5l1.5-1.5',
    brain:'M9 4.5a3 3 0 0 0-3 3 3 3 0 0 0-1.5 5.5A3 3 0 0 0 9 18v1.5h3V4.5H9Z M15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 1.5 5.5A3 3 0 0 1 15 18v1.5h-3',
    chat:'M4.5 5.5h15v10h-9l-4.5 3.5v-3.5H4.5z',
    camera:'M4 8h3l1.5-2.5h7L17 8h3v11H4z M12 10.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
    chart:'M4 20V4 M4 20h16 M8 16l3.5-4 3 2.5L20 8',
    target:'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z M12 11.25a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z',
    cart:'M3.5 4.5h2.5l2 10.5h10l2-7.5H7 M9.5 19.5a.75.75 0 1 0 0 .01 M17 19.5a.75.75 0 1 0 0 .01',
    book:'M4.5 5.5c2.5-1 5-1 7.5.5v13c-2.5-1.5-5-1.5-7.5-.5v-13Z M19.5 5.5c-2.5-1-5-1-7.5.5v13c2.5-1.5 5-1.5 7.5-.5v-13Z',
    gift:'M4 9h16v4H4z M5.5 13h13v7.5h-13z M12 9v11.5 M12 9C10 5 7 5.5 7 7.5S10 9 12 9Zm0 0c2-4 5-3.5 5-1.5S14 9 12 9Z',
    bell:'M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2Z M10 20.5a2 2 0 0 0 4 0',
    wave:'M3 9c2.5-2 4.5-2 7 0s4.5 2 7 0 3-1.5 4-1 M3 15c2.5-2 4.5-2 7 0s4.5 2 7 0 3-1.5 4-1',
    alert:'M12 4l9 15.5H3L12 4Z M12 10v4 M12 16.8v.2',
    wind:'M3 9h11a2.5 2.5 0 1 0-2.5-2.5 M3 13h15a2.5 2.5 0 1 1-2.5 2.5 M3 17h7',
    mail:'M4 6.5h16v11H4z M4 7l8 6 8-6',
    people:'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M3.5 19.5a5.5 5.5 0 0 1 11 0 M16 11a2.5 2.5 0 1 0 0-5 M16.5 14a4.5 4.5 0 0 1 4 5.5',
    smile:'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z M8.5 14a4 4 0 0 0 7 0 M9 9.5v.5 M15 9.5v.5',
    bulb:'M9 17.5h6 M10 20.5h4 M12 3.5a6 6 0 0 0-3.5 10.9V16h7v-1.6A6 6 0 0 0 12 3.5Z',
    scale:'M4.5 4.5h15v15h-15z M9 8.5a4 4 0 0 1 6 0l-2 2.5h-2L9 8.5Z',
    pencil:'M15.5 4.5l4 4L9 19H5v-4L15.5 4.5Z',
    pin:'M12 21s6.5-6 6.5-11a6.5 6.5 0 0 0-13 0c0 5 6.5 11 6.5 11Z M12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
    music:'M9 18V6l10-2v12 M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z M19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z',
    home:'M4 11l8-6.5 8 6.5v9H4z M10 20v-5h4v5',
    phone:'M7 3.5h10v17H7z M11 17.5h2',
    flag:'M5.5 21V4 M5.5 4.5h11l-2 3.5 2 3.5h-11',
    dot:'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
    bolt:'M13 3L5 13.5h6L10 21l8-10.5h-6L13 3Z',
    shield:'M12 3.5l7 2.5v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6l7-2.5Z',
    tooth:'M12 6.5C9 3.5 5 4.5 5 8.5c0 3 1.5 4.5 2 7.5s1.5 4.5 2.5 4.5 1-4 2.5-4 1.5 4 2.5 4 2-1.5 2.5-4.5 2-4.5 2-7.5c0-4-4-5-7-2Z',
    bike:'M6 17.5a3.5 3.5 0 1 0 0-.01 M18 17.5a3.5 3.5 0 1 0 0-.01 M6 17.5l3.5-7h6l2.5 7 M9.5 10.5L8 7h-2 M13 7h2.5l1 3.5',
    swim:'M3 18c2.5-2 4.5-2 7 0s4.5 2 7 0 3-1.5 4-1 M8 14l4-4.5-2.5-2 M15 10.5a1.5 1.5 0 1 0 0-.01'
  };
  window.NT_ICON_PATHS=P;
  function svg(name,color,sw){
    var d=P[name]||P.dot;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="'+(color||'#000')+'" stroke-width="'+(sw||1.6)+'" stroke-linecap="round" stroke-linejoin="round"><path d="'+d+'"/></svg>';
  }
  window.ntIconSvg=svg;
  function uri(name){return 'url("data:image/svg+xml,'+encodeURIComponent(svg(name,'#000',1.6))+'")'}

  /* Emoji -> icon name. Anything not listed gets a neutral icon by its group. */
  var MAP={};
  function m(names,list){list.split(' ').forEach(function(e){if(e)MAP[e]=names})}
  m('bowl','🍳 🥣 🥗 🍗 🍛 🥘 🍲 🍝 🥙 🌯 🥪 🍞 🍕 🍔 🍟 🌮 🍜 🍱 🍣 🍤 🥟 🥞 🧇 🥓 🥩 🍖 🌭 🥫 🫕 🥡 🧆 🫔 🥯 🥨 🥐 🍚 🍙 🍘 🫓 🥧 🍽 🍴 🧂 🫙 🥄 🧈 🍿');
  m('egg','🥚');
  m('apple','🍎 🍏 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🫒 🥑 🍆 🥔 🥕 🌽 🌶 🫑 🥒 🥬 🥦 🧄 🧅 🍄 🥜 🫘 🌰 🫚 🫛');
  m('cup','🥛 ☕ 🍵 🧃 🥤 🧋 🍶 🍺 🍷 🥂 🍸 🍹 🧉 🫖');
  m('heart','🍫 🍬 🍭 🍮 🍯 🍰 🎂 🧁 🍩 🍪 🍦 🍧 🍨');
  m('drop','💧 🚰 🧊 💦 🫗');
  m('flame','🔥');
  m('dumbbell','🏋 💪 🦵 🦴 🏏 🥊');
  m('run','🏃 🚶 🤸 ⛹ 🤾 💃 🕺 🧗');
  m('shoe','👟 🥾 👣');
  m('lotus','🧘 🪷 🌸 🌺 🌼 🌻 🌷 💐');
  m('heart','❤ 🧡 💛 💚 💙 💜 🤍 🤎 🖤 💗 💖 💕 💞 💓 💝 🩷 🩵 🩶 ♥ 💘 🫶 🤗 🥰');
  m('moon','🌙 🌛 🌜 🌚 💤 😴 🛌 🌃 🌌');
  m('sun','☀ 🌞 🌅 🌄 🌤 ⛅ 🌇');
  m('sparkle','✨ ⭐ 🌟 💫 🌈 🎉 🎊 🥳 👏 🙌 🪄 ⚡');
  m('check','✅ ✔ ☑ 👍 👌 🆗');
  m('lock','🔒 🔐 🔏 🗝 🔑');
  m('trophy','🏆 🥇 🥈 🥉 🏅 🎖 👑');
  m('star','⭐');
  m('calendar','📅 📆 🗓');
  m('clock','⏰ 🕐 🕑 🕒 🕓 🕔 🕕 🕖 🕗 🕘 🕙 🕚 🕛 ⌚');
  m('timer','⏱ ⏲ ⏳ ⌛');
  m('brain','🧠 🤔 🧐');
  m('chat','💬 🗨 🗯 📣 📢 🙋');
  m('camera','📸 📷 🤳 🎥 📹 🎬');
  m('chart','📊 📈 📉 📏 📐');
  m('target','🎯');
  m('cart','🛒 🛍 🏪 🧺');
  m('book','📖 📚 📕 📗 📘 📙 📓 📔 📒 🧾 📋 📃 📄 📑 🗒');
  m('gift','🎁 🎀');
  m('bell','🔔 🔕 📯');
  m('wave','🌊 🏄');
  m('alert','🆘 🚨 ⚠ ❗ ❕ ‼ ⛔ 🚫 ❌ ✖');
  m('wind','🫁 🌬 🍃 💨');
  m('mail','💌 ✉ 📩 📨 📧 📬');
  m('people','🤝 👯 👭 👫 👬 👥 👤 👨‍👩‍👧 🫂 👪 👩 👨 🧑 👧');
  m('smile','😀 😃 😄 😁 😆 😊 🙂 😉 😌 😍 🤩 😎 🥹 😇 😋 😛 👋 😮 😢 😞 😔 😟 😕 🙁 😩 😫 😤 😣 😖 😐 😑 😶 🫠 😬 🤤 🤢 🤒 😷 🥱 😪');
  m('bulb','💡 🔎 🔍');
  m('scale','⚖ 🩺 💊 🩹 🌡');
  m('pencil','📝 ✍ ✏ 🖊 🖋');
  m('pin','📍 📌 🗺 🧭');
  m('music','🎵 🎶 🎧');
  m('home','🏠 🏡 🛋');
  m('phone','📱 📲 ☎ 📞');
  m('flag','🚩 🏁 🎌');
  m('bolt','⚡ 🔋 🚀');
  m('shield','🛡 🦺');
  m('leaf','🌿 🌱 🌾 🍀 ☘ 🌳 🌲 🪴 🥀');
  m('bike','🚴 🚲 🚵');
  m('swim','🏊');
  window.NT_EMOJI_MAP=MAP;

  var RE=/(?:[#*0-9]\uFE0F?\u20E3|\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)/gu;
  var TEST=/[\u2190-\u2BFF\u3297\u3299\uFE0F\u20E3]|[\uD83C-\uD83E][\uDC00-\uDFFF]/;
  window.NT_EMOJI_RE=RE;
  function iconFor(e){
    var k=e.replace(/[\uFE0F\u20E3]/g,'').replace(/\p{Emoji_Modifier}/gu,'');
    return MAP[e]||MAP[k]||MAP[k.split('\u200D')[0]]||'dot';
  }
  var css='', done={};
  var styleEl=document.createElement('style');document.head.appendChild(styleEl);
  function ensureCss(name){
    if(done[name])return;done[name]=1;
    css+='[data-ico="'+name+'"]::before{-webkit-mask-image:'+uri(name)+';mask-image:'+uri(name)+'}';
    styleEl.textContent='[data-ico]::before{content:"";display:inline-block;width:1em;height:1em;background:currentColor;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;-webkit-mask-size:contain;mask-size:contain;vertical-align:-.14em;flex-shrink:0}'+css;
  }
  var emptied=new WeakSet();
  var SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,INPUT:1,NOSCRIPT:1,svg:1,SVG:1,CODE:1,PRE:1};
  function fix(node){
    var v=node.nodeValue;
    var p=node.parentNode;if(!p||SKIP[p.nodeName])return;
    if(!v||!TEST.test(v)){
      if(v&&v.trim()&&emptied.has(node)&&p.getAttribute&&p.getAttribute('data-ico')){p.removeAttribute('data-ico');emptied.delete(node)}
      return;
    }
    var found=v.match(RE);if(!found)return;
    var rest=v.replace(RE,'').replace(/\u200D|\uFE0F/g,'');
    if(!rest.trim()){
      var name=iconFor(found[0]);ensureCss(name);
      if(p.getAttribute&&p.getAttribute('data-ico')!==name)p.setAttribute('data-ico',name);
      node.nodeValue='';emptied.add(node);
    }else{
      var nv=rest.replace(/^\s+(?=\S)/,v.match(/^\s/)?' ':'').replace(/\s{2,}/g,' ');
      if(/^\s/.test(rest)&&!/^\s/.test(v))nv=nv.replace(/^\s+/,'');
      if(nv!==v)node.nodeValue=nv;
    }
  }
  function walk(root){
    if(root.nodeType===3){fix(root);return}
    if(root.nodeType!==1||SKIP[root.nodeName])return;
    var it=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),n;
    var list=[];while((n=it.nextNode()))list.push(n);
    list.forEach(fix);
  }
  var queued=[],raf=0;
  function flush(){raf=0;var q=queued;queued=[];q.forEach(function(n){if(n.isConnected!==false)walk(n)})}
  var mo=new MutationObserver(function(muts){
    muts.forEach(function(mu){
      if(mu.type==='characterData')queued.push(mu.target);
      else mu.addedNodes.forEach(function(n){queued.push(n)});
    });
    // Fix synchronously so emojis never flash on screen.
    flush();
  });
  function start(){mo.observe(document.body,{childList:true,subtree:true,characterData:true});walk(document.body)}
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
  window.ntStripEmoji=function(s){return String(s==null?'':s).replace(RE,'').replace(/[\u200D\uFE0F]/g,'').replace(/\s{2,}/g,' ').trim()};
})();
