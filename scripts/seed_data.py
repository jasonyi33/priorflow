"""Seed Convex with fixtures (patients, eligibility, pa requests).

Usage: uv run python scripts/seed_data.py
Requires CONVEX_URL and CONVEX_DEPLOY_KEY; otherwise no-ops.
"""

import asyncio
import json
from pathlib import Path
from datetime import datetime

from server.services.convex_client import convex_client

BASE = Path(__file__).parent.parent


async def main():
    if not convex_client.enabled:
        print("Convex not configured; skipping seed.")
        return

    await seed_patients()
    await seed_eligibility()
    await seed_pa_requests()


async def seed_patients():
    charts_dir = BASE / "data" / "charts"
    for chart_file in charts_dir.glob("MRN-*.json"):
        with open(chart_file) as f:
            chart = json.load(f)
        args = {
            "mrn": chart["patient"]["mrn"],
            "firstName": chart["patient"]["first_name"],
            "lastName": chart["patient"]["last_name"],
            "dob": chart["patient"]["dob"],
            "insurance": {
                "payer": chart["insurance"]["payer"],
                "memberId": chart["insurance"]["member_id"],
                "bin": chart["insurance"]["bin"],
                "pcn": chart["insurance"]["pcn"],
                "rxGroup": chart["insurance"]["rx_group"],
                "planName": chart["insurance"].get("plan_name"),
            },
            "diagnosis": chart["diagnosis"],
            "medication": chart.get("medication"),
            "procedure": chart.get("procedure"),
            "priorTherapies": chart.get("prior_therapies", []),
            "labs": chart.get("labs", {}),
            "imaging": chart.get("imaging", {}),
            "provider": chart["provider"],
            "chartJson": json.dumps(chart),
        }
        if args.get("medication") is None:
            args.pop("medication")
        if args.get("procedure") is None:
            args.pop("procedure")
        await convex_client.mutation("patients:create", args)
        print(f"Seeded patient {chart['patient']['mrn']}")


async def seed_eligibility():
    fixture = BASE / "data" / "fixtures" / "eligibility_sample.json"
    if not fixture.exists():
        return
    with open(fixture) as f:
        data = json.load(f)
    args = {
        "mrn": data["mrn"],
        "portal": data["portal"],
        "payer": data["payer"],
        "coverageActive": data["coverage_active"],
        "copay": data.get("copay"),
        "deductible": data.get("deductible"),
        "outOfPocketMax": data.get("out_of_pocket_max"),
        "paRequired": data["pa_required"],
        "paRequiredReason": data.get("pa_required_reason"),
        "rawResponse": data.get("raw_response"),
        "checkedAt": int(datetime.fromisoformat(data["checked_at"].replace("Z", "+00:00")).timestamp() * 1000),
    }
    await convex_client.mutation("eligibilityChecks:create", args)
    print("Seeded eligibility sample")


async def seed_pa_requests():
    fixture = BASE / "data" / "fixtures" / "pa_submission_sample.json"
    if not fixture.exists():
        return
    with open(fixture) as f:
        data = json.load(f)
    args = {
        "mrn": data["mrn"],
        "portal": data["portal"],
        "medicationOrProcedure": data["medication_or_procedure"],
        "status": data["status"],
        "fieldsFilled": data.get("fields_filled", []),
        "gapsDetected": data.get("gaps_detected", []),
        "justificationSummary": data.get("justification_summary"),
        "submissionId": data.get("submission_id"),
        "gifPath": data.get("gif_path"),
        "createdAt": int(datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")).timestamp() * 1000),
        "updatedAt": int(datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00")).timestamp() * 1000),
    }
    await convex_client.mutation("paRequests:create", args)
    print("Seeded PA submission sample")


if __name__ == "__main__":
    asyncio.run(main())
