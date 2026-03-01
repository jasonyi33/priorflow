"""Quick smoke test for Agentmail integration.

Creates an inbox, sends a test message, and lists threads to verify
everything works end-to-end. Run with: uv run python scripts/test_agentmail.py
"""

import os
import sys
import time
import uuid

from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("AGENTMAIL_API_KEY", "")
if not api_key:
    print("AGENTMAIL_API_KEY not set in .env")
    sys.exit(1)

from agentmail import AgentMail
from agentmail.inboxes.types import CreateInboxRequest

client = AgentMail(api_key=api_key)

# 1. Create a test inbox
tag = uuid.uuid4().hex[:6]
print(f"Creating test inbox (pa-test-{tag})...")
inbox = client.inboxes.create(
    request=CreateInboxRequest(username=f"pa-test-{tag}"),
)
print(f"  inbox_id: {inbox.inbox_id}")

# Wait for inbox provisioning
time.sleep(2)

# 2. Send a test message
print("Sending test message...")
recipient = os.getenv(
    "NOTIFICATION_EMAIL",
    "clinic-notifications@agentmail.to",
)
resp = client.inboxes.messages.send(
    inbox_id=inbox.inbox_id,
    to=recipient,
    subject="PriorFlow smoke test",
    text="This is a test message from PriorFlow.",
)
print(f"  message_id: {resp.message_id}")
print(f"  thread_id: {resp.thread_id}")

# 3. List threads
print("Listing threads...")
threads_resp = client.inboxes.threads.list(
    inbox_id=inbox.inbox_id,
)
print(f"  thread count: {threads_resp.count}")
for t in threads_resp.threads:
    print(f"  - {t.thread_id}: {t.subject}")

# 4. Clean up
print("Deleting test inbox...")
client.inboxes.delete(inbox.inbox_id)
print("Done — check agentmail console for the message.")
