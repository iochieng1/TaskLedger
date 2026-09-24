# TaskLedger

> **A personal execution system for people building their career on a real-world budget.**

TaskLedger is a productivity web application that combines **tasks, time, money, study and fitness** into one execution-focused dashboard.

Most to-do apps answer:

> "What do I need to do?"

TaskLedger is designed to answer:

> **"What should I do next, how long will it take, what will it cost, and does it fit my actual day?"**

The full product spec — personas, functional requirements, user stories, data model, roadmap phases and success metrics — lives in [`PRD.md`](./PRD.md). This README covers what the project is and how to run it; treat PRD.md as the source of truth for scope decisions.

---

## Why TaskLedger?

A normal task list treats every task as if it exists in isolation. Real life does not.

A student or early-career professional may need to finish an assignment, study JavaScript, work, exercise, save money, buy lunch, and complete a side project — all in the same day. Those actions consume different amounts of **time, money and energy**. TaskLedger makes those constraints visible instead of hiding them in separate apps.

Every task can carry five dimensions:

| Dimension | Example |
|---|---|
| Task | Finish JavaScript exercise |
| Time | 60 minutes |
| Energy | High |
| Money | KES 0 |
| Goal | Improve programming skills |

---

## Features

- **Today dashboard** — daily execution capacity, planned minutes, savings progress, completed tasks, focus minutes, planned spending, current streak, smart task queue
- **Smart task queue** — sorted by completion state, due date, priority, then estimated duration
- **Money dashboard** — monthly income, savings target, current savings, planned task spending, estimated available money
- **Study mode** — dedicated queue, workload, completion percentage, 25-minute focus timer, focus-minute tracking
- **Fitness mode** — planned sessions, completed workouts, workout minutes, average task energy
- **Insights** — a lightweight execution score (completion rate, priority completion, streak consistency) and a plain-language reality check when the plan is overloaded
- **Personalization** — light/dark mode, responsive layout, local persistence, JSON export

See `PRD.md` §6–§7 for the full functional requirements and acceptance criteria behind each of these.

---

## Tech stack

**Current MVP:** HTML5, CSS3, vanilla JavaScript, `localStorage`. No framework, backend, or build process — that keeps it fast to run, easy to understand, and easy to deploy.

**Planned production stack** (see `PRD.md` §19 and §16 for the phased path there): React/Next.js only once complexity justifies it, Supabase for auth and backend, PostgreSQL, deployed on Vercel or Netlify.

---

## Project structure

```text
taskledger/
├── index.html   # structure, views, dialogs, task template
├── styles.css   # layout, dashboard/task cards, dark mode, breakpoints
├── app.js       # state, persistence, CRUD, sorting, dashboard/finance/study/fitness calculations, timer, export
├── README.md    # this file
├── PRD.md       # full product specification
└── .gitignore
```

---

## Getting started

```bash
git clone https://github.com/iochieng1/taskledger.git
cd taskledger
```

No build command is required — open `index.html` directly in a browser. For a better dev experience, use VS Code Live Server or:

```bash
python3 -m http.server 5500
```

Then open `http://localhost:5500`.

---

## How data works

All state lives in `localStorage["taskledger-v1"]`:

```javascript
{
  tasks: [],
  money: { income: 0, target: 0, current: 0 },
  theme: "light",
  focusMinutes: 0
}
```

That makes the MVP backend-free, private by default, and easy to reset — but data does not sync between devices. Cloud sync is Phase 3 in `PRD.md`.

---

## Deployment

This project is a static frontend and is ready to deploy without a build step.

**Render (recommended for a simple static deployment):**
1. Push the repo to GitHub.
2. In Render, click New → Static Site.
3. Connect your GitHub repository.
4. Use the default settings or set:
   - Name: `taskledger`
   - Root Directory: `.`
   - Build Command: leave blank
   - Publish Directory: `.`
5. Click Create Static Site.
6. Render will publish the site from the repo root and give you a live URL.

**GitHub Pages:** push to GitHub, then enable Settings → Pages and select the branch containing `index.html`.

**Netlify:** import the repo. Build command: none. Publish directory: `/`.

---

## Accessibility & privacy

TaskLedger follows semantic HTML, labelled form controls, visible keyboard focus, and non-color-only status cues (see `PRD.md` §12 for the full list). All data stays in the browser — nothing is sent to a server in the current version. See `PRD.md` §13 for the security bar a future cloud version must clear.

---

## Contributing

A useful contribution should solve a clear user problem, fit the product model in `PRD.md`, avoid unnecessary complexity, work on desktop and mobile, and include sensible empty/error states. For larger changes, open an issue first to discuss product impact.

---

## License

This project is currently intended as a portfolio and learning project. Add a license before accepting external contributions or using it commercially.

---

## Author

**Ian Ochieng** — Software Developer / Apprentice — GitHub: `@iochieng1`

#!/usr/bin/env bash

set -euo pipefail

# ============================================================
# FlexiRide Backend
# Cross-Cutting Observability Setup
#
# Covers:
#   - Spring Boot Actuator
#   - Prometheus metrics
#   - JSON structured logging
#   - traceId / spanId MDC fields
#   - application/service names
#   - management endpoints
#   - build verification
#
# Repository:
#   flexiride-backend
#
# Java:
#   21
#
# ============================================================

echo "============================================================"
echo "FlexiRide Backend - Observability Setup"
echo "============================================================"

# ------------------------------------------------------------
# 1. Go to repository root
# ------------------------------------------------------------

cd "$(git rev-parse --show-toplevel)"

echo
echo "Repository:"
pwd

# ------------------------------------------------------------
# 2. Verify Java / Maven wrapper
# ------------------------------------------------------------

echo
echo "===== JAVA / MAVEN ====="

./services/mvnw -version

# Expected:
# Java version: 21.x
# Apache Maven 3.8.7 or compatible Maven wrapper version

# ------------------------------------------------------------
# 3. Verify Java version configured by the project
# ------------------------------------------------------------

echo
echo "===== JAVA VERSION CONFIGURATION ====="

grep -nE \
  '<java.version>|<maven.compiler.source>|<maven.compiler.target>|<release>' \
  pom.xml \
  services/*/pom.xml \
  2>/dev/null || true

# Expected:
# Java 21

# ------------------------------------------------------------
# 4. Verify root dependency management
# ------------------------------------------------------------

echo
echo "===== ROOT OBSERVABILITY DEPENDENCY MANAGEMENT ====="

grep -n -A4 -B2 \
  -E 'micrometer-registry-prometheus|logstash-logback-encoder' \
  pom.xml || true

# Expected:
# micrometer-registry-prometheus
# logstash-logback-encoder

# ------------------------------------------------------------
# 5. Verify observability dependencies in every module
# ------------------------------------------------------------

echo
echo "===== MODULE OBSERVABILITY DEPENDENCIES ====="

for dir in services/* gateways/*; do

  if [ -f "$dir/pom.xml" ]; then

    echo
    echo "===== $dir ====="

    grep -E \
      'spring-boot-starter-actuator|micrometer-registry-prometheus|logstash-logback-encoder' \
      "$dir/pom.xml" || true

  fi

done

# ------------------------------------------------------------
# 6. Verify Actuator dependency in every module
# ------------------------------------------------------------

echo
echo "===== ACTUATOR DEPENDENCY ====="

for dir in services/* gateways/*; do

  if [ -f "$dir/pom.xml" ]; then

    if grep -q 'spring-boot-starter-actuator' "$dir/pom.xml"; then
      echo "OK      $dir"
    else
      echo "MISSING $dir"
    fi

  fi

done

# ------------------------------------------------------------
# 7. Verify Prometheus dependency in every module
# ------------------------------------------------------------

echo
echo "===== PROMETHEUS DEPENDENCY ====="

for dir in services/* gateways/*; do

  if [ -f "$dir/pom.xml" ]; then

    if grep -q 'micrometer-registry-prometheus' "$dir/pom.xml"; then
      echo "OK      $dir"
    else
      echo "MISSING $dir"
    fi

  fi

done

# ------------------------------------------------------------
# 8. Verify Logstash Logback encoder in every module
# ------------------------------------------------------------

echo
echo "===== LOGSTASH LOGBACK DEPENDENCY ====="

for dir in services/* gateways/*; do

  if [ -f "$dir/pom.xml" ]; then

    if grep -q 'logstash-logback-encoder' "$dir/pom.xml"; then
      echo "OK      $dir"
    else
      echo "MISSING $dir"
    fi

  fi

done

# ------------------------------------------------------------
# 9. Count Logback configuration files
# ------------------------------------------------------------

echo
echo "===== LOGBACK FILE COUNT ====="

find services gateways \
  -type f \
  -name "logback-spring.xml" \
  | sort

LOGBACK_COUNT=$(
  find services gateways \
    -type f \
    -name "logback-spring.xml" \
    | wc -l
)

echo
echo "Logback files: $LOGBACK_COUNT"

# Expected:
# 15

# ------------------------------------------------------------
# 10. Verify traceId / spanId coverage
# ------------------------------------------------------------

echo
echo "===== TRACE MDC COVERAGE ====="

find services gateways \
  -type f \
  -name "logback-spring.xml" \
  -print0 |
while IFS= read -r -d '' file; do

  if grep -q '<includeMdcKeyName>traceId</includeMdcKeyName>' "$file" &&
     grep -q '<includeMdcKeyName>spanId</includeMdcKeyName>' "$file"; then

    echo "OK      $file"

  else

    echo "MISSING $file"

  fi

done

# ------------------------------------------------------------
# 11. Verify management endpoint configuration
# ------------------------------------------------------------

echo
echo "===== MANAGEMENT CONFIGURATION ====="

grep -R -n -E \
  'management\.endpoints|management:|prometheus|exposure:|show-details|probes:' \
  services/*/src/main/resources/application.properties \
  gateways/*/src/main/resources/application.properties \
  gateways/*/src/main/resources/application.yml \
  2>/dev/null || true

# ------------------------------------------------------------
# 12. Verify Prometheus exposure in services
# ------------------------------------------------------------

echo
echo "===== PROMETHEUS CONFIG COUNT ====="

PROMETHEUS_CONFIG_COUNT=$(
  grep -R -l \
    'management.endpoints.web.exposure.include=.*prometheus' \
    services/*/src/main/resources/application.properties \
    2>/dev/null |
  wc -l
)

echo "Services exposing Prometheus: $PROMETHEUS_CONFIG_COUNT"

# Expected:
# 13 services

# ------------------------------------------------------------
# 13. Verify application names
# ------------------------------------------------------------

echo
echo "===== APPLICATION NAMES ====="

grep -H '^spring.application.name=' \
  services/*/src/main/resources/application.properties \
  gateways/web-bff/src/main/resources/application.properties \
  2>/dev/null || true

echo
echo "===== BFF APPLICATION NAMES ====="

grep -H '^spring.application.name=' \
  gateways/mobile-bff/src/main/resources/application.yml \
  gateways/web-bff/src/main/resources/application.yml \
  2>/dev/null || true

# Expected:
# mobile-bff
# web-bff
#
# Important:
# web-bff application.properties must not override the YAML
# application name with userService.

# ------------------------------------------------------------
# 14. Verify BFF management endpoints
# ------------------------------------------------------------

echo
echo "===== MOBILE BFF MANAGEMENT ====="

grep -A12 '^management:' \
  gateways/mobile-bff/src/main/resources/application.yml || true

echo
echo "===== WEB BFF MANAGEMENT ====="

grep -A12 '^management:' \
  gateways/web-bff/src/main/resources/application.yml || true

# Expected exposure:
# health,info,metrics,env,loggers,prometheus

# ------------------------------------------------------------
# 15. Verify no temporary backup files remain
# ------------------------------------------------------------

echo
echo "===== BACKUP FILES ====="

BACKUP_COUNT=$(
  find . \
    -type f \
    -name "*.backup-observability" |
  wc -l
)

echo "Backup files: $BACKUP_COUNT"

find . \
  -type f \
  -name "*.backup-observability" \
  -print

# Expected:
# 0

# ------------------------------------------------------------
# 16. Verify User Service application class
# ------------------------------------------------------------

echo
echo "===== USER SERVICE APPLICATION ====="

grep -R -n \
  -E '@SpringBootApplication|public static void main' \
  services/user/src/main/java

# ------------------------------------------------------------
# 17. Build the entire project
# ------------------------------------------------------------

echo
echo "============================================================"
echo "===== MAVEN CLEAN VERIFY ====="
echo "============================================================"

./services/mvnw clean verify -DskipTests

# Expected:
# BUILD SUCCESS

# ------------------------------------------------------------
# 18. Show Git changes
# ------------------------------------------------------------

echo
echo "============================================================"
echo "===== GIT STATUS ====="
echo "============================================================"

git status --short

echo
echo "Observability verification complete."
echo
echo "Next step:"
echo "  git diff"
echo
echo "Then commit:"
echo "  git add ."
echo "  git commit -m \"feat: add cross-cutting observability\""
echo
echo "Then push:"
echo "  git push -u origin feat/add-cross-cutting-observability"

