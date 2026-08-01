# LangChain 升级 1.x + temperature 参数收敛

> 状态：方案已讨论确认（temperature 固定 0.3、字段彻底移除、langchain 升级最新版），待实现

## 1. 目标

1. 将 LangChain 从 0.3.x 升级到 1.x 最新版（`langchain==1.3.14` / `langchain-openai==1.3.5` / `langchain-core==1.4.9`），消除版本落后风险
2. temperature 不再由用户在 UI 配置透出，后端固定为 0.3（简历生成/解析属偏确定性任务）
3. 彻底移除 `LLMConfig` 的 temperature 字段（模型、schema、API 响应均不包含）

## 2. 背景确认

项目仅使用 **1 个 LLM 节点**：三处调用点（简历生成 `routes/job_resume.py:61`、简历解析 `llm_engine.py:91`、单段润色 `routes/optimize.py:47`）全部通过 `get_active_llm_client()` 复用同一激活模型，每次 `chain.invoke` 为独立请求，无多模型编排。因此温度固定只需在 `llm_engine.py` 一处生效。

## 3. 设计

### 3.1 temperature 固定 + 字段移除

- `backend/app/llm_engine.py`：新增常量 `LLM_TEMPERATURE = 0.3`，`get_active_llm_client` 中 `temperature=LLM_TEMPERATURE`
- `backend/app/models.py`：`LLMConfig` 删除 `temperature` 字段（SQLite 已有库残留列无害，不做迁移；SQLModel 查询/写入均不涉及该列）
- `backend/app/schemas.py`：`LLMConfigCreate` / `LLMConfigUpdate` / `LLMConfigResponse` 删除 temperature
- `backend/app/routes/llm_config.py`：`create_config` 不再写 temperature
- `frontend/components/LLMConfigForm.tsx`：删除 temperature state、滑块及 onSave/initial 类型字段
- `frontend/app/settings/page.tsx`：删除 Temperature 展示文案
- `frontend/lib/api.ts`：LLMConfig 相关类型删除 temperature 字段

### 3.2 LangChain 升级

- `backend/requirements.txt`：`langchain==1.3.14`、`langchain-openai==1.3.5`、`langchain-core==1.4.9`（原 0.3.19 / 0.3.7 / 0.3.40）
- 兼容性核查：用到的 `ChatPromptTemplate.from_messages`、`StrOutputParser`、`ChatOpenAI(model/api_key/base_url/temperature)`、LCEL 管道与 `chain.invoke(dict)`、`llm.model_name` 在 1.x 全部保留；langchain 1.x 为元包，自动携带 langgraph 等依赖；Python 3.13 满足 >=3.10 要求
- 验证：venv 重新 `pip install -r requirements.txt` → import 冒烟测试 → 启动后端 + 前端构建

## 4. 影响范围

| 文件 | 变更 |
| --- | --- |
| `backend/requirements.txt` | langchain 系列升到 1.x |
| `backend/app/llm_engine.py` | `LLM_TEMPERATURE` 常量 |
| `backend/app/models.py` | LLMConfig 删 temperature |
| `backend/app/schemas.py` | 三个 LLMConfig schema 删 temperature |
| `backend/app/routes/llm_config.py` | create 不再写 temperature |
| `frontend/components/LLMConfigForm.tsx` | 删滑块与类型字段 |
| `frontend/app/settings/page.tsx` | 删展示 |
| `frontend/lib/api.ts` | 删类型字段 |

## 5. 风险

- 1.x 依赖树变化较大（langgraph 等新依赖），安装体积/时间增加；打包（PyInstaller）需回归验证 exe 体积与启动
- 已存在的 `llm_configs` 表残留 temperature 列（NULL 值），无读写方，长期无害
- 升级后需用真实 LLM 配置冒烟一次生成链路，确认 `llm.model_name` 等属性兼容

## 6. 明确不做

- 不引入 `with_structured_output` / function calling（保留现 JSON + 重试兜底逻辑）
- 不拆分多场景温度（生成/解析/润色统一 0.3）
- 不做数据库迁移删列（残留列无害）
- 不升级其余依赖（fastapi / sqlmodel / pydantic 等保持锁定）
