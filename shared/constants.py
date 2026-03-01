"""
Shared constants for PriorFlow.

PROTECTED FILE — Only Dev 1 modifies.
"""

# Portal URLs
COVERMYMEDS_URL = "https://www.covermymeds.health"
COVERMYMEDS_KEY_URL = "https://key.covermymeds.com"
STEDI_URL = "https://www.stedi.com"
FLEXPA_API_URL = "https://api.flexpa.com"

# Server config
BACKEND_PORT = 8000
FRONTEND_PORT = 3000

# Agent defaults
DEFAULT_MAX_STEPS_ELIGIBILITY = 25
DEFAULT_MAX_STEPS_PA_FILLER = 40
DEFAULT_MAX_STEPS_STATUS_MONITOR = 15
DEFAULT_MAX_ACTIONS_PER_STEP = 3

# Timeouts (seconds)
AGENT_STEP_TIMEOUT = 30
AGENT_RUN_TIMEOUT = 300  # 5 minutes per agent run
STATUS_CHECK_INTERVAL = 3600  # 1 hour between status checks

# Retry config
MAX_AGENT_RETRIES = 3
RETRY_BACKOFF_BASE = 2  # seconds, exponential backoff

# Agent tuning defaults
DEFAULT_MAX_FAILURES = 5
