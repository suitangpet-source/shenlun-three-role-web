(function(){
  var pending={},timer=null,flushing=false;
  async function profile(){
    var r=await cloud.database.from("profiles").select("status,role,nickname,email").maybeSingle();
    return (!r.error&&r.data)?r.data:null;
  }
  async function hydrate(uid){
    var r=await cloud.database.from("user_data").select("data_key,data_value");
    if(r.error||!r.data)return;
    r.data.forEach(function(row){if(row.data_value!=null){try{localStorage.setItem("u:"+uid+":"+row.data_key,row.data_value)}catch(e){}}});
  }
  async function flush(){
    var keys=Object.keys(pending); if(!keys.length||!window.CLOUD_READY||!window.CUR_USER)return;
    var rows=keys.map(function(k){return{owner_id:window.CUR_USER,data_key:k,data_value:pending[k],updated_at:new Date().toISOString()}});
    keys.forEach(function(k){delete pending[k]});
    var r=await cloud.database.from("user_data").upsert(rows,{onConflict:"owner_id,data_key"});
    if(r.error)console.warn("[sync]",r.error.message||r.error);
  }
  window.__cloudPush=function(k,v){if(!window.CLOUD_READY)return;pending[k]=v;clearTimeout(timer);timer=setTimeout(function(){if(flushing)return;flushing=true;flush().finally(function(){flushing=false})},700)};
  window.logoutPrivateApp=async function(){try{speechSynthesis.cancel()}catch(e){};window.CLOUD_READY=false;await cloud.auth.signOut();location.replace("./")};
  (async function(){
    if(!cloud){location.replace("./");return;}
    var s=await cloud.auth.getSession(); if(s.error||!s.data){location.replace("./");return;}
    var p=await profile(); if(!p||p.status!=="approved"){await cloud.auth.signOut();location.replace("./");return;}
    window.CUR_USER=s.data.user.id; await hydrate(window.CUR_USER); window.CLOUD_READY=true;
    var name=document.getElementById("privateUserName");if(name)name.textContent=p.nickname||p.email;
    if(typeof renderBookmarks==="function")try{renderBookmarks()}catch(e){}
    if(typeof pickVoices==="function")try{pickVoices()}catch(e){}
  })();
  window.addEventListener("beforeunload",function(){if(Object.keys(pending).length)try{flush()}catch(e){}});
})();
