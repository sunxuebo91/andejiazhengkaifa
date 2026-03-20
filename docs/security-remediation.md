# Security Remediation

## Immediate Actions

1. Rotate every secret that has ever been committed to this repository.
2. Re-issue the committed TLS certificate private key and replace the certificate bundle on the server.
3. Remove tracked secret files from git history with an approved history-rewrite process.
4. Recreate local and production `.env` files from `backend/.env.example` and `frontend/.env.example`.

## Secrets That Must Be Rotated

- Tencent OCR and COS credentials
- JWT secret
- ESign private key and related callback trust configuration
- WeChat official account and miniprogram secrets
- TRTC and ZEGO server secrets
- ZMDB and MiniMax API keys
- Any TLS private key committed under `网站证书/`

## Repository Policy

- Never commit real `.env` files.
- Never commit certificate private keys.
- Only commit sanitized `*.example` templates.
