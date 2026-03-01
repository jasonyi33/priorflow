"""
End-to-end flow: eligibility check -> PA submission -> status monitoring.
Usage: uv run python scripts/run_full_flow.py MRN-00421
"""

import asyncio
import sys
import json
from pathlib import Path

from agents.eligibility_checker import check_eligibility_stedi
from agents.pa_form_filler import fill_covermymeds_pa
from agents.status_monitor import monitor_covermymeds
from server.observability import initialize_laminar, shutdown_laminar


async def main():
    initialize_laminar()
    mrn = sys.argv[1] if len(sys.argv) > 1 else "MRN-00421"

    # Load patient name for status monitor
    chart_file = Path(f"data/charts/{mrn}.json")
    with open(chart_file) as f:
        chart = json.load(f)
    patient_name = chart["patient"]["name"]

    # Step 1: Eligibility Check
    print(f"\n{'='*60}")
    print(f"STEP 1: Checking eligibility for {patient_name} ({mrn})")
    print(f"{'='*60}")
    elig_result = await check_eligibility_stedi(mrn)
    print(f"Eligibility result: {elig_result}")

    # Step 2: PA Submission
    print(f"\n{'='*60}")
    print(f"STEP 2: Submitting PA for {patient_name} ({mrn})")
    print(f"{'='*60}")
    pa_history = await fill_covermymeds_pa(mrn)
    print(f"PA submission result: {pa_history.final_result()}")

    # Step 3: Status Monitoring
    print(f"\n{'='*60}")
    print(f"STEP 3: Monitoring PA status for {patient_name} ({mrn})")
    print(f"{'='*60}")
    status = await monitor_covermymeds(mrn, patient_name)
    print(f"Status check result: {status}")

    print(f"\n{'='*60}")
    print(f"FULL FLOW COMPLETE for {patient_name} ({mrn})")
    print(f"{'='*60}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    finally:
        shutdown_laminar()
