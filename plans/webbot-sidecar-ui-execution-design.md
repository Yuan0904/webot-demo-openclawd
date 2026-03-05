---
summary: "基于 WebBot 侧车执行引擎的自定义界面详细设计"
read_when:
  - 计划复用 WebBot 执行能力并自建界面与后端时阅读
title: "WebBot 侧车执行层方案"
---

# WebBot 侧车执行层方案

本文给出一个可落地的详细设计：把 WebBot 作为执行侧车使用，只复用
执行能力（模型调用、工具调用、流式输出、故障回退、会话转录），界面和
业务接口全部由你自己的应用实现。

适用范围：

- 你希望快速上线自己的对话产品界面。
- 你不希望重写复杂的执行链路。
- 你接受 WebBot 作为内部引擎服务运行。

## 设计目标

- 复用 WebBot 现有执行行为，不重写模型和工具管线。
- 保持你对产品界面、接口协议、鉴权和业务流程的完全控制。
- 支持实时流式文本和工具事件展示。
- 保留 WebBot 的模型回退、认证轮换、上下文治理能力。
- 将后续升级成本控制在可维护范围。

## 非目标

- 不改造 WebBot 内部执行核心。
- 不复刻 WebBot 的各渠道适配器（如 Telegram、Slack 等）。
- 不重写一套新的会话引擎。

## 总体架构

```txt
自定义界面（网页或移动端）
    |
    | HTTPS / WebSocket
    v
应用后端服务（你自己的 API）
    |
    | WebSocket 长连接（JSON-RPC 帧）
    | 方法：agent、agent.wait、health 等
    v
WebBot Gateway 侧车（仅执行引擎）
    |
    | 模型提供方、工具运行时、会话存储（本地 JSON 文件）、转录文件
    v
大模型服务与本地工具环境
```

## Gateway 通信协议

Gateway 使用 WebSocket JSON-RPC 帧通信，不是 HTTP REST。需要特别注意两类上限：

- Gateway 服务端入站单帧上限默认 **512KB**（HelloOk 的 `policy.maxPayload`，实现位于 `src/gateway/server-constants.ts`）。
- 官方 Gateway 客户端把自身接收上限设为 **25MB**（`src/gateway/client.ts`），用于接收大响应。

你的后端需要：

- 维护一条到侧车的 WebSocket 长连接。
- 以 JSON-RPC 帧格式发送请求、接收响应和事件推送。
- 处理连接断开后的自动重连与状态恢复（见下方"重连策略"）。

参考实现见 `src/gateway/client.ts` 和 `src/gateway/protocol/schema/frames.ts`。

### 连接生命周期

WebSocket 连接建立后不能直接发送 RPC 请求，必须先完成握手认证。完整流程：

```txt
你的后端                              Gateway 侧车
   |--- WebSocket connect ------------------>|
   |<-- event: connect.challenge {nonce, ts} |  ← 服务端立即推送
   |--- req: connect {min/maxProtocol,       |
   |                client, auth, ...} ----->|  ← 必须在超时窗口内回复
   |<-- res: HelloOk {protocol, server,     |  ← 握手成功（见下方 HelloOk 结构）
   |         features, policy, ...}          |
   |                                         |
   |--- req: agent {...} ------------------->|  ← 现在可以发送 RPC 请求
   |<-- res: {status: "accepted"} -----------|
   |<-- event: agent {runId, stream, data} -|  （N 次事件推送）
   |<-- event: tick {ts} -------------------|  （周期性心跳，见下方说明）
   |<-- res: {status: "ok"} ----------------|
```

握手超时后服务端会主动关闭连接（`src/gateway/server/ws-connection.ts:219-228`）。

#### HelloOk 响应结构

握手成功后返回的 HelloOk 帧（`src/gateway/protocol/schema/frames.ts:70-113`）包含以下关键字段：

| 字段 | 说明 |
|---|---|
| `protocol` | 协议版本号，用于版本协商 |
| `server` | 服务端信息：`version`、`commit`、`host`、`connId` |
| `features.methods` | 可用 RPC 方法列表 |
| `features.events` | 可订阅事件类型列表 |
| `policy.maxPayload` | 单帧最大字节数，你的后端发送时不能超过此值 |
| `policy.maxBufferedBytes` | 最大缓冲字节数 |
| `policy.tickIntervalMs` | 心跳间隔（毫秒），用于连接活性检测 |
| `auth` | 可选，含 `deviceToken`、`role`、`scopes` 等认证信息 |
| `snapshot` | 服务端状态快照 |

你的后端应该缓存 `policy` 字段，用于控制发送帧大小和心跳超时判断。

### 帧格式

三种帧类型（`src/gateway/protocol/schema/frames.ts`）：

- 请求帧：`{ "type": "req", "id": "<uuid>", "method": "agent", "params": {...} }`
- 响应帧：`{ "type": "res", "id": "<uuid>", "ok": true, "payload": {...} }`
- 事件帧：`{ "type": "event", "event": "agent", "payload": {...}, "seq": 123 }`

`id` 用于关联请求和响应。`agent` 方法的同一个 `id` 会收到两次响应帧（见双响应模式）。

补充：顶层 `seq` 是连接级事件序号（非 run 级），用于检测连接期间是否丢帧。

### 连接认证

Gateway 连接鉴权由握手中的 `auth` 字段驱动（`src/gateway/auth.ts`）：

| 模式 | 配置方式 | 说明 |
|---|---|---|
| `token` | 环境变量 `WEBBOT_GATEWAY_TOKEN` 或配置 `gateway.auth.token` | 推荐。在 `connect.params.auth.token` 传入 |
| `password` | 环境变量 `WEBBOT_GATEWAY_PASSWORD` 或配置 `gateway.auth.password` | 在 `connect.params.auth.password` 传入 |
| `device-token` | 首次配对后由服务端签发 | 适合设备端，侧车后端场景通常不首选 |
| `tailscale` | `allowTailscale=true` 且使用 Tailscale Serve 头 | 属于网络身份验证，不是侧车常规首选 |

注意：不存在通用的“localhost 免认证”模式。即便本地连接，通常也需要共享密钥或设备认证。

`connect` 握手帧示例（侧车后端最小可用字段）：

```json
{
  "type": "req",
  "id": "handshake-1",
  "method": "connect",
  "params": {
    "minProtocol": 1,
    "maxProtocol": 1,
    "client": {
      "id": "gateway-client",
      "version": "1.0.0",
      "platform": "linux",
      "mode": "backend"
    },
    "auth": { "token": "your-gateway-token" },
    "role": "operator",
    "scopes": ["operator.write", "operator.read"],
    "caps": ["tool-events"]
  }
}
```

说明：

- `client.id` 和 `client.mode` 不是任意字符串，必须使用协议定义的枚举值。
- 如果你不需要工具细粒度事件，可以省略 `caps`；需要 tool 事件则保留 `"tool-events"`。
- 如果你走设备签名认证，需把 `connect.challenge` 返回的 `nonce` 放进 `params.device.nonce` 并参与签名。
- 实际 `ConnectParamsSchema`（`src/gateway/protocol/schema/frames.ts:20-68`）还支持 `commands`、`permissions`、`pathEnv`、`locale` 等字段。

Gateway 不支持在 `connect` 时按 `subscribe` 做事件裁剪；是否可见取决于事件类型、角色/scope 以及能力声明。

### 角色与权限

握手阶段必须显式声明 `role` 和 `scopes`。侧车后端场景建议：

- `role`: `operator`
- `scopes`: 至少包含 `operator.write`（调用 `agent`、`agent.wait`、`chat.abort`）
- 推荐同时带 `operator.read`（调用 `health`、`chat.history` 等只读方法）

如果 `scopes` 为空，常见结果是"握手成功但业务 RPC 返回 missing scope"。

### 事件推送机制

握手成功后，Gateway 会向已连接的客户端广播事件帧。你的后端需要：

- 处理 `event="agent"` 的执行流事件（包含 lifecycle / assistant / tool 等）。
- 收到事件帧后按 `payload.runId` 过滤，只处理自己发起的运行。
- 区分两种序号：帧级 `frame.seq`（连接级）与运行级 `payload.seq`（run 级）。

#### seq gap 检测

Gateway 客户端内置了帧级 seq gap 检测（`src/gateway/client.ts:302-308`）：当收到的 `frame.seq` 与上一次不连续时触发 `onGap` 回调。你的后端应实现双层检测：

- 连接级：维护 `lastFrameSeq`，检测 `frame.seq` 断档。
- 运行级：维护每个 `runId` 的 `lastPayloadSeq`，检测 `payload.seq` 断档。
- 检测到 gap 时记录告警，并通过 `agent.wait` 做最终状态补偿。
- 不要因为 gap 直接丢弃后续事件——后续帧仍然可能有效。

#### tick 心跳机制

Gateway 服务端会周期性发送 `tick` 事件帧（间隔由 HelloOk 的 `policy.tickIntervalMs` 指定，默认 30 秒）。Gateway 客户端在 `2× tickIntervalMs` 内未收到 tick 时会主动断开连接（`src/gateway/client.ts:369-386`）。

你的后端必须处理这个行为：

- 记录每次收到 tick 的时间戳。
- 超过 `2× tickIntervalMs` 未收到 tick 时，主动关闭连接并触发重连。
- 不要把 tick 超时当作异常——这是正常的连接活性检测机制。

### 重连策略

Gateway 客户端内置指数退避重连（`src/gateway/client.ts`）：初始 1 秒，每次翻倍，上限 30 秒。你的后端应参考类似策略：

- 初始退避：1 秒。
- 最大退避：30 秒。
- 重连后必须重新完成握手流程（connect.challenge → connect → HelloOk）。
- 重连成功后，检查断连期间进行中的 run：通过 `agent.wait` 查询状态，或按 `runId` 重新匹配后续事件。
- 如果断连期间有 run 的最终响应丢失，你的后端幂等表中该 run 会停留在 `accepted` 状态——需要主动查询补偿。

## 为什么推荐侧车而不是硬拆源码

WebBot 的执行能力不是一个独立函数，它依赖：

- 会话存储与会话刷新策略
- 模型认证与认证档案轮换
- 工具策略与权限控制
- 系统提示词拼装
- 流式事件订阅与生命周期事件

如果直接抽代码，后续会持续跟随内部实现变化，维护成本高。
侧车方案把依赖关系留在 WebBot 内部，你只集成一个稳定边界。

## 集成边界与职责划分

### 你的后端负责

- 用户鉴权与租户隔离
- 会话映射（业务会话 ID -> WebBot sessionKey）
- 请求幂等控制（必须持久化，不能仅依赖侧车内存级 dedupe）
- 对前端输出统一事件协议
- 业务数据落库（消息、运行记录、审计信息）
- WebSocket 连接管理（到侧车的长连接维护、重连、心跳）

### WebBot 侧车负责

- 执行一轮 agent 对话
- 流式输出 assistant/tool/lifecycle/error 事件
- 模型回退与重试
- 工具调用与工具策略执行
- 转录文件和会话统计维护

## 关键数据模型

建议保留以下三类标识：

- `sessionKey`：对话主键，标识一条长期会话。
- `runId`：一次提问的一次执行。由客户端生成的 `idempotencyKey` 直接充当——即你传入的 `idempotencyKey` 值会被侧车原样用作 `runId`，不会另行生成。
- `idempotencyKey`：一次提交动作的幂等键，同时也是该次执行的 `runId`。

### sessionKey 规则

建议格式：

`agent:<agentId>:app:<tenantId>:<conversationId>`

注意事项：

- `agentId` 必须是侧车已配置的 agent（会被 `listAgentIds` 校验），未配置的 agentId 会被拒绝。
- sessionKey 会被系统 `.toLowerCase()` 处理，不要依赖大小写区分。
- 如果不传 sessionKey，系统会根据 `agentId` 派生默认值。派生逻辑为 `agent:{agentId}:{mainKey}`（`src/routing/session-key.ts:130-137`），当 agentId 和 mainKey 都取默认值时结果为 `agent:main:main`。如果请求指定了 `agentId`（如 `support`），派生结果会变为 `agent:support:main`。多租户场景下必须显式传入。
- 如果你传入的 sessionKey 已经以 `agent:` 开头，系统会原样使用（转小写）。不以 `agent:` 开头的 key 会被自动加上 `agent:{agentId}:` 前缀（`src/routing/session-key.ts:48-55`）。确保你的格式不会与内部的 `subagent:` 前缀冲突。
- 同一业务会话必须稳定映射到同一 `sessionKey`。
- 不同租户必须不同前缀，避免串会话。

你的数据库应维护映射表，至少包含：

- `tenant_id`
- `user_id`
- `conversation_id`
- `webbot_session_key`
- `last_run_id`

### 会话存储限制

侧车的会话存储是本地 JSON 文件（`src/config/sessions/store.ts`），通过原子写入更新（Unix 下使用临时文件 + rename）。加载时会自动执行字段迁移（`provider` → `channel`，`room` → `groupChannel`），如果你的后端直接读取 session store 文件（方案 B），需要知道这个行为。这意味着：

- 不支持多进程并发写入同一个 store 文件（虽然有文件锁机制，但跨进程不可靠）。
- 水平扩展侧车实例时需要做会话亲和（同一 sessionKey 始终路由到同一实例），或共享存储目录。
- 部署时必须持久化 session store 目录，容器重启不能丢失。

Session store 有自动维护策略，但默认模式为 `"warn"`（`DEFAULT_SESSION_MAINTENANCE_MODE`），即只记录日志警告，不实际执行清理。需要显式配置为 enforce 模式才会自动清理。各策略阈值：

| 策略 | 默认阈值 | 默认行为 | 说明 |
|---|---|---|---|
| 条目过期清理 | 30 天 | 仅警告 | 超过 `updatedAt` 阈值的条目，enforce 模式下会被清理 |
| 条目数量上限 | 500 条 | 仅警告 | 超出后，enforce 模式下最旧的条目会被移除 |
| 文件大小轮转 | 10MB | 仅警告 | 超出后，enforce 模式下 rename 为备份文件，保留 3 个备份 |
| 缓存 TTL | 45 秒 | 始终生效 | 内存缓存有效期，可通过 `WEBBOT_SESSION_CACHE_TTL_MS` 调整 |

高频多租户场景下 500 条上限可能不够用。如果使用 enforce 模式，需要在侧车配置中调整阈值；如果保持 warn 模式，则需要在你的后端做会话生命周期管理，避免 store 文件无限增长。

## Gateway RPC 参考

### `agent` — 提交一轮执行

完整参数（`src/gateway/protocol/schema/agent.ts`）：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `message` | string | 是 | 用户消息 |
| `idempotencyKey` | string | 是 | 幂等键，同时作为 `runId` |
| `sessionKey` | string | 否 | 会话标识，不传则根据 agentId 派生默认值 |
| `agentId` | string | 否 | 目标 agent，必须是已配置的 agent |
| `deliver` | boolean | 否 | 是否通过渠道投递回复，侧车场景设为 `false` |
| `thinking` | string | 否 | 推理深度控制（如 `"low"`），影响模型思考行为 |
| `extraSystemPrompt` | string | 否 | 按请求注入额外系统提示词，适合租户级定制 |
| `lane` | string | 否 | 执行通道标识，见下方说明 |
| `timeout` | integer | 否 | 执行超时（毫秒） |
| `label` | string | 否 | 会话标签，用于管理界面展示 |
| `attachments` | array | 否 | 附件列表（图片等）；业务层单附件上限 5MB，但传输仍受单帧 `policy.maxPayload`（默认 512KB）限制 |
| `channel` | string | 否 | 消息来源渠道标识 |
| `accountId` | string | 否 | 渠道账号标识 |
| `threadId` | string | 否 | 线程标识，用于线程隔离场景 |
| `spawnedBy` | string | 否 | 父会话 sessionKey，用于子 agent 场景 |
| `to` | string | 否 | 目标接收方，侧车场景通常不需要 |
| `replyTo` | string | 否 | 回复目标，侧车场景通常不需要 |
| `sessionId` | string | 否 | 会话 ID（与 sessionKey 不同，用于内部路由） |
| `replyChannel` | string | 否 | 回复渠道标识 |
| `replyAccountId` | string | 否 | 回复账号标识 |
| `groupId` | string | 否 | 群组 ID |
| `groupChannel` | string | 否 | 群组渠道 |
| `groupSpace` | string | 否 | 群组空间 |

侧车场景下，`to`、`replyTo`、`replyChannel`、`replyAccountId`、`groupId`、`groupChannel`、`groupSpace` 通常不需要设置。核心参数是 `message`、`idempotencyKey`、`sessionKey`、`deliver=false`。

如果你需要传较大附件，建议采用"后端对象存储 + URL/引用"方案，不要直接把大体积 base64 放进单个 RPC 帧。

#### `lane` 参数说明

`lane` 的实际语义是执行类型隔离，不是租户隔离。系统内置四个通道（`src/process/lanes.ts`），并发上限由运行时配置决定，以下为参考值：

| 通道 | 参考并发上限 | 用途 |
|---|---|---|
| `main` | 4 | 主 agent 执行 |
| `cron` | 1 | 定时任务 |
| `subagent` | 8 | 子 agent 调用 |
| `nested` | — | 嵌套执行 |

注意：`src/process/lanes.ts` 仅定义通道枚举，具体并发上限在运行时配置中设置，实际值可能因部署配置不同而变化。

多租户排队隔离不应依赖 `lane`，应在你的后端层面实现（如每租户一个请求队列）。

#### 双响应模式

`agent` 方法会对同一个请求返回两次响应帧：

第一次（立即）— 确认已接受：

```json
{
  "runId": "idem-key-123",
  "status": "accepted",
  "acceptedAt": 1735689600000
}
```

第二次（执行完成后）— 最终结果：

```json
{
  "runId": "idem-key-123",
  "status": "ok",
  "summary": "completed",
  "result": { "payloads": [...], "meta": { "durationMs": 1234 } }
}
```

或失败：

```json
{
  "runId": "idem-key-123",
  "status": "error",
  "summary": "model timeout"
}
```

你的后端必须处理同一请求 ID 的两次响应。第一次是 ack，第二次是最终结果。不要在收到第一次响应后就关闭请求上下文。

### `agent.wait` — 同步等待执行完成

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `runId` | string | 是 | 要等待的运行 ID |
| `timeoutMs` | integer | 否 | 等待超时，默认 30000ms |

返回：

```json
{
  "runId": "...",
  "status": "ok | error | timeout",
  "startedAt": 1735689600000,
  "endedAt": 1735689601234,
  "error": null
}
```

适用于不需要流式事件的简单场景（如后台任务、同步 API 调用）。比订阅事件流简单得多。

### `health` — 健康检查

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `probe` | boolean | 否 | `true` 做深度探测（含模型连通性），`false` 返回缓存快照 |

返回健康摘要，包含模型可用性、工具状态等。缓存有效期内重复调用不会触发实际探测。

### `chat.abort` — 终止运行

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `runId` | string | 否 | 要终止的运行 ID，不传则终止该会话下所有活跃 run |
| `sessionKey` | string | 是 | 运行所属的会话标识，用于隔离校验 |

返回：

```json
{
  "ok": true,
  "aborted": true,
  "runIds": ["run_123"]
}
```

注意事项：

- 指定 `runId` 时，若与 `sessionKey` 不匹配会返回错误（不是静默 no-op）。
- abort 是尽力而为的——如果模型调用已经完成但响应还在传输中，abort 可能来不及生效。
- 成功 abort 后，`chat` 事件会收到 `state: "aborted"`，并结束该 run 的前端流。

## 后端 API 设计建议

对前端暴露你自己的产品接口，不直接透传 Gateway 原始协议。

### 1) 提交运行

`POST /v1/conversations/{id}/runs`

请求体：

- `text`
- 可选 `attachments`
- 可选 `thinking`（透传推理深度）

后端行为：

1. 根据 `conversationId` 查或创建 `sessionKey`
2. 生成 `idempotencyKey`，同时写入你的持久化幂等表
3. 通过 WebSocket 调用 Gateway `agent`，核心参数：
   - `message`
   - `sessionKey`
   - `deliver=false`
   - `idempotencyKey`
   - 可选：`thinking`、`extraSystemPrompt`、`lane`、`timeout`
4. 收到第一次响应（accepted）后立即返回给前端
5. 异步等待第二次响应（ok/error）更新运行状态

响应体示例：

```json
{
  "runId": "...",
  "status": "accepted",
  "acceptedAt": 1735689600000
}
```

### 2) 订阅运行事件

`GET /v1/runs/{runId}/events`（SSE）或 WebSocket 订阅

后端行为：

- 通过已建立的 WebSocket 连接接收 Gateway 广播的事件帧（`type: "event"`）
- 事件帧结构：`{ "type": "event", "event": "agent", "payload": { "runId": "...", "seq": 1, "stream": "assistant", ... } }`
- 按 `payload.runId` 过滤，只转发属于当前运行的事件
- 将 Gateway 的 `stream` + `data` 映射为你的前端事件类型（见事件协议规范）
- 转发给前端

### 3) 终止运行

`POST /v1/runs/{runId}/abort`

请求体：

- `sessionKey`（必须，abort 按 sessionKey 隔离校验）

后端行为：

- 调用侧车 `chat.abort`，提供 `runId` + `sessionKey`
- 若 `runId` 与 `sessionKey` 不匹配，按参数错误处理（应返回 4xx 给前端）
- 更新你的运行状态为"用户终止"
- 通知前端结束流

### 4) 同步等待运行结果

`GET /v1/runs/{runId}/result?timeout=30000`

后端行为：

- 调用 Gateway `agent.wait`，传入 `runId` 和 `timeoutMs`
- 适用于不需要流式展示的场景（后台任务、API 集成）
- 超时返回 `status: "timeout"`，客户端可重试

### 5) 拉取会话历史

`GET /v1/conversations/{id}/history`

后端行为：

- 以你数据库记录为主
- 转录补齐有两种方案：
  - 方案 A（推荐）：在事件桥接层自行记录所有 assistant/tool 事件，构建自己的转录副本。这与"后端完全控制"的设计目标一致
  - 方案 B：定期读取侧车的 JSONL 转录文件（路径为 `{stateDir}/agents/{agentId}/sessions/{sessionId}.jsonl`），需要共享文件系统访问
- 注意：`emitSessionTranscriptUpdate`（`src/sessions/transcript-events.ts`）是侧车进程内的 Node.js 事件发射器，不会通过 WebSocket 推送给外部客户端，你的后端无法直接监听
- 输出统一的产品消息结构

## 事件协议规范

### Gateway 原始事件结构

Gateway 的 agent 事件使用 `stream` 字段区分大类，具体语义在 `data` 中：

```ts
type AgentEventPayload = {
  runId: string;
  seq: number;           // 单调递增，按 runId 隔离
  stream: "lifecycle" | "tool" | "assistant" | "error";
  ts: number;            // 毫秒时间戳
  data: Record<string, unknown>;
  sessionKey?: string;
};
```

`stream` 是大类标识，不是具体事件名。你需要根据 `stream` + `data` 的内容做映射。

### 建议的前端事件映射

不直接暴露 Gateway 原字段，定义你自己的产品事件类型：

| Gateway `stream` | `data` 特征 | 映射为 |
|---|---|---|
| `lifecycle` | `phase: "start"` | `run.started` |
| `lifecycle` | `phase: "end"` 且 `aborted != true` | `run.completed` |
| `lifecycle` | `phase: "end"` 且 `aborted == true` | `run.aborted` |
| `lifecycle` | `phase: "error"` | `run.failed` |
| `assistant` | 含 `delta` 字段 | `assistant.delta` |
| `tool` | `phase: "start"` | `tool.started` |
| `tool` | `phase: "update"` | `tool.updated` |
| `tool` | 含 `result` | `tool.result` |
| `error` | 任意 | `run.failed` |

### 前端事件通用字段

- `runId`
- `seq`（顺序号，保证单调递增）
- `timestamp`
- `data`

示例：

```json
{
  "event": "assistant.delta",
  "runId": "run_123",
  "seq": 12,
  "timestamp": 1735689600000,
  "data": {
    "delta": "新的文本分片",
    "text": "当前完整文本"
  }
}
```

## 幂等与重试策略

### 侧车幂等的局限性

侧车的幂等是内存级的（`context.dedupe` 是一个 `Map`），进程重启后丢失。你不能完全依赖侧车做幂等保障。

### 你的后端必须做持久化幂等

- 同一次用户点击发送，幂等键固定。
- 在你的数据库中记录 `idempotencyKey -> runId` 映射和状态。
- 提交前先查本地幂等表，命中则直接返回已有结果。
- 后端重试时复用同一幂等键。
- 若网络中断但已 accepted，不要直接重发，先通过 `agent.wait` 查询运行状态或继续订阅事件。
- 侧车重启后，同一幂等键会被当作新请求执行——你的后端需要识别并拦截这种情况。

## 工具策略与权限控制

WebBot 内置四个工具策略档案（`src/agents/tool-policy.ts`）：

| 档案 | 包含工具 | 适用场景 |
|---|---|---|
| `minimal` | 仅 `session_status` | 最小权限起步 |
| `coding` | 文件系统、运行时、会话、内存、图片工具 | 代码辅助场景 |
| `messaging` | 消息和会话工具 | 消息类场景 |
| `full` | 全部工具 | 完全信任场景 |

工具按功能分组，可按组启用或禁用：

- `group:web` — web_search, web_fetch
- `group:fs` — read, write, edit, apply_patch
- `group:runtime` — exec, process
- `group:memory` — memory_search, memory_get
- `group:sessions` — 会话管理工具
- `group:ui` — browser, canvas
- `group:automation` — cron, gateway
- `group:messaging` — message

建议按"最小权限"逐步放开：

第一阶段：

- `deliver=false`，禁止侧车直接对外渠道发送。
- 使用 `minimal` 或 `coding` 档案，仅启用读类工具。
- 在侧车配置文件中明确指定 `agents.defaults.toolProfile`。

后续阶段：

- 再逐步开放写入类与执行类工具。
- 通过 WebBot 工具策略和审批能力做统一治理。
- 注意 `whatsapp_login` 等工具有 owner-only 限制，非 owner 发送者无法调用。

## 安全设计

- Gateway 仅监听回环地址或私有网络。
- 后端与侧车之间启用 token 鉴权（通过 `WEBBOT_GATEWAY_TOKEN` 配置，在 WebSocket 握手的 `connect` 帧中传入）。
- 生产建议始终显式配置共享密钥（token/password），不要依赖环境差异。
- 侧车不直接暴露公网。
- 附件先在后端做类型和大小校验（单附件 5MB + 单帧 512KB），再转发侧车。
- 模型密钥仅存放在侧车主机的安全环境。

## 部署方案

### 方案一：同机侧车

- 应用后端与 WebBot 侧车部署在同一台机器。
- 优点：延迟低，网络简单，调试方便。
- WebSocket 连接走 localhost，无需 TLS。

### 方案二：私网分离部署

- 后端和侧车分开部署在私有网络。
- 优点：隔离性更强，适合更严格环境。
- 注意：session store 是本地 JSON 文件，分离部署时需要共享存储目录或做会话亲和路由。

两种方案都要做：

- 健康检查（使用 `health` RPC，`probe=true` 做深度探测）
- 优雅重启
- 会话存储目录持久化（容器场景必须挂载持久卷）
- WebSocket 断线重连（指数退避 1s→30s，重连后必须重新握手，详见"重连策略"一节）

## 可观测性与运维

建议在后端和侧车边界同时采集指标。

后端核心指标：

- 运行提交数
- 运行成功数
- 运行失败数
- 首字延迟
- 全程耗时
- WebSocket 重连次数

侧车核心指标：

- 模型回退次数
- 工具调用次数和失败率
- 上下文溢出次数
- 自动压缩触发次数

日志统一关联字段：

- `tenantId`
- `conversationId`
- `sessionKey`
- `runId`

转录同步：`emitSessionTranscriptUpdate`（`src/sessions/transcript-events.ts`）是侧车进程内事件，不会通过 WebSocket 暴露。推荐在事件桥接层自行记录所有 assistant/tool 事件来构建转录副本，而不是依赖侧车的转录文件。

## 异常处理手册

- 提交前超时：用同幂等键重试（先查本地幂等表）。
- 已 accepted 但流断开：用 `agent.wait` 查询运行状态，或按 `runId` 重新订阅事件。
- lifecycle error：给用户友好提示，同时记录内部错误码。
- 上下文溢出：提示用户重置会话或缩短输入。
- 侧车重启：WebSocket 断开后自动重连，检查进行中的 run 状态，必要时通知前端。
- abort 参数错误：确认传入的 `sessionKey` 与 `runId` 匹配；不匹配按参数错误处理。

## 分阶段落地计划

### 阶段一：最小可用版本

- 单模型
- 低风险工具
- 流式文本
- 基础历史记录
- WebSocket 连接管理与重连

### 阶段二：生产加固

- 持久化幂等与补偿
- 工具事件时间线
- 指标与告警
- 回退与认证监控
- `agent.wait` 同步调用支持

### 阶段三：能力增强

- 多 agent 路由（`agentId` 参数）
- 会话级模型覆盖
- 复杂附件处理
- 细粒度工具策略（按工具组启用/禁用）
- `extraSystemPrompt` 租户定制
- `thinking` 推理深度控制

## 验收清单

- [ ] 侧车以执行模式稳定运行
- [ ] 后端到侧车的 WebSocket 长连接稳定（连续运行 24h 无非预期断连，或断连后 5s 内自动恢复）
- [ ] WebSocket 握手流程正确实现（connect.challenge → connect → HelloOk），并缓存 HelloOk 中的 `policy` 字段
- [ ] 连接认证配置正确（token 或 password），且握手 `scopes` 至少覆盖 `operator.write`
- [ ] tick 心跳监控已实现（`2× tickIntervalMs` 超时主动断连并重连）
- [ ] 重连使用指数退避（1s→30s），重连后重新握手
- [ ] 后端正确处理 `agent` 的双响应模式（accepted + final），不在第一次响应后关闭请求上下文
- [ ] 后端完成会话映射表（tenant_id / user_id / conversation_id / webbot_session_key / last_run_id）
- [ ] 提交接口具备持久化幂等能力（不依赖侧车内存 dedupe），侧车重启后能拦截重复提交
- [ ] 事件桥接正确映射 `stream` + `data` 到产品事件类型（覆盖 lifecycle / assistant / tool / error 四类）
- [ ] 事件桥接实现双层 seq gap 检测（frame.seq + payload.seq），gap 时记录告警并通过 `agent.wait` 补偿
- [ ] 前端支持断线重连恢复，重连后能续接进行中的 run 事件流
- [ ] `chat.abort` 调用正确传入 `runId` 和 `sessionKey`，并处理参数错误场景
- [ ] 工具权限默认最小化（明确指定 toolProfile，首选 `minimal` 或 `coding`）
- [ ] 运行日志具备全链路关联字段（tenantId / conversationId / sessionKey / runId）
- [ ] 失败率和超时率有告警策略（如 5 分钟内失败率 > 10% 触发告警）
- [ ] 会话存储目录已持久化（容器场景挂载持久卷）
- [ ] 了解 session store 维护策略默认为 warn 模式（不自动清理），按需配置 enforce 模式或在后端管理生命周期
- [ ] WebSocket 单帧大小不超过 HelloOk `policy.maxPayload`（默认 512KB）

## 相关文档

- [Gateway](/gateway)
- [RPC 参考](/reference/rpc)
- [Agent 概念](/concepts/agent)
- [模型回退](/concepts/model-failover)
- [沙箱机制](/gateway/sandboxing)
