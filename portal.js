(function () {
  var $ = function (id) { return document.getElementById(id); };
  var mode = "login";
  function show(text, ok) { var el=$("msg"); el.textContent=text||""; el.className=ok?"msg ok":"msg"; }
  function busy(on) { $("submit").disabled=!!on; }
  function errorText(error, fallback) {
    var text=(error&&error.message)||"";
    if (/invalid login credentials/i.test(text)) return "邮箱或密码不正确";
    if (/email not confirmed/i.test(text)) return "请先打开邮箱完成验证，再回来登录";
    if (/already registered|already been registered/i.test(text)) return "该邮箱已经注册，请直接登录";
    if (/failed to fetch|network/i.test(text)) return "网络连接失败，请稍后重试";
    return text||fallback;
  }
  function setMode(next) {
    mode=next; $("tabLogin").className=next==="login"?"on":""; $("tabReg").className=next==="reg"?"on":"";
    $("regFields").style.display=next==="reg"?"block":"none";
    $("submit").textContent=next==="login"?"登 录":"注册并提交授权申请";
    $("password").placeholder=next==="login"?"密码":"设置密码（至少 6 位）";
    $("password").autocomplete=next==="login"?"current-password":"new-password"; show("");
  }
  async function profile() {
    for(var i=0;i<4;i++){
      var r=await cloud.database.from("profiles").select("status,role,nickname,email").maybeSingle();
      if(!r.error&&r.data) return r.data;
      if(i<3) await new Promise(function(resolve){setTimeout(resolve,350);});
    }
    return null;
  }
  async function loadPrivateApp() {
    show("授权已确认，正在从私有后端载入正文…",true); busy(true);
    var r=await window.supabaseClient.storage.from("private-app").download("app.html");
    if(r.error){ busy(false); show("正文载入失败："+errorText(r.error,"请联系管理员检查私有文件")); return; }
    var html=await r.data.text();
    document.open(); document.write(html); document.close();
  }
  async function verifyAndEnter() {
    var p=await profile();
    if(!p){ await cloud.auth.signOut(); show("账户授权记录不存在，请联系管理员"); return; }
    if(p.status!=="approved"){
      await cloud.auth.signOut();
      show(p.status==="rejected"?"账户未通过管理员授权":"注册成功，正在等待管理员授权"); return;
    }
    await loadPrivateApp();
  }
  async function login(){
    var email=$("email").value.trim(), password=$("password").value;
    if(!email||!password){show("请输入邮箱和密码");return;}
    if(!cloud){show("网站尚未配置登录后端");return;}
    busy(true);show("登录中…",true);
    var r=await cloud.auth.signInWithPassword({email:email,password:password}); busy(false);
    if(r.error){show(errorText(r.error,"登录失败"));return;} await verifyAndEnter();
  }
  async function register(){
    var email=$("email").value.trim(), password=$("password").value, nickname=$("nickname").value.trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){show("请输入正确的邮箱地址");return;}
    if(password.length<6){show("密码至少 6 位");return;}
    if(!cloud){show("网站尚未配置注册后端");return;}
    busy(true);show("正在提交注册申请…",true);
    var r=await cloud.auth.signUp({email:email,password:password,options:{data:{nickname:nickname||null}}}); busy(false);
    if(r.error){show(errorText(r.error,"注册失败"));return;}
    if(r.data&&r.data.session) await cloud.auth.signOut();
    $("password").value="";setMode("login");show("申请已提交。若收到验证邮件请先验证，然后等待管理员授权。",true);
  }
  $("tabLogin").onclick=function(){setMode("login")}; $("tabReg").onclick=function(){setMode("reg")};
  $("submit").onclick=function(){return mode==="login"?login():register()};
  $("password").addEventListener("keydown",function(e){if(e.key==="Enter")(mode==="login"?login():register())});
  (async function(){
    if(!cloud){show("尚未连接登录后端，请管理员配置 config.js");return;}
    var s=await cloud.auth.getSession(); if(!s.error&&s.data) await verifyAndEnter();
  })();
})();
