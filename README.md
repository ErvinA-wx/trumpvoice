# TrumpVoice Fetcher

自动抓取特朗普社交媒体发帖。

## 使用
- `npm install` - 安装依赖
- `npm run fetch` - 手动抓取
```

---

### 步骤 3：设置 Secrets

1. 在你的 GitHub 仓库页面，点击 **"Settings"** 标签
2. 左侧菜单 → **"Secrets and variables"** → **"Actions"**
3. 点击 **"New repository secret"**，逐个添加：

| Name | Value |
|------|-------|
| `APIFY_TOKEN` | `apify_api_WoFar9cmQmVtjBXpvCvGbxvtJTMz1N22TJ3s` |
| `SUPABASE_URL` | `https://xrpmdsqefvlujyqfogua.supabase.co` |
| `SUPABASE_KEY` | `sb_publishable_5CXtMlBVuWoRWbvZnU-Fvw_seGZ0ByW` |

---

### 步骤 4：测试运行

1. 进入 GitHub 仓库 → **Actions** 标签
2. 点击 **"Daily TrumpVoice Fetch"**
3. 点击 **"Run workflow"** → **"Run workflow"**

完成！
