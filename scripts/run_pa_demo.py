"""
Demo script: run PA form filler for multiple patients to record GIFs.

Usage:
  uv run python scripts/run_pa_demo.py              # runs MRN-00421 only
  uv run python scripts/run_pa_demo.py --all         # runs both MRN-00421 and MRN-00744
  uv run python scripts/run_pa_demo.py MRN-00744     # runs specific MRN
"""

import asyncio
import json
import shutil
import sys
from pathlib import Path

from agents.pa_form_filler import fill_covermymeds_pa

DEMO_MRNS = {
    "MRN-00421": "Humira / Aetna — Jane Doe (RA)",
    "MRN-00744": "Stelara / Aetna — David Kim (Psoriatic Arthritis)",
}


async def run_demo(mrn: str):
    desc = DEMO_MRNS.get(mrn, mrn)
    print(f"\n{'='*60}")
    print(f"🎬 DEMO RUN: {desc}")
    print(f"{'='*60}\n")

    history = await fill_covermymeds_pa(mrn)
    if history is None:
        print(f"❌ Demo run failed for {mrn}")
        return False

    print(f"✅ Final result: {history.final_result()}")

    # Copy GIF to output/ with clean name
    gif_path = getattr(history, "gif_path", None)
    if gif_path and Path(gif_path).exists():
        dest = Path(f"output/pa_{mrn}.gif")
        shutil.copy2(gif_path, dest)
        print(f"🎬 GIF saved to: {dest}")
    else:
        print(f"⚠️  No GIF generated for {mrn}")

    # Display output summary
    output_file = Path(f"output/pa_submission_{mrn}.json")
    if output_file.exists():
        with open(output_file) as f:
            data = json.load(f)
        print(f"\n📋 PA Submission Output:")
        print(f"   Status:         {data.get('status', 'N/A')}")
        print(f"   Medication:     {data.get('medication_or_procedure', 'N/A')}")
        print(f"   Fields filled:  {len(data.get('fields_filled', []))}")
        print(f"   Gaps detected:  {len(data.get('gaps_detected', []))}")

    return True


async def main():
    args = sys.argv[1:]

    if "--all" in args:
        mrns = list(DEMO_MRNS.keys())
    elif args:
        mrns = [a for a in args if a.startswith("MRN-")]
        if not mrns:
            mrns = ["MRN-00421"]
    else:
        mrns = ["MRN-00421"]

    results = {}
    for mrn in mrns:
        success = await run_demo(mrn)
        results[mrn] = success

    print(f"\n{'='*60}")
    print("📊 DEMO RESULTS SUMMARY")
    print(f"{'='*60}")
    for mrn, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        desc = DEMO_MRNS.get(mrn, mrn)
        print(f"  {status}  {mrn} — {desc}")

    # List generated GIFs
    gifs = list(Path("output").glob("pa_MRN-*.gif"))
    if gifs:
        print(f"\n🎬 Demo GIFs:")
        for gif in gifs:
            print(f"  {gif}")


if __name__ == "__main__":
    asyncio.run(main())
