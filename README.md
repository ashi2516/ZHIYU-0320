# Chat Space MVP (Local, LAN)

最小可用本地聊天空间，第一版支持 OpenAI 与 DeepSeek（OpenAI-compatible）切换。

## 已实现范围（Phase 0 + Phase 1）

- 多 Provider 配置与切换（OpenAI / DeepSeek）
- 服务端代理聊天接口 `/api/chat`
- 单会话聊天（`data/sessions/default.json`）
- system prompt / persona（仅参与上下文，不在聊天区展示）
- 核心记忆 + 长期记忆摘要（手动编辑与开关）
- 世界书基础关键词命中注入
- 本地 JSON 存储
- 移动端设置抽屉化（聊天区优先）

## 本地运行

```bash
npm install
npm run dev
```

默认地址：`http://localhost:3000`
局域网访问：`http://<你的电脑局域网IP>:3000`

## 存储说明

- 非敏感设置：`data/settings.json`
- Provider 密钥（仅服务端）：`data/providers.secrets.json`
- 会话：`data/sessions/default.json`
- 世界书：`data/lorebook.json`
- 角色配置：`data/role-profiles.json`
