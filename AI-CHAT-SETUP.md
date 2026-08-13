# ZYREX AI Chat Setup

The frontend never contains the AI secret. The browser calls `/api/ai/chat`, and the backend calls the configured provider.

In `backend/.env`, set:

```env
AI_API_KEY=YOUR_NEW_KEY
AI_API_URL=YOUR_PROVIDER_CHAT_COMPLETIONS_ENDPOINT
AI_MODEL=YOUR_MODEL_ID
```

The proxy sends an OpenAI-compatible request:

- `POST AI_API_URL`
- `Authorization: Bearer AI_API_KEY`
- JSON body with `model` and `messages`

The response reader accepts a normal `choices[0].message.content` response and a couple of common text-output variants.

## Security

Do not put the key in `frontend/script.js`, `index.html`, localStorage, or any public Git repository. The key previously pasted into chat should be rotated/revoked and replaced with a new server-side key.
