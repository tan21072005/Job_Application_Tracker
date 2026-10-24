# JobTrack Conversational Intake & Tool Protocol Specification

## 1. BFF Dispatch Payload (`JobTrack API -> n8n Webhook`)

When a candidate sends a message from the Web frontend, the JobTrack API validates session authentication and issues a webhook call to n8n:

- **Method**: `POST`
- **Path**: `/webhook/jobtrack-agent` (or configured `N8N_WEBHOOK_URL`)
- **Headers**:
  - `Content-Type: application/json`
- **Body Schema**:
```json
{
  "chatInput": "Tôi muốn tạo một hồ sơ ứng tuyển mới vào công ty VNG vị trí Senior Backend Engineer",
  "sessionId": "ses-550e8400-e29b-41d4-a716-446655440000",
  "userId": "usr-1234-abcd",
  "context": {
    "grantToken": "jt_grant_f8e4b2a9c1d0...",
    "applicationId": "app-5678",
    "pathname": "/applications"
  }
}
```

---

## 2. MCP Gateway Protocol (`n8n Tool -> JobTrack API`)

The n8n Agent invokes JobTrack MCP tools via JSON-RPC 2.0:

- **Method**: `POST`
- **URL**: `http://127.0.0.1:64366/api/mcp`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <grantToken>`
- **Body Schema**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_application",
    "arguments": {
      "company": "VNG Corporation",
      "position": "Senior Backend Engineer",
      "status": "applied",
      "workMode": "hybrid",
      "location": "TP. Hồ Chí Minh"
    }
  }
}
```

---

## 3. Web BFF Protocol (`Web Client <-> JobTrack API`)

### 3.1 Send Message Endpoint
- **Method**: `POST`
- **Path**: `/api/ai/chat`
- **Auth**: Cookie-based session (`req.session.userId`)
- **Request Body**:
```json
{
  "message": "Tôi muốn tạo một hồ sơ ứng tuyển mới...",
  "sessionId": "ses-550e8400-e29b-41d4-a716-446655440000",
  "context": {
    "pathname": "/applications"
  }
}
```

- **Response Body (`ChatResponseDTO`)**:
```json
{
  "reply": "Tôi đã tạo thành công hồ sơ ứng tuyển **Senior Backend Engineer** tại **VNG Corporation** với trạng thái **applied**.",
  "sessionId": "ses-550e8400-e29b-41d4-a716-446655440000",
  "provenance": "n8n",
  "receipts": [
    {
      "action": "create_application",
      "success": true,
      "summary": "Tạo hồ sơ ứng tuyển Senior Backend Engineer tại VNG Corporation",
      "targetId": "app-8910"
    }
  ],
  "suggestedPrompts": [
    "Lên lịch phỏng vấn cho hồ sơ VNG vừa tạo",
    "Tóm tắt các việc cần làm trong tuần này"
  ],
  "timestamp": "2026-10-24T15:20:00.000Z"
}
```

### 3.2 Chat History Retrieval Endpoint
- **Method**: `GET`
- **Path**: `/api/ai/chat/history?sessionId=...`
- **Auth**: Cookie-based session
- **Response Body (`ChatHistoryDTO`)**:
```json
{
  "sessionId": "ses-550e8400-e29b-41d4-a716-446655440000",
  "messages": [
    {
      "id": "msg-1",
      "sender": "user",
      "message": "Tôi muốn tạo một hồ sơ ứng tuyển mới...",
      "createdAt": "2026-10-24T15:19:50.000Z"
    },
    {
      "id": "msg-2",
      "sender": "assistant",
      "message": "Tôi đã tạo thành công hồ sơ ứng tuyển...",
      "provenance": "n8n",
      "receipts": [...],
      "createdAt": "2026-10-24T15:20:00.000Z"
    }
  ],
  "total": 2
}
```

### 3.3 Clear History Endpoint
- **Method**: `DELETE`
- **Path**: `/api/ai/chat/history?sessionId=...`
- **Auth**: Cookie-based session
- **Response Body**:
```json
{
  "success": true,
  "cleared": 2
}
```

---

## 4. Graceful Degradation & Fallback Topology

If n8n is unreachable (connection refused, HTTP 500/502/504, or request timeout > 15s):
1. The JobTrack API catches the network error.
2. The turn seamlessly fails over to the local grounded conversational processor (`provenance: 'local_fallback'`).
3. The response is generated based on direct tenant queries (`WHERE user_id = $1`).
4. Both user and assistant turns are stored in PostgreSQL table `chat_messages` with the exact provenance flag.
5. The candidate receives an uninterrupted, accurate response without errors.
