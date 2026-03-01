"""
Quick script: run eligibility check for a single patient.
Usage: uv run python scripts/run_eligibility.py MRN-00421
"""

import asyncio
import sys

from agents.eligibility_checker import check_eligibility_stedi
from server.observability import initialize_laminar, shutdown_laminar


async def main():
    initialize_laminar()
    mrn = sys.argv[1] if len(sys.argv) > 1 else "MRN-00421"
    print(f"Running eligibility check for {mrn}...")
    result = await check_eligibility_stedi(mrn)
    print(f"Result: {result}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    finally:
        shutdown_laminar()
