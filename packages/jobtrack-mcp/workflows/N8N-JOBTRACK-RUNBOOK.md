# JobTrack n8n Automation Workflow Runbook (`JT-ASSISTANT-v1`)

## 1. Overview & Architecture

JobTrack integrates with n8n via a dedicated, tenant-isolated workflow titled **JT-ASSISTANT-v1** (`jobtrack-agent.n8n.json`). This workflow provides an autonomous conversational assistant with Full Control over a candidate's job search pipeline, enabling natural language querying and tool-driven mutations (application creation, updates, status changes, interview scheduling, and soft deletion).

```
                                 JobTrack Webhook
                               (POST /webhook/jobtrack-agent)
                                            │
                                            ▼
                                  JobTrack AI Agent
                                            │
                ┌───────────────────────────┼───────────────────────────┐
                │                           │                           │
                ▼                           ▼                           ▼
      9router / OpenAI LM          Window Buffer Memory         JobTrack MCP Gateway
 (deepseek/deepseek-chat)        (Keyed by Session/User)     (POST /api/mcp with Bearer)
```

---

## 2. Node Specifications

| Node Name | Node Type | Purpose | Parameters / Configuration |
|---|---|---|---|
| **JobTrack Webhook** | `n8n-nodes-base.webhook` | Receives conversational payload from JobTrack API BFF | `path: jobtrack-agent`, `httpMethod: POST`, `responseMode: lastNode` |
| **JobTrack AI Agent** | `@n8n/n8n-nodes-langchain.agent` | Orchestrates reasoning, conversational reply, and tool invocation | `text: ={{ $json.chatInput }}`, System prompt with Full Control instructions |
| **9router / OpenAI Compatible Model** | `@n8n/n8n-nodes-langchain.lmChatOpenAi` | LLM inference backend | `model: deepseek/deepseek-chat`, `temperature: 0.2`, 9router or OpenAI credential |
| **Window Buffer Memory** | `@n8n/n8n-nodes-langchain.memoryBufferWindow` | Preserves conversational context across turns | `sessionKey: ={{ $('JobTrack Webhook').item.json.sessionId \|\| $('JobTrack Webhook').item.json.userId }}` |
| **JobTrack MCP Gateway Tool** | `@n8n/n8n-nodes-langchain.toolHttpRequest` | Executes MCP JSON-RPC 2.0 tools against API server | `url: http://127.0.0.1:64366/api/mcp`, `Authorization: =Bearer {{ $('JobTrack Webhook').item.json.context?.grantToken }}` |

---

## 3. Installation & Setup Procedure

### Step 1: Import Workflow into n8n
1. Open your n8n workspace (e.g. `http://localhost:5678`).
2. Navigate to **Workflows** -> **Add workflow** -> **Import from File...**.
3. Select `packages/jobtrack-mcp/workflows/jobtrack-agent.n8n.json`.
4. Verify the workflow name is **JT-ASSISTANT-v1**.

### Step 2: Configure LLM Credentials
1. Click on the node **9router / OpenAI Compatible Model**.
2. Under **Credential to connect with**, select or create an OpenAI API credential:
   - **Base URL**: Your 9router or OpenAI proxy URL (e.g. `http://localhost:20128/v1` or `https://api.deepseek.com/v1`).
   - **API Key**: Your corresponding API key.
3. Save the credential.

### Step 3: Verify Tool Gateway & Security Header
1. Click on the node **JobTrack MCP Gateway Tool**.
2. Verify the URL is set to `http://127.0.0.1:64366/api/mcp` (or your configured JobTrack API host).
3. Verify the Header parameter for `Authorization` contains:
   `=Bearer {{ $('JobTrack Webhook').item.json.context?.grantToken || $('JobTrack Webhook').item.json.grantToken }}`
4. Ensure the JSON body is configured as:
   ```json
   {
     "jsonrpc": "2.0",
     "id": 1,
     "method": "tools/call",
     "params": {
       "name": "={{ $fromAI('tool_name') }}",
       "arguments": "={{ $fromAI('tool_arguments') }}"
     }
   }
   ```

### Step 4: Activate Workflow
1. Toggle the workflow status switch in n8n from **Inactive** to **Active**.
2. Note the production webhook URL: `http://<n8n-host>:5678/webhook/jobtrack-agent`.

---

## 4. Environment Variables Configuration

In `apps/api/.env` (or production environment variables):

```env
# URL of the n8n webhook for conversational dispatch
N8N_WEBHOOK_URL=http://localhost:5678/webhook/jobtrack-agent

# Timeout in milliseconds before falling back to local grounded intelligence (default: 15000)
N8N_TIMEOUT_MS=15000
```

---

## 5. Security & Isolation Model

1. **Per-Turn Ephemeral Grant Tokens**:
   - For every conversational turn dispatched to n8n, the JobTrack API generates a 10-minute ephemeral token in `ai_grants` associated with the authenticated user ID and client `n8n-agent`.
   - The token hash is stored in PostgreSQL; plain tokens are never stored.
   - All tool calls made by the n8n Agent through `/api/mcp` pass this grant token, strictly enforcing `WHERE user_id = $1` isolation.
2. **Zero Cross-Tenant Leakage**:
   - The Window Buffer Memory is partitioned by `sessionId` and `userId`.
   - No cross-user context or state can leak between candidates.
3. **Resilient Local Fallback**:
   - If n8n is offline, unreachable, or times out (> 15s), the JobTrack API BFF automatically executes a local grounded deterministic intelligence turn, ensuring candidates always receive assistance.
