# GitHub Actions 自动发布到 npm 设置指南

## 🚀 功能说明

这个 GitHub Actions 工作流会在你每次推送代码到 `main` 分支时自动：

1. **检查版本冲突** - 如果当前版本已存在于 npm，自动升级 patch 版本
2. **发布到 npm** - 自动发布新版本
3. **创建 Git 标签** - 为新版本创建标签
4. **提供安装命令** - 显示用户如何安装新版本

## 🔧 设置步骤

### 方法1: 使用 NPM Access Token (推荐)

1. **创建 NPM Access Token**:
   - 登录 [npmjs.com](https://www.npmjs.com)
   - 点击头像 → "Access Tokens"
   - 点击 "Generate New Token"
   - 选择 "Automation" 类型
   - 复制生成的 token

2. **在 GitHub 中设置 Secret**:
   - 进入你的 GitHub 仓库
   - Settings → Secrets and variables → Actions
   - 点击 "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: 粘贴你的 NPM token
   - 点击 "Add secret"

### 方法2: 使用现有的用户名密码 (需要修改工作流)

如果你想继续使用 `NPM_USER_NAME` 和 `NPM_PASSWORD`，需要修改工作流文件：

```yaml
# 在 .github/workflows/npm-publish.yml 中替换认证部分
- name: 配置 npm 认证
  run: |
    npm config set registry https://registry.npmjs.org/
    echo "//registry.npmjs.org/:username=${{ secrets.NPM_USER_NAME }}" > ~/.npmrc
    echo "//registry.npmjs.org/:_password=$(echo -n '${{ secrets.NPM_PASSWORD }}' | base64)" >> ~/.npmrc
    echo "//registry.npmjs.org/:email=action@github.com" >> ~/.npmrc
```

## 📋 GitHub Secrets 设置

确保在 GitHub 仓库中设置了以下 Secret：

**方法1 (推荐)**:
- `NPM_TOKEN` - 你的 NPM Access Token

**方法2 (备选)**:
- `NPM_USER_NAME` - 你的 npm 用户名
- `NPM_PASSWORD` - 你的 npm 密码

## 🎯 工作流触发条件

- **自动触发**: 推送到 `main` 分支
- **手动触发**: 在 GitHub Actions 页面点击 "Run workflow"

## 📦 版本管理

- 如果 `package.json` 中的版本已存在于 npm，会自动升级 patch 版本
- 例如：`1.0.0` → `1.0.1` → `1.0.2`
- 每次发布都会创建对应的 Git 标签

## 🔍 监控发布

1. 进入 GitHub 仓库的 "Actions" 页面
2. 查看 "自动发布到 npm" 工作流
3. 点击具体的运行记录查看详细日志

## ⚠️ 注意事项

1. **首次设置**: 确保 `package.json` 中的包名在 npm 上可用
2. **权限**: 确保你的 npm 账号有发布权限
3. **测试**: 建议先在测试分支验证工作流
4. **版本**: 每次推送都会发布新版本，请谨慎使用

## 🎉 成功后的效果

推送代码后，用户可以通过以下命令安装最新版本：

```bash
npm install -g todoflow-backend@latest
```

或者安装特定版本：

```bash
npm install -g todoflow-backend@1.0.1
```
