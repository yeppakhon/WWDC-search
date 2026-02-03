# WWDC 字幕搜索 - 云端版本

这是 WWDC 知识库的云端版本，使用 YouTube 嵌入播放视频。

## 部署到 GitHub Pages

1. 在 GitHub 上创建新仓库（如 `wwdc-search`）
2. 在本地初始化并推送：
   ```bash
   cd cloud-version
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/wwdc-search.git
   git push -u origin main
   ```
3. 在 GitHub 仓库设置中：
   - Settings → Pages
   - Source: Deploy from a branch
   - Branch: main / (root)
   - Save

几分钟后访问 `https://YOUR_USERNAME.github.io/wwdc-search/` 即可！

## 本地预览
```bash
npx serve .
```
