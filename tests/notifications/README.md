# Notification tests

Every test title starts with its test case ID (ADM_022, ADM_027, ADM_030).
Find a case:  grep -rn "ADM_027.073" tests
Run one case: npx playwright test --project=chromium-super-admin --grep "ADM_027.073"
(each run also runs the 2 setup tests)

| Folder | What it holds |
|---|---|
| helpers | shared helper files, no tests |
| list | access, list, sort, search, filter, pagination, detail screen |
| create-form | creation form, validation, confirmation dialog, guest flow (nothing is sent) |
| user-selection | user selection screen, CSV upload, deleted users (Super Admin only) |
| image | image in the message editor |
| send-failure | send with every request blocked, expects an error |
| real-send | REAL sends to the QA environment, off by default |
| db-checks | checks against the DB report CSV |

## Roles
- General Admin runs everything:   npm run test:notif:ga
- Super Admin runs only @critical: npm run test:notif:sa   (15 tests)

## Real sends (opt-in, rows stay in the QA list as evidence, titles start with "automated")
- Guest (ALL guests):  npm run test:real-send:guest   (ALLOW_GUEST_SEND=1)
- Registered:          npm run test:real-send:member  (ALLOW_MEMBER_SEND=1, Super Admin only;
  push goes to ALL registered users, in-app goes to TEST_USER_EMAIL only)
Never point these at a colleague's account.
