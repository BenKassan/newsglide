# Security Setup Guide

## Current Setup

- Using Personal Access Token (PAT) for GitHub authentication
- Token expires in 30 days
- Credential helper configured for secure token caching

## Future: SSH Key Setup (More Secure)

### Generate SSH Key

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
```

### Add to SSH Agent

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

### Add to GitHub

1. Copy public key: `pbcopy < ~/.ssh/id_ed25519.pub`
2. Go to GitHub Settings > SSH and GPG keys
3. Click "New SSH key"
4. Paste and save

### Configure Git to Use SSH

```bash
git remote set-url origin git@github.com:BenKassan/fact-fuse-news-forge.git
```

## Security Best Practices

- Never commit credentials or tokens
- Use environment variables for secrets
- Rotate tokens regularly
- Use SSH keys for production environments
