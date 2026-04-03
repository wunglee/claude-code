# 数据流

> 从用户输入到 API 响应的完整数据流转。

---

## 高层数据流

```mermaid
flowchart TB
    subgraph Input["输入层"]
        USER["用户输入"]
        CLI["CLI 参数"]
        ENV["环境变量"]
    end
    
    subgraph Processing["处理层"]
        PARSER["Commander.js 解析"]
        INIT["初始化阶段"]
        REPL["REPL 会话"]
    end
    
    subgraph Core["核心层"]
        QE["QueryEngine"]
        CONTEXT["上下文收集"]
        TOOLS["工具执行"]
    end
    
    subgraph External["外部服务"]
        API["Anthropic API"]
        MCP["MCP 服务器"]
        LSP["LSP 服务器"]
    end
    
    subgraph Output["输出层"]
        UI["终端 UI"]
        LOGS["日志"]
        STATE["状态持久化"]
    end
    
    USER --> PARSER
    CLI --> PARSER
    ENV --> INIT
    PARSER --> INIT
    INIT --> REPL
    REPL --> QE
    QE --> CONTEXT
    CONTEXT --> API
    API --> QE
    QE --> TOOLS
    TOOLS --> MCP
    TOOLS --> LSP
    QE --> UI
    QE --> LOGS
    QE --> STATE
```

---

## 启动阶段数据流

```mermaid
sequenceDiagram
    participant User
    participant CLI as CLI 入口
    participant Profiler as 性能分析器
    participant MDM as MDM 读取
    participant Keychain as 钥匙串
    participant Config as 配置加载
    participant GrowthBook as 特性标志
    participant REPL as REPL 启动

    User->>CLI: 执行 claude
    CLI->>Profiler: profileCheckpoint('entry')
    
    par 并行初始化
        CLI->>MDM: startMdmRawRead()
        CLI->>Keychain: startKeychainPrefetch()
    end
    
    CLI->>Config: 解析 CLI 参数
    Config->>Config: 加载全局配置
    Config->>Config: 加载项目配置
    
    CLI->>GrowthBook: 初始化特性标志
    GrowthBook->>GrowthBook: 获取远程配置
    
    Config->>REPL: 初始化完成
    REPL->>REPL: 创建 Ink 渲染器
    REPL->>User: 显示 REPL 界面
```

---

## 对话数据流

### 用户消息处理

```mermaid
flowchart TB
    subgraph UserInput["用户输入"]
        INPUT["文本输入"]
        SLASH["斜杠命令"]
        ATTACH["文件附件"]
    end
    
    subgraph MessagePipeline["消息管道"]
        PARSE["解析输入"]
        BUILD["构建消息对象"]
        ENRICH["添加上下文"]
        HISTORY["更新历史"]
    end
    
    subgraph APICall["API 调用"]
        STREAM["流式请求"]
        PROCESS["处理响应"]
        TOOL["工具调用检测"]
    end
    
    INPUT --> PARSE
    SLASH --> PARSE
    ATTACH --> ENRICH
    PARSE --> BUILD
    BUILD --> ENRICH
    ENRICH --> HISTORY
    HISTORY --> STREAM
    STREAM --> PROCESS
    PROCESS --> TOOL
    TOOL -->|需要工具| EXEC["执行工具"]
    TOOL -->|纯文本| DISPLAY["显示响应"]
    EXEC --> HISTORY
```

### 完整对话循环

```mermaid
sequenceDiagram
    participant User
    participant REPL as REPL 界面
    participant Context as 上下文收集
    participant QE as QueryEngine
    participant API as Anthropic API
    participant Tool as 工具系统
    participant Perm as 权限系统

    User->>REPL: 输入消息
    REPL->>Context: 收集上下文
    
    Note over Context: 收集 git 状态<br/>文件上下文<br/>内存内容
    
    Context->>QE: 构建完整消息
    QE->>API: 发送流式请求
    
    loop 流式响应
        API->>QE: 文本块
        QE->>REPL: 实时显示
    end
    
    alt 包含工具调用
        API->>QE: 工具调用请求
        QE->>Perm: 检查权限
        
        alt 需要用户确认
            Perm->>User: 显示权限对话框
            User->>Perm: 批准/拒绝
        end
        
        Perm->>Tool: 执行工具
        Tool->>Tool: 执行操作
        Tool->>QE: 返回结果
        QE->>API: 发送工具结果
        API->>QE: 继续响应
    end
    
    QE->>REPL: 完成响应
    REPL->>User: 显示最终结果
```

---

## 工具调用数据流

### 工具执行流程

```mermaid
flowchart TB
    subgraph Request["工具请求"]
        PARSE["解析工具调用"]
        VALIDATE["验证输入"]
    end
    
    subgraph Permission["权限检查"]
        CHECK{"检查权限模式"}
        AUTO["自动批准"]
        PROMPT["提示用户"]
        DENY["拒绝"]
    end
    
    subgraph Execution["执行"]
        EXEC["执行工具逻辑"]
        PROGRESS["发送进度更新"]
        RESULT["生成结果"]
    end
    
    subgraph Response["响应"]
        FORMAT["格式化输出"]
        RENDER["渲染 UI"]
        FEEDBACK["反馈到对话"]
    end
    
    PARSE --> VALIDATE
    VALIDATE --> CHECK
    CHECK -->|bypassPermissions| AUTO
    CHECK -->|default/plan| PROMPT
    CHECK -->|拒绝| DENY
    AUTO --> EXEC
    PROMPT -->|批准| EXEC
    PROMPT -->|拒绝| DENY
    EXEC --> PROGRESS
    EXEC --> RESULT
    RESULT --> FORMAT
    FORMAT --> RENDER
    FORMAT --> FEEDBACK
```

### 并发工具执行

```mermaid
flowchart TB
    subgraph Incoming["传入工具调用"]
        T1["工具调用 1"]
        T2["工具调用 2"]
        T3["工具调用 3"]
    end
    
    subgraph Safety["安全检查"]
        S1{"是否并发安全？"}
        S2{"是否并发安全？"}
        S3{"是否并发安全？"}
    end
    
    subgraph Execution["执行"]
        P1["并行执行"]
        P2["并行执行"]
        SEQ["串行执行"]
    end
    
    subgraph Results["结果"]
        R1["结果 1"]
        R2["结果 2"]
        R3["结果 3"]
        MERGE["合并结果"]
    end
    
    T1 --> S1
    T2 --> S2
    T3 --> S3
    
    S1 -->|是| P1
    S2 -->|是| P2
    S3 -->|否| SEQ
    
    P1 --> R1
    P2 --> R2
    SEQ --> R3
    
    R1 --> MERGE
    R2 --> MERGE
    R3 --> MERGE
```

---

## 上下文收集数据流

```mermaid
flowchart TB
    subgraph ContextSources["上下文源"]
        GIT["Git 状态"]
        FILES["文件列表"]
        MEMORY["CLAUDE.md"]
        ENV["环境变量"]
        HISTORY["对话历史"]
    end
    
    subgraph ContextBuilder["上下文构建器"]
        PRIORITY["优先级排序"]
        TOKEN_CHECK["Token 预算检查"]
        TRUNCATE["截断/摘要"]
    end
    
    subgraph FinalContext["最终上下文"]
        SYSTEM["系统提示词"]
        USER["用户消息"]
        ATTACHMENTS["附件"]
    end
    
    GIT --> PRIORITY
    FILES --> PRIORITY
    MEMORY --> PRIORITY
    ENV --> PRIORITY
    HISTORY --> PRIORITY
    
    PRIORITY --> TOKEN_CHECK
    TOKEN_CHECK -->|超限| TRUNCATE
    TOKEN_CHECK -->|正常| SYSTEM
    TRUNCATE --> SYSTEM
    
    SYSTEM --> FinalContext
    USER --> FinalContext
    ATTACHMENTS --> FinalContext
```

---

## 状态管理数据流

```mermaid
flowchart TB
    subgraph StateStore["状态存储"]
        APP_STATE["AppState"]
        STORE["AppStateStore"]
        OBSERVERS["变更观察者"]
    end
    
    subgraph Updates["状态更新"]
        ACTION["用户操作"]
        TOOL_RESULT["工具结果"]
        API_RESPONSE["API 响应"]
    end
    
    subgraph ReactLayer["React 层"]
        CONTEXT["Context Providers"]
        HOOKS["Hooks"]
        COMPONENTS["组件"]
    end
    
    subgraph Persistence["持久化"]
        LOCAL["本地存储"]
        REMOTE["远程同步"]
    end
    
    ACTION --> STORE
    TOOL_RESULT --> STORE
    API_RESPONSE --> STORE
    
    STORE --> APP_STATE
    APP_STATE --> OBSERVERS
    OBSERVERS --> CONTEXT
    CONTEXT --> HOOKS
    HOOKS --> COMPONENTS
    
    STORE --> LOCAL
    STORE --> REMOTE
```

---

## MCP 数据流

```mermaid
sequenceDiagram
    participant User
    participant CC as Claude Code
    participant MCPClient as MCP 客户端
    participant MCPServer as MCP 服务器
    participant External as 外部工具

    User->>CC: 请求 MCP 工具
    CC->>MCPClient: 发现工具
    MCPClient->>MCPServer: 工具列表请求
    MCPServer->>MCPClient: 返回工具定义
    
    CC->>MCPClient: 调用工具
    MCPClient->>MCPServer: 工具调用请求
    MCPServer->>External: 执行操作
    External->>MCPServer: 返回结果
    MCPServer->>MCPClient: 工具结果
    MCPClient->>CC: 格式化结果
    CC->>User: 显示结果
```

---

## Bridge (IDE) 数据流

```mermaid
flowchart TB
    subgraph IDE["IDE 扩展"]
        VSCODE["VS Code"]
        JB["JetBrains"]
    end
    
    subgraph BridgeLayer["Bridge 层"]
        WS["WebSocket 连接"]
        JWT["JWT 认证"]
        MSG["消息路由"]
    end
    
    subgraph Core["Claude Code 核心"]
        SESSION["会话管理"]
        PERM["权限代理"]
        SYNC["状态同步"]
    end
    
    VSCODE -->|"wss://"| WS
    JB -->|"wss://"| WS
    WS --> JWT
    JWT --> MSG
    MSG --> SESSION
    SESSION --> PERM
    SESSION --> SYNC
    SYNC -->|"状态更新"| WS
```

---

## 错误处理数据流

```mermaid
flowchart TB
    subgraph ErrorSources["错误源"]
        API_ERROR["API 错误"]
        TOOL_ERROR["工具错误"]
        NETWORK["网络错误"]
        VALIDATION["验证错误"]
    end
    
    subgraph ErrorHandling["错误处理"]
        CATCH["捕获错误"]
        CLASSIFY["分类错误"]
        RETRY{"可重试？"}
        RECOVER["恢复策略"]
    end
    
    subgraph ErrorResponse["错误响应"]
        USER_MSG["用户消息"]
        FALLBACK["回退行为"]
        LOGGING["日志记录"]
        SENTRY["Sentry 报告"]
    end
    
    API_ERROR --> CATCH
    TOOL_ERROR --> CATCH
    NETWORK --> CATCH
    VALIDATION --> CATCH
    
    CATCH --> CLASSIFY
    CLASSIFY --> RETRY
    RETRY -->|是| RECOVER
    RETRY -->|否| USER_MSG
    RECOVER -->|失败| USER_MSG
    RECOVER -->|成功| LOGGING
    USER_MSG --> LOGGING
    LOGGING --> SENTRY
```

---

## 相关文档

- [架构总览](architecture.md) — 数据流如何适应整体架构
- [子系统详解](subsystems.md) — 每个子系统内部的数据流
