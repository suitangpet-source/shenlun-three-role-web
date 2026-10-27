# 申论三人局：GitHub 登录入口 + Supabase 私有正文

## 已发布地址

- 网站入口：https://suitangpet-source.github.io/shenlun-three-role-web/
- 管理后台：https://suitangpet-source.github.io/shenlun-three-role-web/admin.html
- GitHub 仓库：https://github.com/suitangpet-source/shenlun-three-role-web

> 当前 GitHub Pages 已部署。完成下方 Supabase 配置后，注册、管理员审批和私有正文加载才会正式启用。

## 架构

- GitHub Pages 只托管登录页、后台页面、公开程序代码和图片素材。
- 完整正文 `app-v6.html` **不进入 Git 仓库**，存放在 Supabase 私有 Storage 桶 `private-app`。
- 用户登录后，必须同时满足 `profiles.status = approved`，Supabase RLS 才允许下载正文。
- 未授权用户无法通过 GitHub 页面源代码取得正文。
- 用户书签等学习数据按账号保存到 `user_data`，并由 RLS 隔离。

## Supabase 配置步骤

1. 创建 Supabase Project，在 SQL Editor 整段运行 `setup.sql`。
2. 将 Supabase Project URL 和 anon/publishable key 填入 `config.js`。不要填写 `service_role` key。
3. 在本地配套目录 `shenlun-private-upload` 中找到私有文件 `app.html`，上传时命名为 `app-v6.html`。
4. 在 Supabase Dashboard 打开 Storage > `private-app`，把 `app-v6.html` 上传到桶根目录。
5. 打开 Authentication > URL Configuration：
   - Site URL：`https://suitangpet-source.github.io/shenlun-three-role-web/`
   - Redirect URLs：添加 `https://suitangpet-source.github.io/shenlun-three-role-web/**`
6. 先在网站注册管理员邮箱，然后在 SQL Editor 执行：

```sql
update public.profiles
set status='approved', role='admin', reviewed_at=now()
where lower(email)=lower('你的管理员邮箱');
```

7. 登录 `/admin.html`，即可批准或拒绝其他账户。

## 发布

推送到 GitHub `main` 分支后，仓库内的 GitHub Actions 会自动部署 Pages。正文文件严禁提交到 GitHub。

## 安全边界

授权用户登录后，浏览器必须收到正文，因此授权用户仍然可以自行保存内容；这是网页应用无法完全阻止的。该方案保证未授权用户不能从公开 GitHub 仓库或私有 Storage 直接读取正文。
