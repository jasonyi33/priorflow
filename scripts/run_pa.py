"""
Quick script: submit PA for a single patient via CoverMyMeds.
Usage: uv run python scripts/run_pa.py MRN-00421
"""

import asyncio
import json
import sys
from pathlib import Path

from agents.pa_form_filler import fill_covermymeds_pa


async def main():
    mrn = sys.argv[1] if len(sys.argv) > 1 else "MRN-00421"
    print(f"🏥 Running PA form filler for {mrn}...")
    history = await fill_covermymeds_pa(mrn)
    if history is None:
        print("❌ Agent run failed — see error above")
        sys.exit(1)

    print(f"✅ Final result: {history.final_result()}")

    # Display GIF path
    gif_path = getattr(history, "gif_path", None)
    if gif_path:
        print(f"🎬 GIF saved to: {gif_path}")

    # Display output JSON
    output_file = Path(f"output/pa_submission_{mrn}.json")
    if output_file.exists():
        with open(output_file) as f:
            data = json.load(f)
        print(f"\n📋 PA Submission Output ({output_file}):")
        print(f"   Status:         {data.get('status', 'N/A')}")
        print(f"   Medication:     {data.get('medication_or_procedure', 'N/A')}")
        print(f"   Fields filled:  {len(data.get('fields_filled', []))}")
        print(f"   Gaps detected:  {len(data.get('gaps_detected', []))}")
        if data.get("gaps_detected"):
            for gap in data["gaps_detected"]:
                print(f"     ⚠️  {gap}")
        if data.get("justification_summary"):
            print(f"   Justification:  {data['justification_summary'][:100]}...")
    else:
        print(f"⚠️  No output file found at {output_file}")


if __name__ == "__main__":
    asyncio.run(main())
