import json
import openpyxl
import sys
import os

FLAG_MAP = {
    "Afghanistan": "🇦🇫", "Albania": "🇦🇱", "Algeria": "🇩🇿", "Argentina": "🇦🇷",
    "Australia": "🇦🇺", "Austria": "🇦🇹", "Azerbaijan": "🇦🇿", "Bangladesh": "🇧🇩",
    "Belgium": "🇧🇪", "Bolivia": "🇧🇴", "Brazil": "🇧🇷", "Bulgaria": "🇧🇬",
    "Canada": "🇨🇦", "Chile": "🇨🇱", "China": "🇨🇳", "Colombia": "🇨🇴",
    "Croatia": "🇭🇷", "Czechia": "🇨🇿", "Czech Republic": "🇨🇿",
    "Denmark": "🇩🇰", "Ecuador": "🇪🇨", "Egypt": "🇪🇬",
    "Estonia": "🇪🇪", "Finland": "🇫🇮", "France": "🇫🇷", "Germany": "🇩🇪",
    "Ghana": "🇬🇭", "Greece": "🇬🇷", "Hungary": "🇭🇺", "India": "🇮🇳",
    "Indonesia": "🇮🇩", "Iran": "🇮🇷", "Iraq": "🇮🇶", "Ireland": "🇮🇪",
    "Israel": "🇮🇱", "Italy": "🇮🇹", "Japan": "🇯🇵", "Jordan": "🇯🇴",
    "Kazakhstan": "🇰🇿", "Kenya": "🇰🇪", "Latvia": "🇱🇻", "Lebanon": "🇱🇧",
    "Lithuania": "🇱🇹", "Malaysia": "🇲🇾", "Mexico": "🇲🇽", "Morocco": "🇲🇦",
    "Nepal": "🇳🇵", "Netherlands": "🇳🇱", "Nigeria": "🇳🇬", "Norway": "🇳🇴",
    "Pakistan": "🇵🇰", "Peru": "🇵🇪", "Philippines": "🇵🇭", "Poland": "🇵🇱",
    "Portugal": "🇵🇹", "Romania": "🇷🇴", "Russia": "🇷🇺", "Saudi Arabia": "🇸🇦",
    "Serbia": "🇷🇸", "Singapore": "🇸🇬", "Slovakia": "🇸🇰", "Slovenia": "🇸🇮",
    "South Africa": "🇿🇦", "South Korea": "🇰🇷", "Spain": "🇪🇸",
    "Sweden": "🇸🇪", "Switzerland": "🇨🇭", "Taiwan": "🇹🇼", "Thailand": "🇹🇭",
    "Tunisia": "🇹🇳", "Turkey": "🇹🇷", "Türkiye": "🇹🇷",
    "UK": "🇬🇧", "Ukraine": "🇺🇦", "United Kingdom": "🇬🇧",
    "United States": "🇺🇸", "USA": "🇺🇸", "Uruguay": "🇺🇾",
    "Venezuela": "🇻🇪", "Vietnam": "🇻🇳",
}

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.join(ROOT, "ERC2026_Teams.xlsx")
OUT  = os.path.join(ROOT, "web", "teams.json")

wb = openpyxl.load_workbook(XLSX)
ws = wb.active

teams = []
for idx, row in enumerate(ws.iter_rows(min_row=2, max_row=125)):
    name = row[0].value
    if not name or str(name).startswith("TOTAL"):
        continue

    university = row[1].value or ""
    country    = row[2].value or "Unknown"

    # ERC page URL
    erc_cell = row[3]
    erc_page = erc_cell.hyperlink.target if erc_cell.hyperlink else None

    # Historical finishes
    finish_cols = [row[4].value, row[5].value, row[6].value, row[7].value]
    best_finish = row[7].value or "—"  # "Best Finish (3yr)"

    # Video
    video_cell = row[8]
    video_id   = None
    if video_cell.hyperlink and video_cell.hyperlink.target:
        t = video_cell.hyperlink.target
        if "v=" in t:
            video_id = t.split("v=")[-1]
    has_video = video_id is not None

    flag = FLAG_MAP.get(country, "🏳")

    team_id = len(teams)
    ext = "jpg"  # default; scraper will fix
    teams.append({
        "id":         team_id,
        "name":       name,
        "university": university,
        "country":    country,
        "flag":       flag,
        "erc_page":   erc_page,
        "video_id":   video_id,
        "has_video":  has_video,
        "best_finish": str(best_finish) if best_finish else "—",
        "logo":       f"logos/{team_id}.{ext}",
    })

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(teams, f, ensure_ascii=False, indent=2)

print(f"Exported {len(teams)} teams → {OUT}")
