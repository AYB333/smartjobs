# SmartJobs - Complete Project Context

> Recruitment web platform for the CHR sector in Morocco: Cafe, Hotel, Restaurant.
> Built as a student internship project for Smart Ai / Kingsoft, with the idea of extending the SmartCaisse ecosystem.

---

## 1. Project Overview

**Name:** SmartJobs

**Type:** SaaS web application / job board

**Main goal:** Connect candidates looking for hospitality jobs with recruiters from cafes, hotels, and restaurants.

**Problem:** CHR businesses often need staff quickly because turnover is high. Recruitment is usually informal: WhatsApp messages, paper CVs, word of mouth, or social media posts. SmartJobs centralizes the process in one platform.

**Solution:** SmartJobs gives:
- Candidates a guided profile, CV upload, job search, applications, and quiz flow.
- Recruiters a dashboard to publish offers, add optional quizzes, and manage applications.
- Admins a dashboard to monitor users, offers, and moderation.

---

## 2. Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | Laravel 11 REST API |
| Frontend | React + Vite |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| Database | MySQL |
| Auth | Laravel Sanctum token auth |
| Payment | Stripe test mode |
| Scheduler | Laravel Task Scheduling |

---

## 3. Main Roles

### Candidat

A candidate can:
- Register and log in.
- Complete profile information: city, experience, target position, availability, and preferred contract.
- Upload a CV PDF and optional profile photo.
- Browse and filter job offers.
- Apply to an offer using the CV already stored in the candidate profile.
- Pass a quiz if the offer has one.
- Track applications, statuses, and quiz scores.

### Recruteur

A recruiter can:
- Register and log in.
- Access a recruiter dashboard.
- Create job offers with title, description, city, salary, contract type, validity duration, and an optional workplace image.
- Add an optional QCM quiz to an offer.
- View applicants and their CV/quiz score.
- Accept or refuse applications.
- Use a premium system to unlock unlimited profile views.

### Admin

An admin can:
- View global platform stats.
- Moderate offers by activating or suspending them.
- Browse users by role.
- Use tabs and filters to manage the dashboard more easily.

---

## 4. Design System

**Visual identity:**
- Deep navy / obsidian dark theme.
- Orange accent color for actions and CHR energy.
- Glassmorphism cards with soft borders and blur.
- Premium but realistic student-project interface.

**Core colors:**

```txt
Deep navy: #0A2540
Obsidian:  #0B0F19
Accent:    #E8651A
Light bg:  near-white gradients
Font:      Inter
```

**Frontend UX features:**
- Dark/light mode toggle saved in localStorage.
- FR/EN/AR i18n resources exist, but the visible language switcher is hidden for soutenance so the demo remains in French.
- Command palette with Ctrl+K.
- Toast notifications.
- Lazy-loaded routes with React.lazy.
- Responsive navbar and mobile menu.
- Guided onboarding panels for candidate and recruiter dashboards.

---

## 5. Database Schema Summary

```sql
users
  id, name, email, password,
  role enum(admin, candidat, recruteur),
  is_premium,
  premium_expires_at,
  vues_aujourdhui,
  derniere_vue_date,
  timestamps

candidat_profiles
  id, user_id,
  ville, experience, poste_recherche,
  disponibilite, contrat_prefere,
  cv_path, photo_path,
  timestamps

recruteur_profiles
  id, user_id,
  nom_etablissement, ville, type_etablissement,
  timestamps

job_offers
  id, recruteur_id,
  titre_poste, description, ville,
  salaire, type_contrat, duree_validite,
  expires_at, status, suspension_reason, image_path,
  timestamps

quizzes
  id, job_offer_id,
  titre, passing_score,
  timestamps

questions
  id, quiz_id,
  question_text, options, correct_answer,
  timestamps

applications
  id, job_offer_id, candidat_id,
  status, quiz_score, cv_path,
  timestamps
  unique(job_offer_id, candidat_id)

saved_job_offers
  id, user_id, job_offer_id,
  timestamps
  unique(user_id, job_offer_id)

user_notifications
  id, user_id,
  type, title, message, data, read_at,
  timestamps

application_messages
  id, application_id, sender_id,
  message, read_at,
  timestamps

payments
  id, recruteur_id,
  amount, package_type, stripe_payment_id, status,
  created_at
```

---

## 6. Critical Business Rules

These rules should not be broken.

1. **Offer expiration**
   - Scheduler marks offers as `expired` when `expires_at < now()`.

2. **Daily profile view quota**
   - Free recruiters can view only one unique candidate profile per day.
   - The counter should not increase on every refresh.
   - Premium recruiters have unlimited views.

3. **Premium expiration**
   - Scheduler disables premium when `premium_expires_at < now()`.

4. **Premium activation**
   - Confirmed payment sets `is_premium=true`.
   - Premium lasts 30 days.

5. **Quiz flow**
   - Candidate must be able to apply first.
   - `postuler()` creates the application whether or not the offer has a quiz.
   - `postuler()` reuses `candidat_profiles.cv_path`; candidates must complete profile fields and upload CV before applying.
   - Duplicate applications are rejected with HTTP 409 and the existing application payload.
   - Database also enforces one application per candidate per offer with a unique index.
   - API returns `has_quiz`.
   - If there is a quiz, frontend redirects to `/candidat/quiz/{offer_id}`.
   - `submitQuiz()` updates the existing application with `quiz_score`.

6. **Accepted application discussion**
   - Discussion is available only after a candidature is accepted.
   - Only the accepted candidate and the recruiter who owns the offer can read/send messages.
   - Chat messages are simple in-app messages, not realtime WebSocket chat.

---

## 7. API Endpoints

### Public

```txt
POST /api/auth/register
POST /api/auth/login
GET  /api/offres
GET  /api/offres/filters
GET  /api/offres/{id}
POST /api/payment/webhook
```

### Authenticated

```txt
GET   /api/auth/me
POST  /api/auth/logout
PATCH /api/auth/me
GET   /api/notifications
GET   /api/notifications/unread-count
PATCH /api/notifications/{id}/read
PATCH /api/notifications/read-all
GET   /api/postulations/{id}/messages
POST  /api/postulations/{id}/messages
```

### Candidat

```txt
POST /api/offres/{id}/postuler
GET  /api/mes-postulations (optional `limit`, max 100)
GET  /api/saved-offers
POST /api/offres/{id}/save
DELETE /api/offres/{id}/save
GET  /api/offres/{id}/pass-quiz
POST /api/offres/{id}/pass-quiz/submit
```

### Recruteur

```txt
GET    /api/mes-offres
POST   /api/offres
PUT    /api/offres/{id}
DELETE /api/offres/{id}
GET    /api/offres/{id}/postulants
PATCH  /api/postulations/{id}/status
POST   /api/offres/{id}/quiz
GET    /api/offres/{id}/quiz
DELETE /api/quizzes/{id}
POST   /api/quizzes/{id}/questions
DELETE /api/questions/{id}
POST   /api/payment/create-intent
POST   /api/payment/confirm
GET    /api/payment/subscription
```

`GET /api/mes-offres` returns recruiter offers with `applications_count`, `quiz_exists`, and loaded recent application data (`applications.candidat.candidatProfile`) so the recruiter dashboard can show recent applications without calling `/postulants` and consuming profile-view quota.

### Admin

```txt
GET   /api/admin/stats
GET   /api/admin/users
PATCH /api/admin/offers/{id}/status
```

`PATCH /api/admin/offers/{id}/status` accepts `status=active|suspended`. When suspending, admin can send optional `suspension_reason`; when activating again, the reason is cleared.

---

## 8. Frontend Routes

### Public

| Route | Page | Purpose |
| --- | --- | --- |
| `/` | Home | Landing page, search, featured offers, platform positioning |
| `/jobs` | Jobs | Job listing with API filters, query params, sorting, active chips |
| `/jobs/:id` | JobDetail | Offer details and application modal |
| `/auth` | Auth | Login/register split screen |

Useful auth query params:

```txt
/auth?mode=register
/auth?role=recruteur&mode=register
```

### Candidat

| Route | Page | Purpose |
| --- | --- | --- |
| `/candidat` | redirect | Redirects to `/candidat/dashboard` |
| `/candidat/dashboard` | CandidatDashboard | Candidate home page, recommendations, next action, recent applications |
| `/candidat/profile` | CandidatProfile | Step-by-step profile, CV upload, photo upload |
| `/candidat/quiz/:id` | QuizPage | QCM quiz and score result |

### Recruteur

| Route | Page | Purpose |
| --- | --- | --- |
| `/recruteur` | redirect | Redirects to `/recruteur/dashboard` |
| `/recruteur/dashboard` | RecruteurDashboard | Professional recruiter home page, recent applications, offers table, quota |
| `/recruteur/profile` | RecruteurProfile | Recruiter establishment profile builder |
| `/recruteur/offer/create` | RecruteurOfferForm | Multi-step offer creation with optional quiz |
| `/recruteur/offer/edit/:id` | RecruteurOfferForm | Edit offer and optional image |
| `/recruteur/candidatures` | RecruteurCandidatures | Professional applications management page with filters, CV, quiz score, accept/refuse |
| `/recruteur/premium` | PremiumPage | Stripe premium checkout |

### Admin

| Route | Page | Purpose |
| --- | --- | --- |
| `/admin` | redirect | Redirects to `/admin/dashboard` |
| `/admin/dashboard` | AdminDashboard | Stats, tabs, offer moderation, user management |

---

## 9. Main User Journeys

### Candidate journey

```txt
Register
-> Complete profile
-> Upload CV
-> Browse jobs
-> Open job detail
-> Apply using saved profile CV
-> Pass quiz if required
-> Track application in dashboard
```

### Recruiter journey

```txt
Register
-> Open recruiter dashboard
-> Create first job offer
-> Add optional quiz
-> Receive applications
-> View CV and quiz scores
-> Accept/refuse candidates
-> Upgrade to premium if quota is limiting
```

### Admin journey

```txt
Login
-> Open admin dashboard
-> Check platform stats
-> Filter offers
-> Suspend or activate offers
-> Filter users by role
```

---

## 10. Navigation

### Public navbar

```txt
Logo -> /
Voir les offres -> /jobs
Inscription -> /auth?mode=register
Connexion -> /auth
Theme toggle
Command palette
```

### Candidate navbar

```txt
Principale -> /candidat/dashboard
Voir les offres -> /jobs
Mes candidatures -> /candidat/dashboard#mes-candidatures
User/avatar pill -> /candidat/profile, uses profile photo when available
Deconnexion
```

### Recruiter navbar

```txt
Principale -> /recruteur/dashboard
Mes offres -> /recruteur/dashboard#mes-offres
Candidatures -> /recruteur/candidatures
Creer une offre -> /recruteur/offer/create
User pill/avatar -> /recruteur/profile
Deconnexion
```

### Admin navbar

```txt
Dashboard -> /admin/dashboard
Voir les offres -> /jobs
Gestion admin -> /admin/dashboard
Deconnexion
```

---

## 11. Landing Page Current State

The landing page has been polished to look like a professional recruitment platform.

Current landing features:
- Dark premium hero with CHR image background.
- Clear headline: job search for hospitality and restauration.
- CTA buttons:
  - Trouver une offre -> `/jobs`
  - Publier une offre -> `/auth?role=recruteur&mode=register`
- Search form:
  - keyword
  - city/region
  - navigates to `/jobs?search=...&ville=...`
- Clickable category badges that search by job keyword.
- Platform highlight blocks instead of fake large counters.
- Featured offers loaded from the API.
- Improved light mode for landing page, job cards, and footer.

---

## 12. Jobs Page Current State

Jobs page includes:
- Header: `Offres disponibles`.
- Results count based on filtered offers.
- Search input using existing API search.
- Sidebar filters from `/api/offres/filters`.
- Salary min/max filters handled on the frontend with compact premium salary fields and MAD suffix.
- Desktop job cards use a horizontal hospitality job-board layout.
- Job cards show offer image when available; otherwise they show a default local gradient visual based on establishment type: cafe, hotel, or restaurant.
- Offer API responses expose `establishment_name` and `establishment_type` derived from the recruiter profile.
- Frontend sorting:
  - Plus recentes
  - Salaire eleve
  - Expire bientot
  - Avec quiz
- Active filter chips, each chip can clear its filter.
- Reset filters button in the filter panel and empty state.
- Mobile filters can be collapsed behind a filters button.
- Job cards have a subtle hover lift, orange border glow, and soft shadow.
- Job cards display `image_url` when an offer has an uploaded image.

Job detail `/jobs/:id` includes:
- Balanced hero with `Retour aux offres`, offer badges, establishment name, key data, and image/default establishment visual.
- Two-column layout: left content sections and right sticky application card.
- Content sections: description, main information rows, establishment block, and quiz explanation when required.
- Application card keeps existing duplicate/application/quiz state logic and shows profile/CV readiness.
- Candidate save button is visually active and clear.
- Page uses enough minimum height so the footer does not jump too high on short offers.

---

## 13. Auth Page Current State

Auth page:
- Split-screen login/register page.
- Left form panel.
- Right image panel with dark overlay.
- Role selector for candidat/recruteur during registration.
- Query params can preselect mode and role.
- Light mode has premium near-white gradient and improved form styling.
- Back link text: `Retour a l'accueil` / rendered as `Retour a l'accueil` depending on font/encoding.

Important: Auth behavior was not changed during UI polish.

---

## 14. Dashboard UX Improvements

### Candidate dashboard

Candidate dashboard includes:
- Professional candidate home page inspired by job platforms.
- Welcome panel with horizontal candidate photo/initials greeting and profile completion widget.
- Recommended offers derived from existing `/api/offres` data using city, target position, preferred contract, and profile data, displayed as compact image-based cards with establishment placeholders.
- Recommended offer cards explain why an offer fits: city match, target position match, preferred contract, or high matching score.
- Saved offers preview from `/api/saved-offers`, so candidates can return to favorite opportunities quickly.
- Recent applications table with city, status, quiz score, date, and offer action.
- Compact application timeline in each recent application row: application sent, quiz state, recruiter decision.
- Accepted applications show a `Discussion` action so candidate and recruiter can exchange simple messages.
- One next-action card only: complete profile, add CV, pass pending quiz, or explore jobs.
- Candidate notification card highlights missing profile/CV, pending quiz, and accepted/refused applications.
- Navbar notification bell uses backend unread count, dropdown list, read item, and read-all actions.
- Clean summary rows for sent, pending, accepted, and rejected applications.
- Empty states with clear CTA.
- Job detail readiness indicators: `Profil complete` and `CV ajoute`.
- Job detail loads `/api/mes-postulations?limit=100` for candidates and replaces the apply button with the correct state: pass quiz, pending, accepted, rejected, or quiz sent.
- Job detail shows profile match score and lets candidates save/unsave the offer.
- Application modal no longer asks for CV upload; it confirms use of the saved profile CV.

### Candidate profile builder

Candidate profile page `/candidat/profile` is now a guided profile builder:
- Two-column layout on desktop, stacked on mobile.
- Left side: professional information and documents in clear form sections.
- Right side: completion card, concise recruiter preview, and profile guidance.
- The design was simplified to feel closer to a professional recruitment platform and avoid a noisy dashboard/coding-tool look.
- `ville` uses Moroccan city choices: Casablanca, Rabat, Marrakech, Agadir, Fes, Tanger, Meknes, Oujda, Tetouan, El Jadida.
- `experience` uses predefined ranges.
- `poste_recherche` uses CHR job choices.
- `disponibilite` and `contrat_prefere` use controlled choices and improve recommendations.
- Existing free-text saved values are preserved by adding them safely to select options if they do not match the predefined choices.
- Frontend profile mapping accepts `candidatProfile`, `candidat_profile`, and `profile`, plus `cv_path/cv_url` and `photo_path/photo_url`, so refresh keeps saved values visible.
- CV PDF upload remains max 2MB and is reused automatically for applications.
- Profile photo remains optional, counts toward visual completion, and is previewed mainly in recruiter preview/dashboard/navbar instead of a large upload-box preview.

### Recruiter dashboard

Recruiter dashboard includes:
- Professional recruiter home page inspired by employer SaaS dashboards.
- Welcome panel with establishment identity and quick CTAs.
- Quick access to edit the recruiter establishment profile.
- Recent applications across recruiter offers, using `/mes-offres` application data.
- Clean offers table with status filters: all, active, expired, suspended.
- The offers section has the stable anchor `#mes-offres` for recruiter navbar navigation.
- Actions for each offer: view, candidatures, edit.
- Compact summary rows for active offers, received applications, and today's views.
- Smaller quota premium card with `Passer Premium` CTA when limited.
- Empty states with CTA to create the first offer.

### Recruiter profile builder

Recruiter profile page `/recruteur/profile` includes:
- Two-column professional setup screen, similar in quality to candidate profile.
- Form fields for responsible name, establishment name, establishment type, and city.
- Uses existing `PATCH /api/auth/me`; no backend schema change.
- Completion card showing missing recruiter profile items.
- Public preview card with establishment initials, type, city, and responsible name.
- After save, localStorage user/profile data is refreshed so navbar/dashboard stay in sync.
- Recruiter navbar user pill/avatar is clickable and opens `/recruteur/profile`.

### Recruiter candidatures

Recruiter candidatures page includes:
- Header with total, pending, accepted, and rejected application summaries.
- Filters for candidate/offer search, offer, status, and quiz score.
- Candidate review cards showing candidate identity, offer, city, status, quiz score, application date, CV action, and status actions.
- Candidate cards include a frontend review score to rank stronger profiles first using quiz score, city, target position, and experience when available.
- CV action uses existing stored CV paths/URLs and does not change backend download logic.
- Status updates keep using `PATCH /api/postulations/{id}/status`.
- Accepted candidates show a `Discussion` action with the same accepted-only chat session used by candidates.
- Empty states guide the recruiter to create an offer or reset filters.

### Recruiter offer quality

Offer create/edit form includes:
- Optional offer/workplace image upload and preview.
- Live quality score based on title, description length, salary, image, and quiz.
- Helper chips showing what is complete and what is missing before publishing.

### Admin dashboard

Admin dashboard includes:
- Stats cards.
- Tabs:
  - Vue globale
  - Offres
  - Utilisateurs
- Offers table with search and status filter.
- Users table with search and role filter.
- Offer status actions: activate/suspend; suspension can include an optional moderation reason shown in the admin table.
- Lightweight analytics bars for offer statuses and user role distribution.

### Shared app shell

Navbar includes:
- Search/command palette entry.
- Theme toggle.
- Language switcher is hidden for soutenance; the app stays in French.
- Notification bell for authenticated users with backend unread count, dropdown, and read/read-all behavior.
- Candidate user pill opens `/candidat/profile` and uses profile photo when available.

---

## 15. Security and Validation

Implemented or planned security basics:
- Laravel Sanctum bearer tokens.
- Role-based middlewares: candidat, recruteur, admin.
- CORS configured for frontend URL.
- Login rate limiting.
- CV upload restricted to PDF, max 2MB.
- Photo upload restricted to JPEG/PNG, max 2MB.
- Offer image upload restricted to JPEG/PNG/WEBP, max 2MB.
- Laravel validation on key endpoints.
- Correct answers are hidden when candidate loads quiz questions.

---

## 16. Environment Variables

### Backend `.env`

```txt
APP_NAME=SmartJobs
APP_URL=http://localhost:8000
DB_DATABASE=smartjobs_db
DB_USERNAME=root
DB_PASSWORD=
STRIPE_KEY=pk_test_xxx
STRIPE_SECRET=sk_test_xxx
FRONTEND_URL=http://localhost:5173
```

### Frontend `.env`

```txt
VITE_API_URL=http://localhost:8000/api
```

### Frontend production `.env`

```txt
VITE_API_URL=https://your-backend-domain.com/api
```

---

## 17. Demo Accounts

Use these accounts if seeders are loaded.

```txt
Admin:
  admin@smartjobs.ma / password

Recruiters:
  r1@smartjobs.ma / password
  r2@smartjobs.ma / password
  r3@smartjobs.ma / password
  r4@smartjobs.ma / password
  r5@smartjobs.ma / password
  r6@smartjobs.ma / password

Candidates:
  c1@smartjobs.ma / password
  c2@smartjobs.ma / password
  c3@smartjobs.ma / password
  c4@smartjobs.ma / password
  c5@smartjobs.ma / password
  c6@smartjobs.ma / password
  c7@smartjobs.ma / password
  c8@smartjobs.ma / password
  c9@smartjobs.ma / password
  c10@smartjobs.ma / password
```

Demo data:
- 30 seeded offers.
- 26 active offers visible on public jobs pages.
- 2 suspended offers for admin moderation tests.
- 2 expired offers for status/expiration tests.
- Mixed contract types: CDI, CDD, Extra, Saisonnier.
- Cities: Casablanca, Agadir, Marrakech, Rabat, Fes, Tanger.
- 15 offers have quizzes.
- 45 seeded quiz questions.
- 20 applications already exist with mixed statuses and quiz scores.
- `DatabaseSeeder` resets job-board demo data before reseeding: offers, quizzes, questions, applications, and old offer image files.

---

## 18. Demo Scenario for Soutenance

### 1. Public flow

1. Open `/`.
2. Explain SmartJobs: CHR recruitment platform.
3. Show hero, CTAs, search, and featured offers.
4. Search for a role or city.
5. Open `/jobs`.
6. Filter jobs by city/contract.
7. Open a job detail page.

### 2. Candidate flow

1. Register as candidate or login with seed account.
2. Show candidate dashboard home page with recommendations and recent applications.
3. Go to candidate profile.
4. Fill profile and upload CV.
5. Browse jobs.
6. Apply to an offer.
7. If quiz exists, pass the quiz.
8. Show application status in dashboard.

### 3. Recruiter flow

1. Login as recruiter.
2. Show recruiter dashboard and quota.
3. Create a new job offer.
4. Add optional quiz.
5. Open candidatures page.
6. View applicants, CV, quiz score.
7. Accept or refuse an application.
8. Show premium page and explain Stripe test mode.

### 4. Admin flow

1. Login as admin.
2. Show stats cards.
3. Open offers tab.
4. Search/filter offers.
5. Suspend or activate an offer.
6. Open users tab.
7. Filter users by role.

---

## 19. Project Status

### Core backend completed

- Auth register/login/logout.
- Role-based protected APIs.
- Offers CRUD.
- Applications with CV upload.
- Saved job offers/favorites for candidates.
- Quiz creation and quiz submission.
- Premium subscription through Stripe test mode.
- Admin stats/users/moderation endpoints.
- Admin offer suspension reasons with automatic clearing on reactivation.
- In-app notifications for application received, application accepted/refused, and new matching offers.
- Accepted-only application discussion messages between recruiter and candidate.
- Scheduler tasks for expiration and quota reset.

### Main frontend flows implemented

- Public landing and job browsing.
- Candidate saved jobs on listing/detail/dashboard.
- Candidate dashboard/profile/quiz flow.
- Recruiter dashboard/offer/candidatures/premium flow.
- Optional offer image upload with preview in create/edit offer form.
- Offer quality score in recruiter offer form.
- Admin dashboard with tabs and filters.
- Admin offer moderation reason modal.
- Admin lightweight analytics cards.
- Dark/light mode.
- FR/EN/AR i18n resources kept; visible switcher hidden for soutenance and demo language locked to French.
- Command palette.
- Toast notifications and real backend notification bell.
- Accepted application chat modal for candidate and recruiter.
- Responsive navbar.

### Verification

Recent checks:

```txt
npm run lint
npm run build
php artisan test
```

All passed during the latest development cycle.

Current backend feature coverage includes:
- Candidate application without quiz reuses saved profile CV.
- Candidate application with quiz creates the application first, then quiz submission updates `quiz_score`.
- Candidate cannot open a quiz directly before applying to the offer.
- Duplicate application returns HTTP 409 and remains a single database row.
- Candidate without CV cannot apply.
- Recruiter can accept/refuse own applications and cannot update another recruiter's application.
- Admin can suspend/activate offers with optional suspension reasons; suspended offers are hidden from the public active offers endpoint and reasons are cleared on reactivation.
- Role guards block candidate access to recruiter APIs and recruiter access to admin APIs.
- Candidate can save and unsave active offers.
- Notification endpoints support unread count, listing, marking one notification read, and marking all read.
- Accepted application chat allows only the candidate and owning recruiter to read/send messages.

Latest full pass:

```txt
npm run lint
npm run build
php artisan test
```

All passed. Backend test suite currently reports 13 tests and 78 assertions.

---

## 20. Known Limitations

Current limitations:
- Stripe is in test mode.
- No real Moroccan payment gateway integration yet.
- In-app notifications are implemented, but there is no email notification system.
- Chat is accepted-only and request/response based, not realtime WebSocket chat.
- Quiz system is basic QCM: no timer, no randomization.
- Admin dashboard has lightweight analytics, not advanced charts.
- Search uses existing API filtering/basic database search, not a dedicated search engine.
- No mobile application.

Future improvements:
- Real payment gateway such as CMI.
- Email notifications for application status changes.
- Job alerts for candidates.
- Analytics charts for admin/recruiters.
- Stronger matching algorithm based on more structured profile and offer requirements.
- SmartCaisse integration entry point.
- Mobile app for candidates.

---

## 21. Deployment Plan

### Backend

```bash
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan storage:link
php artisan migrate --force
php artisan db:seed --force
```

Scheduler cron:

```bash
* * * * * php /path/to/artisan schedule:run
```

### Frontend

```bash
npm install
npm run build
```

Deploy the `dist` output and configure:

```txt
VITE_API_URL=https://your-backend-domain.com/api
```

Post-deploy checklist:
- Update backend CORS allowed origin.
- Update `FRONTEND_URL`.
- Test auth.
- Test job browsing.
- Test candidate application and quiz.
- Test recruiter offer creation.
- Test offer image upload and verify `php artisan storage:link` exists for public image URLs.
- Test admin moderation.
- Test Stripe webhook URL if payments are used.

---

## 22. Known Bugs Fixed

| Issue | Fix |
| --- | --- |
| Quiz flow blocked application | Application is created first; quiz updates existing application |
| Direct quiz URL could load before application | Quiz access now requires an existing application and shows a clear return action |
| Quota incremented on refresh | Quota now increments only once per unique candidate profile per day |
| Axios used hardcoded localhost | API base URL moved to `VITE_API_URL` |
| Navbar overlap | Responsive navbar breakpoints and mobile menu improved |
| Candidate dashboard unclear | Reworked into a cleaner candidate home page with recommendations, recent applications, one next action, and compact summary |
| Recruiter dashboard unclear | Reworked into a cleaner employer home page with recent applications, offers table, summary, and quota card |
| Admin dashboard too crowded | Reworked into tabs with filters |
| Landing page looked generic | Improved CHR recruitment positioning and CTAs |
| Jobs page felt basic | Added header, sorting, filter chips, mobile filter collapse, and polished empty state |
| Light mode unfinished | Polished landing, job cards, footer, and auth page |
| Auth back link overlapped title | Moved back link into normal layout flow |
| Dashboard became unclickable after login | Command palette now closes on navigation and its backdrop no longer traps page clicks |
| Candidate had to upload CV on every application | CV is uploaded once in profile and reused by `postuler()` |
| Duplicate applications possible at database level | Added unique index on `applications(job_offer_id, candidat_id)` plus HTTP 409 duplicate response |
| Public footer and auth page had dead placeholder links | Footer contact uses email, legal text is non-clickable, and forgotten password placeholder is no longer a dead link |
| Notification bell had no navigation action | Bell now links to the best role page: candidate dashboard, recruiter candidatures, or admin dashboard |
| Save offer UI appeared for non-candidates | Job cards now hide save actions unless the logged-in user is a candidate |
| Non-candidate users could see an apply-style job detail CTA | Job detail now shows a disabled candidate-account requirement for recruiter/admin users |
| Malformed salary or quiz values could display `NaN` labels | Salary averages/cards and recruiter review score now guard non-numeric values |
| Admin moderation tables showed raw database column labels | Replaced table headers with user-friendly French labels |
| Suspended/expired job detail could still expose apply/save actions | Job detail now disables application for unavailable offers and only lets candidates unsave existing favorites |
| Notification bell was frontend-estimated only | Added backend notifications with unread count, dropdown, read/read-all, and automatic application/status/new-offer messages |
| Candidate recommendations did not explain why an offer matched | Added visible matching reasons on recommended, jobs, and job-detail cards |
| Candidate profile lacked availability and preferred contract | Added controlled profile choices and used preferred contract in matching |
| Accepted candidates had no direct follow-up space | Added a simple accepted-only discussion modal for candidate and recruiter |
| Login showed forgot-password text without a reset flow | Removed the visible placeholder from the auth UI for soutenance |
| Candidate `Mes candidatures` opened dashboard without focusing applications | It now links to `/candidat/dashboard#mes-candidatures` and scrolls/focuses the applications section |
| Partial language switcher exposed incomplete translations | Visible switcher is hidden and the demo stays in French while i18n files remain intact |
| Salary filter MAD badge could feel cramped | Added no-shrink badge spacing and tighter salary field layout |

---

## 23. Scope Limits for AI Agents

This is a student internship project. Keep changes realistic.

Allowed:
- Bug fixes.
- UI polish inside the current design system.
- Performance improvements.
- Missing features from the project scope.
- Documentation improvements.

Not allowed without confirmation:
- Microservices.
- New payment gateways.
- Expensive infrastructure.
- Major backend schema changes.
- Features that break the existing flows.
- Large architecture rewrites.

When unsure:
- Ask first.
- Work one feature at a time.
- Run lint/build/tests after changes.
