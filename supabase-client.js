(function () {
  var cfg = window.APP_CONFIG || {};
  var missing = !cfg.supabaseUrl || !cfg.supabaseAnonKey ||
    /^REPLACE_WITH_/.test(cfg.supabaseUrl) || /^REPLACE_WITH_/.test(cfg.supabaseAnonKey);
  window.cloud = null;
  window.SUPABASE_CONFIGURED = !missing;
  if (missing) { console.warn("[auth] Supabase 尚未配置"); return; }
  if (!window.supabase || !window.supabase.createClient) { console.error("Supabase SDK 加载失败"); return; }
  var client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.supabaseClient = client;
  window.cloud = {
    database: { from: function (table) { return client.from(table); } },
    auth: {
      signInWithPassword: function (args) { return client.auth.signInWithPassword(args); },
      signUp: function (args) { return client.auth.signUp(args); },
      signOut: function () { return client.auth.signOut(); },
      getSession: async function () {
        var r = await client.auth.getSession();
        return { data: r.data ? r.data.session : null, error: r.error || null };
      }
    }
  };
})();
