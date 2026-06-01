import json
import os
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

ROOT      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEAMS_JSON = os.path.join(ROOT, "web", "teams.json")
LOGOS_DIR  = os.path.join(ROOT, "web", "logos")

SKIP_PATTERNS = [
    "European-Rover-Challenge-logo",
    "logotypy-erc-www-",
    "logotypy",
    "mnisw-logo",
    "nawa",
    "spacecert",
    "esf-pratt",
    "logos-",
    "logo-esf",
    "favicon",
    "_photo",   # team gallery photos (e.g. AD_ASTRA_photo1)
    "photo_",
    "/2022/",
    "/2023/",
    "/2024/",
    "/2025/",
]

# CSS selector: logos live inside .elementor-widget-container
LOGO_SELECTOR = ".elementor-widget-container img"

HEADERS = {"User-Agent": "Mozilla/5.0 (ERC Rankings scraper; contact via roverchallenge.eu)"}

os.makedirs(LOGOS_DIR, exist_ok=True)

with open(TEAMS_JSON, encoding="utf-8") as f:
    teams = json.load(f)

ok = skipped = failed = 0

for team in teams:
    tid      = team["id"]
    name     = team["name"]
    erc_page = team.get("erc_page")

    if not erc_page:
        print(f"  [{tid:3d}] {name}: no ERC page URL — skipping")
        skipped += 1
        continue

    # Check if already downloaded (skip only if file is >10KB, ruling out the generic 7KB SVG)
    for ext in ("jpg", "jpeg", "png", "webp"):
        existing = os.path.join(LOGOS_DIR, f"{tid}.{ext}")
        if os.path.exists(existing) and os.path.getsize(existing) > 10_000:
            print(f"  [{tid:3d}] {name}: already have logo")
            ok += 1
            break
    else:
        try:
            r = requests.get(erc_page, headers=HEADERS, timeout=10)
            r.raise_for_status()
            soup = BeautifulSoup(r.text, "html.parser")

            logo_url = None
            # Only look at images inside .elementor-widget-container,
            # but skip any that are inside a gallery widget
            candidates = soup.select(LOGO_SELECTOR)
            for img in candidates:
                src = img.get("src", "")
                if not src or "/wp-content/uploads/" not in src:
                    continue
                low = src.lower()
                if any(p.lower() in low for p in SKIP_PATTERNS):
                    continue
                # Skip images inside gallery widgets (team photos, not logos)
                if img.find_parent(class_="elementor-widget-image-gallery"):
                    continue
                # Prefer images with "logo" in filename or "001__" prefix
                if logo_url is None:
                    logo_url = src  # first acceptable candidate
                if "logo" in low or "001__" in low:
                    logo_url = src
                    break

            if not logo_url:
                print(f"  [{tid:3d}] {name}: no logo found on page")
                skipped += 1
            else:
                logo_url = urljoin(erc_page, logo_url)
                ext = logo_url.split("?")[0].rsplit(".", 1)[-1].lower()
                if ext not in ("jpg", "jpeg", "png", "webp", "svg"):
                    ext = "jpg"
                dest = os.path.join(LOGOS_DIR, f"{tid}.{ext}")
                img_r = requests.get(logo_url, headers=HEADERS, timeout=10)
                img_r.raise_for_status()
                with open(dest, "wb") as f:
                    f.write(img_r.content)
                # Update teams.json logo field
                team["logo"] = f"logos/{tid}.{ext}"
                print(f"  [{tid:3d}] {name}: ✓ {ext} ({len(img_r.content)//1024}KB)")
                ok += 1

        except Exception as e:
            print(f"  [{tid:3d}] {name}: ERROR — {e}")
            failed += 1

        time.sleep(0.8)

# Save updated logo paths back to teams.json
with open(TEAMS_JSON, "w", encoding="utf-8") as f:
    json.dump(teams, f, ensure_ascii=False, indent=2)

print(f"\nDone: {ok} logos downloaded, {skipped} skipped, {failed} failed")
