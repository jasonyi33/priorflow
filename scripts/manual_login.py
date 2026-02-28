"""
Manual login helper — opens a browser with persistent profile so you can
log in to CoverMyMeds and complete 2FA without the agent interfering.

Usage: uv run python scripts/manual_login.py

Once logged in, close the browser or press Ctrl+C. Future agent runs
will reuse the saved session cookies.
"""

import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

PROFILE_DIR = Path(__file__).parent.parent / ".browser_profile"


async def main():
    PROFILE_DIR.mkdir(exist_ok=True)

    print("🔓 Opening browser for manual login...")
    print("   1. Log in to CoverMyMeds")
    print("   2. Complete email/2FA verification")
    print("   3. Once you see the dashboard, press Ctrl+C here to save session")
    print()

    async with async_playwright() as p:
        # Use the same Chromium that Browser Use downloads
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(storage_state=str(PROFILE_DIR / "state.json") if (PROFILE_DIR / "state.json").exists() else None)
        page = await context.new_page()
        await page.goto("https://www.covermymeds.health")

        print("⏳ Waiting for you to complete login... (Ctrl+C when done)")
        try:
            while True:
                await asyncio.sleep(1)
        except (KeyboardInterrupt, asyncio.CancelledError):
            pass

        # Save cookies and storage state for reuse
        await context.storage_state(path=str(PROFILE_DIR / "state.json"))
        await context.close()
        await browser.close()
        print("✅ Session saved to .browser_profile/state.json!")
        print("   Future agent runs will load this session automatically.")


if __name__ == "__main__":
    asyncio.run(main())
