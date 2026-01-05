---
description: Set up Ngrok to receive real webhooks locally
---

# Expose Localhost to the Internet

To receive real webhooks from Lipana on your local machine, we need a public URL. We will use `ngrok` for this.

## 1. Install Ngrok (if not installed)
// turbo
```bash
npm install -g ngrok
```

## 2. Start the Tunnel
Run this in a **separate terminal** window. It must stay running.
```bash
ngrok http 3000
```

## 3. Copy the URL
- Look for the "Forwarding" line (e.g., `https://a1b2-c3d4.ngrok-free.app` -> `http://localhost:3000`).
- Copy the `https` URL.

## 4. Update Lipana Dashboard
1. Go to your Lipana Dashboard (Sandbox).
2. Find the **Webhook URL** setting.
3. Paste: `<YOUR_NGROK_URL>/api/webhooks/lipana`
   - Example: `https://a1b2-c3d4.ngrok-free.app/api/webhooks/lipana`
4. Save.

## 5. Test
1. Place an order in your app.
2. Pay on your phone.
3. Watch your local terminal. You will see the real webhook arrive!
