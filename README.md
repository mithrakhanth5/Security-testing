# Security Testing Runbook — n8n Automation Setup Guide

This guide describes how to configure, import, credential-setup, and validate the automated n8n workflow for the **ANNEXURE A3 — SECURITY TESTING RUNBOOK**.

The workflow is contained in [n8n_security_workflow.json](file:///c:/Users/sivak/OneDrive/Desktop/security%20node/n8n_security_workflow.json).

---

## 🚀 1. Importing the Workflow into n8n

1. Open your n8n Editor interface.
2. Click on the **Menu** button (top right corner, or navigation panel) -> **Import from File**.
3. Choose the [n8n_security_workflow.json](file:///c:/Users/sivak/OneDrive/Desktop/security%20node/n8n_security_workflow.json) file, or copy its raw JSON text and paste it directly onto the n8n canvas (using `Ctrl+V` or `Cmd+V`).
4. The workflow nodes (GitHub PR Trigger, Slack alerts, Jira ticket creation, SAST/DAST triggers, and Incident Webhook) will populate on the grid.

---

## 🔑 2. Credential Setup Guidelines

To get the workflow operating, you must configure credentials for the connected services. Below are the steps for each node requiring credentials:

### A. Slack Integration (`slack-credential`)
Used by nodes: `Alert Slack`, `Slack DAST Log`, `Slack Pen Test Reminder`, `Create Incident Channel`, and `Post IR Playbook`.
1. In n8n, click on **Credentials** on the left menu -> **Add Credential** -> Search **Slack**.
2. Select **Slack API** (OAuth2 is easiest, or select **Access Token** if using a Bot token).
3. Set up a Slack App in your workspace via [api.slack.com/apps](https://api.slack.com/apps):
   - Give the app **Bot Token Scopes**:
     - `channels:manage` (to create incident rooms)
     - `chat:write` (to send alerts and playbooks)
     - `groups:write` (if writing to private rooms)
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`) and paste it into n8n.

### B. Jira Cloud Integration (`jira-credential`)
Used by nodes: `Create Jira Bug` and `Create Incident Jira`.
1. Select **Add Credential** -> **Jira Software Server API** (covers Jira Cloud as well).
2. For Jira Cloud:
   - **User Email**: Your Jira account email.
   - **API Token**: Generate one at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
   - **Jira URL**: `https://<your-domain>.atlassian.net`

### C. Snyk API Authentication (`snyk-api-credential`)
Used by node: `Trigger Snyk Dependency Scan`.
1. In n8n, create an **HTTP Header Auth** credential.
2. Configure:
   - **Name**: `Authorization`
   - **Value**: `token <YOUR-SNYK-API-TOKEN>` (Get this from your Snyk Account Settings -> API Token).

### D. Semgrep API Authentication (`semgrep-api-credential`)
Used by node: `Trigger Semgrep SAST`.
1. Create an **HTTP Header Auth** credential.
2. Configure:
   - **Name**: `Authorization`
   - **Value**: `Bearer <YOUR-SEMGREP-APPSEC-TOKEN>` (Get this from Semgrep settings).

### E. OWASP ZAP Authentication (`zap-scanner-credential`)
Used by node: `Trigger DAST Scan`.
1. Create an **HTTP Header Auth** credential.
2. Configure:
   - **Name**: `X-ZAP-API-Key`
   - **Value**: Your ZAP daemon API key (found in ZAP options -> API).

---

## 🛠️ 3. Resource Requirements for Verification

To verify that this workflow runs correctly, ensure you have the following resources in place:

### A. Running Environment
- **n8n Instance**:
  - Running locally (`n8n` in terminal, or docker container via `docker run -it --rm --name n8n -p 5678:5678 n8n/n8n`).
  - Active internet connection or tunnels (like `ngrok` or n8n cloud) so external webhooks (GitHub, Snyk callback) can send payloads back to n8n.

### B. Test Accounts & Pipelines
1. **GitHub Repository**: A test repo with a `package.json` file.
2. **Slack Channel**: A workspace channel named `#security-alerts` where your bot is invited.
3. **Jira Project**: A project with key `SEC` (or update node configuration to your specific project key) containing `Bug` and `Task` issue types.

---

## 🧪 4. Step-by-Step Test Scenarios (No Production Setup Required)

You can check if the workflow routes and structures data correctly by simulating the triggers using `curl` or Postman.

### Scenario A: Test PR Webhook & Scan Triggers
1. Copy the webhook URL from the **GitHub PR Webhook** node (double-click the node to find the local webhook URL, e.g. `http://localhost:5678/webhook-test/github-pr-webhook`).
2. Run this command to simulate a new GitHub PR:
   ```bash
   curl -X POST http://localhost:5678/webhook-test/github-pr-webhook \
     -H "Content-Type: application/json" \
     -d '{
       "action": "opened",
       "pull_request": {
         "head": {
           "sha": "1a2b3c4d5e6f",
           "ref": "security-patch-1"
         }
       },
       "repository": {
         "name": "backend-core",
         "html_url": "https://github.com/my-org/backend-core"
       }
     }'
   ```
3. Verify that:
   - The GitHub node triggers.
   - Outputs feed into the HTTP Request nodes to initiate Semgrep and Snyk scans.

### Scenario B: Test Scan Results Callback & Slack/Jira Alert Routing
1. Copy the webhook URL from **Scan Results Callback** node.
2. Run this command to simulate a scan returning **High/Critical** vulnerabilities:
   ```bash
   curl -X POST http://localhost:5678/webhook-test/scan-results-callback \
     -H "Content-Type: application/json" \
     -d '{
       "tool": "Semgrep SAST",
       "repository": "backend-core",
       "branch": "security-patch-1",
       "findings": {
         "criticalCount": 1,
         "highCount": 2,
         "mediumCount": 5
       },
       "scanUrl": "https://semgrep.dev/my-org/scans/123"
     }'
   ```
3. Verify that:
   - The IF node evaluates to **True**.
   - A Slack alert fires in your channel.
   - A Jira bug ticket is created.

### Scenario C: Test Incident Response Automation
1. Copy the webhook URL from **Incident Trigger Webhook** node.
2. Run this command to log an incident:
   ```bash
   curl -X POST http://localhost:5678/webhook-test/log-security-incident \
     -H "Content-Type: application/json" \
     -d '{
       "incidentId": "2026-004",
       "title": "Possible Webhook Spoofing / IAP Validation Bypass",
       "severity": "Critical",
       "description": "Suspected mock receipts bypass identified on /api/v1/iap/verify endpoint from IP 198.51.100.42"
     }'
   ```
3. Verify that:
   - A Slack channel named `#incident-2026-004` is created.
   - The Incident Response Playbook checklist is posted inside that channel.
   - A High-priority Jira Task is created.
