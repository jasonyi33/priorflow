"""
Quick script: submit PA for a single patient via CoverMyMeds.
Usage: uv run python scripts/run_pa.py MRN-00421
"""

import asyncio
import sys

from agents.pa_form_filler import fill_covermymeds_pa


async def main():
    mrn = sys.argv[1] if len(sys.argv) > 1 else "MRN-00421"
    print(f"Running PA form filler for {mrn}...")
    history = await fill_covermymeds_pa(mrn)
    print(f"Final result: {history.final_result()}")


if __name__ == "__main__":
    asyncio.run(main())
