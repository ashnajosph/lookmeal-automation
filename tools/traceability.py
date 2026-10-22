# Maps every test case ID in the sheet to the Playwright tests that carry it.
# Run from the project root:
#   python3 tools/traceability.py <sheet.xlsx> [report.xlsx]
import json, os, re, subprocess, sys
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill

args = sys.argv[1:]
results_files = []
while '--results' in args:  # optional, can be given more than once: JSON result files of runs
    k = args.index('--results')
    results_files.append(args[k + 1])
    del args[k:k + 2]
results_file = results_files[0] if results_files else None
if not args:
    sys.exit('Usage: python3 tools/traceability.py <sheet.xlsx> [report.xlsx] [--results run-results.json]')
sheet_file = args[0]
report_file = args[1] if len(args) > 1 else 'traceability-report.xlsx'
ID = re.compile(r'ADM_\d{3}\.\d{3}')
SHORT = re.compile(r'(ADM_\d{3})\.\d{3}((?:\s*/\s*\.?\d{3}(?!\d))+)')

def ids_of(title):
    ids = ID.findall(title)
    for m in SHORT.finditer(title):  # shorthand such as ADM_002.004/005
        ids += [f"{m.group(1)}.{n}" for n in re.findall(r'\d{3}', m.group(2))]
    return list(dict.fromkeys(ids))

# 1. All tests, straight from Playwright (nothing is run)
json_file = os.environ.get('TRACE_JSON')  # only used to test this script itself
if not json_file:
    json_file = os.path.abspath('traceability-list.json')
    subprocess.run(['npx', 'playwright', 'test', '--list', '--reporter=json'],
                   env={**os.environ, 'PLAYWRIGHT_JSON_OUTPUT_NAME': json_file},
                   stdout=subprocess.DEVNULL, check=True)
data = json.load(open(json_file, encoding='utf8'))
cfg = data['config']
base = (cfg.get('projects') or [{}])[0].get('testDir') or cfg['rootDir']
found = {}
def walk(suite):
    for spec in suite.get('specs', []):
        f = os.path.relpath(os.path.join(base, spec['file']), os.getcwd()).replace(os.sep, '/')
        found.setdefault((f, spec['line'], spec['title']), {'title': spec['title'], 'file': f, 'line': spec['line']})
    for s in suite.get('suites', []):
        walk(s)
for s in data.get('suites', []):
    walk(s)
tests = list(found.values())

# 1b. Last run result per test (only when --results is given)
STATUS = {'expected': 'Pass', 'unexpected': 'Fail', 'flaky': 'Flaky', 'skipped': 'Skipped'}
RANK = ['Fail', 'Flaky', 'Pass', 'Skipped']  # worst first
run_status = {}
run_date = ''
for rf in results_files:
    rdata = json.load(open(rf, encoding='utf8'))
    run_date = max(run_date, (rdata.get('stats') or {}).get('startTime', '')[:10])
    def rwalk(suite):
        for spec in suite.get('specs', []):
            f = os.path.relpath(os.path.join(base, spec['file']), os.getcwd()).replace(os.sep, '/')
            sts = [STATUS.get(t.get('status'), 'Skipped') for t in spec.get('tests', [])]
            if sts:
                key = (f, spec['line'], spec['title'])
                new = min(sts, key=RANK.index)
                # the same test appears once per project: keep the worst result, never let Skipped hide a Pass
                run_status[key] = new if key not in run_status else min([run_status[key], new], key=RANK.index)
        for s2 in suite.get('suites', []):
            rwalk(s2)
    for s2 in rdata.get('suites', []):
        rwalk(s2)

# 2. Index tests by TC ID
by_id, no_id = {}, []
for t in tests:
    ids = ids_of(t['title'])
    if not ids:
        no_id.append(t)
    for i in ids:
        by_id.setdefault(i, []).append(t)

# 3. Read the sheet and compare
MUST = ('Automated', 'Partially Automated')
NONE = ('Not Automated', 'Better to Keep Manual', 'Not Suitable')
wb = openpyxl.load_workbook(sheet_file)
if 'TC Status' not in wb.sheetnames:
    sys.exit('The sheet file has no "TC Status" tab.')
rows = []
for r in wb['TC Status'].iter_rows(min_row=2, values_only=True):
    if r[0] and re.fullmatch(r'ADM_\d{3}\.\d{3}', str(r[0]).strip()):
        rows.append((str(r[0]).strip(), r[1], r[2], str(r[3] or '')))
sheet_ids = {r[0] for r in rows}

out = [['TC ID', 'Module', 'Description', 'Sheet status', 'Tests found', 'Files', 'Lines', 'Tags', 'Result', 'Last run'] ]
run_counts = {}
counts = {}
for tc, mod, desc, status in rows:
    t = by_id.get(tc, [])
    files = '\n'.join(dict.fromkeys(x['file'] for x in t))
    lines = '\n'.join(f"{os.path.basename(x['file'])}:{x['line']}" for x in t)
    tags = ' '.join(dict.fromkeys(g for x in t for g in re.findall(r'@\w+', x['title'])))
    if status in MUST and not t:
        res = 'MISSING: status says automated but no test carries this ID'
    elif status in NONE and t:
        res = 'CHECK: a test exists, the status may be outdated'
    elif status == 'Covered by other test' and not t:
        res = 'OK (covered by the form tests, no own ID)'
    else:
        res = 'OK'
    k = res.split(':')[0].split(' (')[0]
    counts[k] = counts.get(k, 0) + 1
    last = ''
    if results_file:
        sts = [run_status.get((x['file'], x['line'], x['title']), 'Skipped') for x in t]
        last = min(sts, key=RANK.index) if sts else 'No test'
        if last == 'Skipped' and any('/real-send/' in x['file'] or 'GuestLogs' in x['file'] for x in t):
            last = 'Skipped (opt-in real send)'
        run_counts[last] = run_counts.get(last, 0) + 1
    out.append([tc, mod, desc, status, len(t), files, lines, tags, res, last])

extra = sorted(i for i in by_id if i not in sheet_ids)

def put(name, table, widths, color_col=None):
    if name in wb.sheetnames:
        del wb[name]
    ws = wb.create_sheet(name)
    for row in table:
        ws.append(row)
    for c in ws[1]:
        c.font = Font(bold=True)
    ws.freeze_panes = 'A2'
    ws.auto_filter.ref = ws.dimensions
    for i, w in enumerate(widths):
        ws.column_dimensions[openpyxl.utils.get_column_letter(i + 1)].width = w
    for row in ws.iter_rows():
        for c in row:
            c.alignment = Alignment(vertical='top', wrap_text=True)
    if color_col:
        for row in ws.iter_rows(min_row=2):
            v = str(row[color_col - 1].value)
            col = 'FBEBEB' if v.startswith('MISSING') else 'F9EEDA' if v.startswith('CHECK') else 'E5F4E4'
            row[color_col - 1].fill = PatternFill('solid', fgColor=col)
        if ws.max_column >= 10:
            for row in ws.iter_rows(min_row=2):
                v = str(row[9].value)
                col = {'Pass': 'E5F4E4', 'Fail': 'FBEBEB', 'Flaky': 'F9EEDA'}.get(v) or ('F0EFEC' if v.startswith('Skipped') else None)
                if col:
                    row[9].fill = PatternFill('solid', fgColor=col)

put('Traceability', out, [14, 24, 40, 22, 8, 50, 40, 18, 50, 12], 9)
put('Tests without a sheet ID', [['Test title', 'File', 'Line']] + [[t['title'], t['file'], t['line']] for t in no_id], [90, 50, 8])
put('IDs in tests, not in sheet', [['TC ID', 'Files']] + [[i, '\n'.join(dict.fromkeys(x['file'] for x in by_id[i]))] for i in extra], [16, 60])
wb.save(report_file)

print(f"Tests found: {len(tests)} ({len(tests) - len(no_id)} with a TC ID, {len(no_id)} without)")
print(f"Sheet cases: {len(rows)}")
print('Result:', counts)
if results_file:
    print(f'Last run ({run_date}):', run_counts)
print(f"IDs in tests but not in the sheet: {len(extra)}" + (' -> ' + ', '.join(extra) if extra else ''))
for r in [r for r in out[1:] if not r[8].startswith('OK')][:40]:
    print(f"{r[0]}  [{r[3]}]  {r[8]}")
print(f"Report written to {report_file}")
