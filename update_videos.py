import openpyxl
from openpyxl.styles import Font
from copy import copy

# Complete video list from YouTube playlist (title -> videoId)
PLAYLIST_VIDEOS = [
    ("SU Pioneers | European Rover Challenge 2026", "t4noVxT4Giw"),
    ("UCL Rover - Project Sparrow - ERC 2026", "8glh26Wa1Nc"),
    ("Mars Rover Manipal | Video Material | European Rover Challenge 2026", "4o-uxZ59ov8"),
    ("European Rover Challenge 2026 | 4Space Uniovi", "h-VeIkaG9kE"),
    ("DJS Antariksh | European Rover Challenge 2026 | Video Material", "x4igTvvHhuU"),
    ("European Rover Challenge 2026 - Sapienza Technology Team (On-Site Video Material)", "b_tOyhZCcKI"),
    ("FRoST | European Rover Challenge 2026 | Qualification Video | On-Site", "I-fp9ZnBzaU"),
    ("KNR Rover Team | ERC 2026 European Rover Challenge", "k2l_KGLHAXU"),
    ("Beyond Robotics | European Rover Challenge 2026", "ZNmoIjetoL8"),
    ("Ad Astra Rover Team | European Rover Challenge 2026 | Video Material", "WKkbI9KIH6c"),
    ("Ozu Rover Team | European Rover Challenge 2026 On-Site Video Delivery", "GtOuX5OM_oM"),
    ("RoboTeam Twente | European Rover Challenge | Qualification Video 2026", "KlVdo0bCTqg"),
    ("ASU ROAR | European Rover Challenge 2026 Video Submission", "rISZPWrnltI"),
    ("AGH Space Systems - ERC 2026 Video", "jDYPCGRtFr0"),
    ("[R]overTech | European Rover Challenge | 2026", "-JIwM0EOoTY"),
    ("Scorpius - Presentation for European Rover Challenge", "Ofr1L8YfSl4"),
    ("BRACU Mongol-Tori | Polaris | ERC 2026 | Video Report | BRAC University", "oxKuD7Vlq7Y"),
    ("Team Shunya- European Rover Challenge (ERC) 2026 | Video Material", "XI20-R8QtEM"),
    ("ERC 2026 - UPC Space Program", "J-HCjBmqrVA"),
    ("Team Anveshak | ERC 2026 Video Submission", "U8mNH_nq1IM"),
    ("ASTEROPE-III | STAR Dresden e.V. | Qualification Video ERC 2026 (European Rover Challenge)", "8ZgNbHfSh2Y"),
    ("Mind Cloud | ERC 2026 Video", "10PSrX1XN3U"),
    ("Yıldız Rover | ERC 2026 Final Video", "uM1T5jSMsZk"),
    ("EPFL Xplore - Road to ERC 2026 - Project Polaris & Nox", "D9VdHIfbMV8"),
    ("ARES Project ERC 2026 | Final Video", "8noIWJy6KeA"),
    ("IPRL ERC Video Submission 2026", "S36sDyxgl4Y"),
    ("PUCRA Mission PHOENYX | European Rover Challenge 2026", "2dfvHMJxvSo"),
    ("AAU Space Robotics - ERC 2026 Video", "9yHAYgv5Idw"),
    ("IMPULS / ERC 2026 / Promotional video", "B9w0U_sBUSo"),
    ("FHNW Rover Team - ERC26 Video", "WtqgcY760aE"),
    ("Marmara Rover Team | European Rover Challenge 2026 | Video Material", "qhvDLGwtn3I"),
    ("DIANA - European Rover Challenge - 2026 On-Site", "92DXhmUgCQo"),
    ("RoverOva ERC 2026", "z6QcdbLvJY0"),
    ("Team Interplanetar - PROCHESTA V5 | ERC 2026 Video Report", "lhieuVdMiAs"),
    ("ERC 2026 Submission Video", "ouR2wcrn6CY"),  # Project MarsWorks / Marsworks
    ("Project Scorpio - ERC 2026 Video", "-3BLbs_v5a4"),
    ("ITU Rover Team ERC 2026 | Final Video", "Qd2bHFIpln4"),
    ("ERC 2026 Video Submission | Team Deimos | IIT Mandi", "RP8_W_soq8Q"),
    ("Meet TERBY & JEZERO I ETH Rover Team I ERC 2026", "W4xdipOFZ2M"),
    ("Indomitus UCU Space Robotics - ERC 2026", "to2NTyvfPCk"),
    ("Hacettepe Rover Space Troopers | ERC 2026 - Video Material", "kpbktY42ExQ"),
    ("UluRover Team | European Rover Challenge 2026", "D1G-jVNMGhg"),
    ("CTU Robotics | PERUN Gen 3 | European Rover Challenge 2026", "mviugWXpeuo"),
    ("Lunomyss The Rover | Shobolinsky | European Rover Challenge 2026", "SRBmNWNJAjE"),
    ("ORION TEAM | European Rover Challenge 2026", "RL9aq33F2So"),
    ("HSM ARIES LEAPONE | European Rover Challenge 2026 | Video Material", "8-6aMd6mBMg"),
    ("Team Raptors PL - European Rover Challenge 2026", "qDbT50vDyLY"),
    ("TEAM VYOMAGAMI | ERC 2026 | Video Material", "wLUzhwpbAMw"),
    ("Vicharaka ERC SAR video material", "r8T7E5VHB0I"),
    ("GTU ROVER | ERC 2026 Final Video", "fPZmOSKyWqE"),
    ("ProjectRED - European Rover Challenge 2026 - Video Material On-Site", "e55x3kravkk"),
    ("Brno Mars Rover | European Rover Challenge 2026", "n0I8UapGvqQ"),
    ("TAUverIL ERC 2026", "gTP6VyRTbPY"),
    ("Team Ogrodoot - RUET Rover Team | MEER 2.0| ERC 2026 | Video Report", "EpgIO60VS6I"),
    ("BEARS e.V. | TUfasa | European Rover Challenge 2026", "oO-xV4RFj9Y"),
    ("SKA Robotics - ERC 2026 Video Report", "MnZ0kSEzEZU"),
]

# Team name (spreadsheet) -> videoId
TEAM_VIDEO_MAP = {
    "4Space Uniovi": "h-VeIkaG9kE",
    "AAU Space Robotics": "9yHAYgv5Idw",
    "Ad Astra": "WKkbI9KIH6c",
    "AGH Space Systems": "jDYPCGRtFr0",
    "ARES Project": "8noIWJy6KeA",
    "ASU ROAR": "rISZPWrnltI",
    "BEARS": "oO-xV4RFj9Y",
    "Beyond Robotics (GR)": "ZNmoIjetoL8",
    "BRACU Mongol-Tori": "oxKuD7Vlq7Y",
    "Brno Mars Rover": "n0I8UapGvqQ",
    "CRATER (ETH)": "W4xdipOFZ2M",
    "CTU Robotics": "mviugWXpeuo",
    "Deimos (IIT Mandi)": "RP8_W_soq8Q",
    "DIANA": "92DXhmUgCQo",
    "DJS Antariksh": "x4igTvvHhuU",
    "EPFL Xplore": "D9VdHIfbMV8",
    "FHNW Rover": "WtqgcY760aE",
    "Frankfurt Robotics (FRoST)": "I-fp9ZnBzaU",
    "GTU Rover": "fPZmOSKyWqE",
    "Hacettepe Rover": "kpbktY42ExQ",
    "HSM ARIES": "8-6aMd6mBMg",
    "IMPULS": "B9w0U_sBUSo",
    "Imperial Planetary Robotics": "S36sDyxgl4Y",
    "ITU Rover Team": "Qd2bHFIpln4",
    "KNR Rover Team": "k2l_KGLHAXU",
    "Marmara Rover": "qhvDLGwtn3I",
    "Mars Rover Manipal": "4o-uxZ59ov8",
    "Marsworks": "ouR2wcrn6CY",
    "Mind Cloud": "10PSrX1XN3U",
    "Orion Team": "RL9aq33F2So",
    "OzU Rover": "GtOuX5OM_oM",
    "Project Scorpio": "-3BLbs_v5a4",
    "ProjectRED": "e55x3kravkk",
    "PUCRA": "2dfvHMJxvSo",
    "Raptors PL": "qDbT50vDyLY",
    "RoboTeam Twente": "KlVdo0bCTqg",
    "[R]overTech": "-JIwM0EOoTY",
    "Rover Omens": None,
    "RoverOva": "z6QcdbLvJY0",
    "Sapienza Technology Team": "b_tOyhZCcKI",
    "Shobolinsky": "SRBmNWNJAjE",
    "SKA Robotics": "MnZ0kSEzEZU",
    "Space Team Aachen": "Ofr1L8YfSl4",
    "STAR Dresden": "8ZgNbHfSh2Y",
    "SU Pioneers": "t4noVxT4Giw",
    "TAUverIL": "gTP6VyRTbPY",
    "Team Anveshak": "U8mNH_nq1IM",
    "Team Deimos": "RP8_W_soq8Q",  # separate entry already set
    "Team Interplanetar": "lhieuVdMiAs",
    "Team Ogrodoot": "EpgIO60VS6I",
    "Team Shunya": "XI20-R8QtEM",
    "Team Vyomagami": "wLUzhwpbAMw",
    "UCL Rover": "8glh26Wa1Nc",
    "UCU Space Robotics": "to2NTyvfPCk",
    "UluRover": "D1G-jVNMGhg",
    "UPC Space Program": "J-HCjBmqrVA",
    "Vicharaka": "r8T7E5VHB0I",
    "WARR x HORYZN": None,  # already has video
    "Yıldız Rover": "uM1T5jSMsZk",
}

wb = openpyxl.load_workbook("ERC2026_Teams.xlsx")
ws = wb.active

# Reference font style from an existing Watch Video cell
ref_font = Font(
    name="Arial",
    size=9,
    color="1155CC",
    underline="single",
)

updated = []
skipped_already_set = []
not_matched = []

for row in ws.iter_rows(min_row=2, max_row=125):
    team_name = row[0].value
    video_cell = row[8]   # column I
    submitted_cell = row[9]  # column J

    if not team_name or team_name.startswith("TOTAL") or team_name.startswith("🟡"):
        continue

    # Skip if already has a video
    if video_cell.value == "▶ Watch Video":
        skipped_already_set.append(team_name)
        continue

    video_id = TEAM_VIDEO_MAP.get(team_name)
    if video_id:
        url = f"https://www.youtube.com/watch?v={video_id}"
        video_cell.value = "▶ Watch Video"
        video_cell.hyperlink = url
        video_cell.font = copy(ref_font)
        submitted_cell.value = "✅ Yes"
        updated.append((team_name, url))
    else:
        not_matched.append(team_name)

wb.save("ERC2026_Teams.xlsx")

print(f"\n=== UPDATED ({len(updated)}) ===")
for name, url in updated:
    print(f"  {name}: {url}")

print(f"\n=== ALREADY HAD VIDEO ({len(skipped_already_set)}) ===")
for name in skipped_already_set:
    print(f"  {name}")

print(f"\n=== NO VIDEO FOUND ({len(not_matched)}) ===")
for name in not_matched:
    print(f"  {name}")
