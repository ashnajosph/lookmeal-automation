#!/bin/bash
# Monthly full run: normal run, optional real-send run, then the TC status workbook.
# Usage (from anywhere):  bash tools/monthly-run.sh
cd "$(dirname "$0")/.." || exit 1

SHEET="docs/PW_TC_Master.xlsx"
[ -f "$SHEET" ] || { echo "Missing $SHEET: copy the TC status workbook there first."; exit 1; }
[ -x tools/.venv/bin/python ] || { echo "Missing tools/.venv: set it up first (python3 -m venv tools/.venv, then pip install openpyxl)."; exit 1; }

DATE=$(date +%Y-%m-%d)
OUT="reports/$DATE"
mkdir -p "$OUT"

echo "1/3 Normal full run (about 5 minutes)..."
PLAYWRIGHT_JSON_OUTPUT_NAME="$OUT/run-normal.json" PLAYWRIGHT_HTML_REPORT="$OUT/html-normal" PLAYWRIGHT_HTML_OPEN=never \
  npx playwright test --reporter=html,json
RESULTS=(--results "$OUT/run-normal.json")

echo
echo "2/3 REAL sends: notifications go to ALL guests, a push goes to ALL registered users, in-app goes to TEST_USER_EMAIL."
read -r -p "Type YES to run them, anything else to skip: " ANSWER
ANSWER=$(echo "$ANSWER" | tr '[:lower:]' '[:upper:]')
if [ "$ANSWER" = "YES" ]; then
  ALLOW_GUEST_SEND=1 ALLOW_MEMBER_SEND=1 PLAYWRIGHT_JSON_OUTPUT_NAME="$OUT/run-real.json" PLAYWRIGHT_HTML_REPORT="$OUT/html-real" PLAYWRIGHT_HTML_OPEN=never \
    npx playwright test tests/notifications/real-send tests/notifications/db-checks/notificationGuestLogs.spec.js --project=chromium-super-admin --workers=1 --reporter=html,json
  RESULTS+=(--results "$OUT/run-real.json")
else
  echo "Real sends skipped: those cases will show as Skipped."
fi

echo
echo "3/3 Building the TC status workbook..."
tools/.venv/bin/python tools/traceability.py "$SHEET" "$OUT/traceability-report.xlsx" "${RESULTS[@]}" --final "$OUT/LookMeal_TC_Status_$DATE.xlsx"

echo
echo "Done. Workbook: $OUT/LookMeal_TC_Status_$DATE.xlsx"
echo "HTML report of the normal run: npx playwright show-report $OUT/html-normal"
