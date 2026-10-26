# 申论三人局：GitHub 登录入口 + Supabase 私有正文

## 架构

- GitHub Pages 只托管登录页、后台页面和公开程序代码。
- 完整正文 `app.html` 不进入 Git 仓库，存放在 Supabase 私有 Storage 桶 `private-app`。
- 用户登录后，必须同时满足 `profiles.status = approved`，Supabase RLS 才允许下载正文。
- 未授权用户无法通过 GitHub 页面源代码取得正文。

## 配置步骤

1. 创建 Supabase Project，在 SQL Editor 运行 `setup.sql`。
2. 将 Supabase Project URL 和 anon/publishable key 填入 `config.js`。不要填写 service_role key。
3. 在本地配套目录 `shenlun-private-upload` 中找到 `app.html`。
4. 在 Supabase Dashboard 打开 Storage > `private-app`，把 `app.html` 上传到桶根目录。
5. 打开 Authentication > URL Configuration：
   - Site URL 填 GitHub Pages 地址。
   - Redirect URLs 添加 GitHub Pages 地址和需要的本地测试地址。
6. 先在网页注册管理员邮箱，然后在 SQL Editor 执行：

```sql
update public.profiles
set status='approved', role='admin', reviewed_at=now()
where lower(email)=lower('你的管理员邮箱');
```

7. 管理后台地址为 `/admin.html`，之后可批准其他账户。

## 发布

推送到 GitHub `main` 分支后，仓库内的 GitHub Actions 会部署 Pages。正文文件严禁提交到 GitHub。

## 安全边界

授权用户登录后浏览器必须收到正文，因此授权用户仍然可以自行保存内容；这是网页应用无法完全阻止的。该方案保证未授权用户不能从公开 GitHub 仓库或私有 Storage 直接读取正文。
