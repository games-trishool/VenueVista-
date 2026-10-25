# VENUEVISTA — MASTER AI SOFTWARE DEVELOPMENT PROMPT

## YOUR ROLE

You are an elite software engineering team consisting of:

- Principal Software Architect
- Senior React Native Developer
- Senior Backend Engineer
- PostgreSQL Database Architect
- Senior UI/UX Designer
- DevOps and Cloud Infrastructure Engineer
- Application Security Engineer
- Quality Assurance and Automation Engineer
- Product Manager specializing in Indian consumer marketplaces

Your responsibility is to design and build **VenueVista**, a premium, production-oriented event venue discovery and booking-enquiry platform for India.

You are not merely advising me. You are responsible for implementing the actual project, creating the source code, connecting the applications, testing the functionality, fixing defects, and preparing the system for deployment.

Use your strongest reasoning, architecture, design, and coding capabilities.

Do not create a static UI prototype and call it a finished application.

Do not replace backend functionality with hardcoded sample data.

Do not leave nonfunctional buttons, fake APIs, or unfinished navigation in features you claim are complete.

Build a real, maintainable software product.

---

# 1. PRODUCT VISION

**Application Name:** VenueVista (working name)

**Tagline:** Discover the perfect place for every celebration.

**Initial Market:** Andhra Pradesh and Telangana, India.

**Future Expansion:** Pan India.

VenueVista connects people searching for event venues with venue owners who want to advertise and manage their properties.

Customers should be able to discover, explore, compare, shortlist, and enquire about:

- Function halls
- Convention halls
- Wedding gardens
- Banquet halls
- Resorts
- Farmhouses
- Outdoor event venues
- Party halls
- Corporate event spaces

The application should support events including weddings, receptions, engagements, birthdays, anniversaries, corporate meetings, conferences, and family celebrations.

The core objective is to make finding a suitable venue as convenient and visually appealing as browsing a premium consumer application.

The app must have the visual polish and smooth browsing experience of apps like District, while maintaining its own original branding, layout details, illustrations, icons, and design identity.

---

# 2. THREE SEPARATE APPLICATIONS

Build three connected applications.

## Application A — VenueVista Customer

Platform:

- React Native
- Expo
- TypeScript
- Android first
- iOS-compatible architecture

Android package ID:
`com.venuevista.customer`

Purpose:

Customers discover venues based on their selected location, compare facilities and prices, save favourites, and contact venue owners.

## Application B — VenueVista Partner

Platform:

- React Native
- Expo
- TypeScript
- Android first
- iOS-compatible architecture

Android package ID:
`com.venuevista.partner`

Purpose:

Venue owners register their businesses, submit properties, manage photos, pricing, availability, enquiries, and venue information.

The partner app must be a separate application with its own UI and navigation.

## Application C — VenueVista Admin

Platform:

- Next.js
- TypeScript
- Tailwind CSS
- Professional component library

Purpose:

Super administrators verify venue owners, approve or reject venue listings, manage users, moderate content, and oversee the platform.

The admin dashboard is a secure web application, not a mobile application.

All three applications must connect to one centralized backend.

---

# 3. REQUIRED TECHNOLOGY STACK

Use:

### Mobile Applications

- React Native
- Expo
- TypeScript
- Expo Router
- React Native Reanimated
- TanStack Query
- Zustand
- React Hook Form
- Zod
- SecureStore

### Admin Dashboard

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui or an appropriate accessible component library

### Backend

- NestJS
- Node.js LTS
- TypeScript
- REST APIs
- OpenAPI / Swagger
- DTO validation
- Centralized exception handling
- Structured logging

### Database

- PostgreSQL
- PostGIS
- Prisma ORM
- SQL migrations where required for geospatial functionality

### External Services

- Firebase Authentication for phone OTP, or a secure India-compatible equivalent
- Firebase Cloud Messaging
- Google Maps Platform
- S3-compatible image storage
- Redis when caching or background processing is needed
- Sentry or equivalent error monitoring

### Development Infrastructure

- pnpm workspaces
- Turborepo
- Docker Compose
- Git
- ESLint
- Prettier
- Automated tests
- CI/CD pipeline

Use a modular monolith backend initially.

Avoid unnecessary microservices.

Keep all secrets and privileged credentials outside client applications.

---

# 4. CUSTOMER APP — PREMIUM UI/UX

The customer app is the main consumer-facing product.

It must look like a polished commercial mobile application, not an ordinary template.

## Visual Design

Use a distinctive premium dark theme.

Suggested palette:

- Primary background: #111015
- Secondary surface: #1C1923
- Primary accent: #7655E8
- Secondary accent: #D8B979
- Primary text: #FFFFFF
- Secondary text: #A7A3AF

Use:

- Elegant typography
- Large, high-quality venue photography
- Rounded cards
- Subtle gradients
- Floating bottom navigation
- Smooth animations
- Interactive filters
- Responsive layouts
- Skeleton loaders
- Attractive empty states
- Consistent iconography

Avoid excessive animation and visual clutter.

Ensure excellent performance on mid-range Android phones.

## Home Screen Header

Top-left:

Show a location pin icon, selected location, state or city subtitle, and dropdown arrow.

Example:

📍 Visakhapatnam
Andhra Pradesh

Top-right:

Show a circular user profile avatar.

The location selector must support:

1. Current GPS location with permission.
2. Manual location selection.
3. City search.
4. Locality search.
5. PIN code search.
6. Recent locations.
7. Popular cities.

Initially prioritize cities including:

Andhra Pradesh:

- Visakhapatnam
- Vijayawada
- Guntur
- Tirupati
- Nellore
- Kakinada
- Rajahmundry
- Kurnool
- Anantapur

Telangana:

- Hyderabad
- Warangal
- Karimnagar
- Khammam
- Nizamabad
- Nalgonda
- Siddipet

The city list must be configurable and expandable.

When the user changes location, all relevant venue results must refresh using backend geospatial queries.

Never display venues from the previously selected city as though they belong to the new location.

Allow users to browse without granting GPS permission.

---

# 5. CUSTOMER HOME SCREEN

Display visually beautiful categories:

- Function Halls
- Convention Halls
- Wedding Gardens
- Resorts
- Banquet Halls
- Farmhouses
- Outdoor Venues
- Party Halls

Use attractive category illustrations and horizontal scrolling.

Below categories, display dynamic sections:

1. Featured Venues
2. Popular Near You
3. Budget-Friendly Venues
4. Premium Wedding Venues
5. Large Convention Halls
6. Outdoor Wedding Gardens
7. Recently Added Venues
8. Recommended Venues

Only show sections containing real available data.

Venue cards must include:

- Venue cover image
- Venue name
- Location
- Venue type
- Seating capacity
- Dining capacity
- Starting rental price
- AC / Non-AC
- Verified badge when applicable
- Rating when available
- Wishlist button

Tapping a venue card must open the venue details screen.

---

# 6. BOTTOM NAVIGATION

The customer app must have exactly three primary bottom navigation options:

### Home

Location-based venue discovery.

### Wishlist

Saved venues.

### Search

Venue search and filtering.

Use a floating, rounded, premium navigation bar.

The navigation must be smooth and consistent.

The profile screen is accessed from the top-right avatar rather than a fourth bottom tab.

---

# 7. ADVANCED VENUE SEARCH

Implement a functional search system.

Search by:

- Venue name
- City
- Locality
- Venue category
- Event type

Filtering:

### Budget

- Minimum price
- Maximum price
- Rental pricing
- Package pricing

### Capacity

- Seating capacity
- Dining capacity
- Standing capacity

### Facilities

- AC
- Non-AC
- Parking
- Car parking capacity
- Bike parking
- Power backup
- Lift
- Wheelchair accessibility
- Bridal room
- Guest rooms
- Stage
- Kitchen
- Catering
- Decoration
- Wi-Fi
- Lawn
- Swimming pool

### Event Date

Allow customers to search by their preferred event date.

### Sorting

- Relevance
- Nearest
- Price low to high
- Price high to low
- Capacity
- Rating, when available

Use backend pagination and indexed database queries.

Include both list and map results.

---

# 8. VENUE DETAILS SCREEN

Create a premium, immersive venue details page.

Include:

## Media

- Cover image
- Swipeable image gallery
- Full-screen viewer
- Optional video walkthrough

## Information

- Venue name
- Description
- Full address
- Map location
- Venue category
- Supported events
- Seating capacity
- Dining capacity
- Standing capacity
- Number of halls
- Number of guest rooms
- Parking capacity

## Facilities

Show amenities with clean icons and labels.

## Pricing

Support:

- Full-day rental
- Half-day rental
- Package pricing
- Catering per plate
- Decoration charges
- Security deposit
- Additional charges

Store monetary values in INR with appropriate units.

Do not imply that a starting price is the final booking price.

## Availability

Display an availability calendar where data is available.

Clearly distinguish:

- Available
- Unavailable
- Tentatively blocked
- Not confirmed

## Customer Actions

- Add to Wishlist
- Request Quote
- Check Availability
- Schedule Site Visit
- Call Venue
- WhatsApp Venue
- Get Directions
- Share Venue
- Compare Venue

Every action must work.

---

# 9. CUSTOMER ENQUIRY SYSTEM

Build a complete enquiry-first workflow.

Customer selects:

- Venue
- Event date
- Event type
- Expected guest count
- Approximate budget
- Special requirements

Customer submits enquiry.

The backend creates an enquiry record.

The venue owner receives a notification.

The owner can:

- View enquiry
- Respond
- Send a quotation
- Confirm or decline availability
- Propose a site visit

Enquiry statuses:

- NEW
- VIEWED
- RESPONDED
- QUOTE_SENT
- SITE_VISIT_SCHEDULED
- NEGOTIATING
- CONFIRMED
- CANCELLED
- CLOSED

Customers must be able to track their enquiries.

Do not mark an enquiry as a confirmed booking without an explicit confirmation process.

For the MVP, online payment processing is not required.

---

# 10. VENUEVISTA PARTNER APP

Build a separate professional application for venue owners.

## Owner Authentication

Use secure phone-based OTP authentication.

Owners can create an account and submit business details.

Support one owner managing multiple venues.

## Partner Dashboard

Display:

- Total venues
- Active listings
- Pending approvals
- New enquiries
- Scheduled site visits
- Pending quotes
- Confirmed bookings
- Venue views

Use real backend data.

## Add Venue Wizard

Create a guided multi-step form.

### Step 1 — Basic Details

- Venue name
- Venue category
- Description
- Supported event types

### Step 2 — Location

- State
- District
- City
- Locality
- PIN code
- Full address
- Map coordinates

### Step 3 — Capacity

- Seating capacity
- Dining capacity
- Standing capacity
- Number of halls
- Parking capacity
- Guest rooms

### Step 4 — Amenities

- AC / Non-AC
- Catering
- Decoration
- Parking
- Generator
- Lift
- Kitchen
- Stage
- Sound system
- Guest accommodation
- Accessibility

### Step 5 — Pricing

- Rental price
- Package prices
- Catering prices
- Decoration charges
- Deposits
- Additional charges

### Step 6 — Media

- Cover photo
- Gallery photos
- Optional video

### Step 7 — Policies

- Booking rules
- Cancellation rules
- Venue restrictions

### Step 8 — Submit for Approval

Allow saving drafts.

All venue listings require super admin approval before publication.

## Multiple Spaces

A single venue may have multiple independently bookable spaces.

Example:

Royal Convention Centre:

- Main Hall — 1,500 seats
- Mini Hall — 300 seats
- Wedding Lawn — 2,000 guests

Each space can have its own:

- Capacity
- Price
- Amenities
- Availability

## Availability Management

Owners can:

- Mark dates available
- Block dates
- Set tentative reservations
- Manage confirmed bookings

Prevent overlapping confirmed bookings for the same space.

## Enquiry Management

Owners can:

- View customer enquiries
- Respond with quotes
- Update statuses
- Schedule site visits
- Contact customers through authorized channels

---

# 11. SUPER ADMIN WEB DASHBOARD

Build a secure web-based dashboard.

Features:

### Overview

- Total customers
- Total owners
- Total venues
- Pending approvals
- Active listings
- Enquiries
- Confirmed bookings

### Owner Verification

- View owner applications
- Review submitted details
- Approve or reject accounts
- Suspend accounts

### Venue Approvals

- Review venue details
- Inspect photos
- Check location information
- Approve listing
- Reject listing with reason
- Request changes

### Venue Management

- Search listings
- Edit permitted platform metadata
- Suspend listings
- Feature venues
- Review reports

### Customer Management

- View customer accounts
- Handle support issues
- Manage reported misuse

### Platform Settings

- Venue categories
- Supported locations
- Featured listings
- Notification templates
- Operational settings

### Security

- Administrator MFA
- Role-based permissions
- Audit logs
- Session management
- Secure admin APIs

No publicly accessible admin functions.

---

# 12. DATABASE ARCHITECTURE

Design PostgreSQL schemas for:

- users
- user_profiles
- owner_organizations
- owner_members
- venues
- venue_spaces
- venue_locations
- venue_amenities
- venue_media
- venue_pricing
- venue_packages
- venue_policies
- venue_availability
- venue_blocks
- enquiries
- enquiry_messages
- quotes
- site_visits
- bookings
- wishlists
- reviews
- notifications
- verification_requests
- audit_logs
- platform_settings

Requirements:

- UUID primary keys
- Proper foreign keys
- Database indexes
- Geospatial indexes
- Referential integrity
- Appropriate unique constraints
- Created and updated timestamps
- Soft deletion where needed
- Secure migrations
- Booking conflict protection
- Pagination support

Use PostGIS for location-based queries.

Store event times consistently and convert to the appropriate local timezone for display.

---

# 13. API ARCHITECTURE

Create a versioned REST API:

`/api/v1`

Implement modules for:

- Authentication
- Users
- Owner Organizations
- Venues
- Venue Spaces
- Locations
- Search
- Pricing
- Availability
- Wishlists
- Enquiries
- Quotes
- Site Visits
- Bookings
- Notifications
- Media
- Administration

Use:

- DTO validation
- Authentication guards
- Role guards
- Ownership checks
- Rate limiting
- Consistent error responses
- OpenAPI documentation
- Request logging

Never trust role or owner IDs supplied by a client without server-side verification.

---

# 14. SECURITY REQUIREMENTS

Implement production-grade security practices.

Requirements:

- HTTPS
- Secure authentication
- Backend token verification
- Role-based authorization
- Object-level access controls
- Input validation
- Rate limiting
- Secure image uploads
- Protected customer contact information
- No secrets in mobile bundles
- Secure environment variables
- Admin MFA
- Audit logs
- Account deletion
- Data retention rules
- Backup and recovery procedures

Prepare privacy disclosures and permissions for Google Play requirements and applicable Indian privacy obligations.

Do not claim compliance without verification.

---

# 15. REPOSITORY STRUCTURE

Use this monorepo structure:

venuevista/

- apps/
  - customer-mobile/
  - partner-mobile/
  - admin-web/
  - api/
- packages/
  - shared-types/
  - api-client/
  - validation/
  - design-tokens/
  - config/
- infrastructure/
  - docker/
  - deployment/
  - monitoring/
- docs/
  - architecture/
  - api/
  - deployment/
- .env.example
- pnpm-workspace.yaml
- turbo.json
- package.json

Use clean architecture and modular feature boundaries.

Avoid circular dependencies.

---

# 16. REAL DATA REQUIREMENTS

Do not hardcode real-looking venues as though they exist.

For development, create clearly labelled seed data.

For production:

- Venue owners create listings.
- Admins approve listings.
- Only approved and active venues appear publicly.
- All venue data comes from the backend.

Do not fabricate reviews, prices, ratings, or availability.

---

# 17. TESTING REQUIREMENTS

Create tests for:

- Authentication
- Authorization
- Owner permissions
- Venue creation
- Venue editing
- Venue approval
- Location filtering
- Search
- Wishlist
- Enquiry submission
- Quote responses
- Booking conflicts
- Media upload validation

Also test:

- Slow internet
- No internet
- Empty search results
- Denied location permission
- Invalid inputs
- Expired sessions
- API failures
- Duplicate submissions
- Android back navigation
- Screen rotation where supported

Do not claim a test passed unless it was actually executed.

---

# 18. GOOGLE PLAY READINESS

Prepare both Android applications for Play Store release.

Include:

- Correct application IDs
- Adaptive app icons
- Splash screens
- Release signing guidance
- Android App Bundle generation
- Privacy policy requirements
- Account deletion flow
- Data safety review
- Permission minimization
- Crash reporting
- Production API configuration
- Versioning
- Internal testing instructions

Do not include unnecessary permissions.

---

# 19. DEVELOPMENT EXECUTION PLAN

You must work through the following phases.

## PHASE 1 — FOUNDATION

1. Inspect any existing project archive I provide.
2. Identify reusable code.
3. Create or repair the monorepo.
4. Configure TypeScript.
5. Set up the two Expo apps.
6. Set up the Next.js admin app.
7. Set up the NestJS backend.
8. Configure PostgreSQL and PostGIS.
9. Create Prisma schema and migrations.
10. Create environment templates.
11. Implement health checks.
12. Verify builds and startup.

## PHASE 2 — AUTHENTICATION

1. Implement customer authentication.
2. Implement owner authentication.
3. Implement admin authentication with MFA.
4. Verify authentication tokens in the backend.
5. Implement role and ownership permissions.
6. Test unauthorized access prevention.

## PHASE 3 — VENUE MANAGEMENT

1. Build owner registration.
2. Build venue creation wizard.
3. Implement image uploads.
4. Implement multiple venue spaces.
5. Implement amenities and pricing.
6. Implement draft and approval statuses.
7. Connect owner app to backend.

## PHASE 4 — ADMIN APPROVAL

1. Build pending approvals dashboard.
2. Build venue review page.
3. Implement approve/reject actions.
4. Require rejection reasons.
5. Record audit logs.
6. Publish approved venues to customer search.

## PHASE 5 — CUSTOMER DISCOVERY

1. Build premium home screen.
2. Implement location selection.
3. Implement city-based search.
4. Implement geospatial queries.
5. Implement category browsing.
6. Implement venue details.
7. Implement filtering and sorting.
8. Implement wishlist.

## PHASE 6 — ENQUIRIES

1. Implement enquiry submission.
2. Notify venue owner.
3. Implement owner response.
4. Implement quote creation.
5. Implement site visit scheduling.
6. Implement customer enquiry tracking.

## PHASE 7 — QUALITY AND DEPLOYMENT

1. Run automated tests.
2. Fix identified issues.
3. Verify API integrations.
4. Review security.
5. Optimize Android performance.
6. Configure staging and production.
7. Prepare release builds.
8. Document deployment and maintenance.

---

# 20. UI QUALITY STANDARD

The final customer application must be visually impressive.

I expect:

- Premium visual hierarchy
- Carefully selected typography
- Beautiful venue cards
- Consistent spacing
- Smooth transitions
- Excellent image presentation
- Professional icons
- High-quality loading states
- Useful empty states
- Modern location selector
- Elegant filters
- Responsive screens

Do not use generic default UI components without styling.

Do not directly copy District's copyrighted assets, logos, or exact screen designs.

Create an original premium brand experience.

The partner app should prioritize operational efficiency.

The admin dashboard should prioritize clarity, security, and information density.

---

# 21. DEVELOPMENT RULES

These rules are mandatory.

1. Write actual working code, not pseudocode.
2. Do not claim functionality exists when it is not implemented.
3. Do not silently skip requested features.
4. Do not use fake API responses for completed functionality.
5. Do not hardcode production credentials.
6. Do not expose administrator capabilities to customers or owners.
7. Do not make breaking architectural changes without explaining them.
8. Use reusable, maintainable components.
9. Handle loading, empty, and error states.
10. Run tests when the environment supports them.
11. Explain any test or build that could not be run.
12. Maintain an implementation checklist.
13. Document environment setup and deployment.
14. Preserve completed work across development phases.
15. Prioritize working end-to-end workflows over superficial feature quantity.

When implementing a feature, complete its UI, backend, validation, permissions, database integration, and tests before declaring it finished.

---

# 22. EXPECTED DELIVERABLES

Deliver:

1. Complete monorepo source code.
2. Customer React Native application.
3. Partner React Native application.
4. Next.js super admin dashboard.
5. NestJS backend.
6. PostgreSQL schema and migrations.
7. API documentation.
8. Docker development setup.
9. Environment variable examples.
10. Automated tests.
11. Local development instructions.
12. Deployment instructions.
13. Android build instructions.
14. Security checklist.
15. Remaining work and known issues.

If file creation is available, generate actual project files and a downloadable archive.

If you can execute terminal commands, use them to install dependencies, run migrations, test the project, and resolve failures.

If an external integration requires credentials, implement the integration boundary and document the required configuration. Do not invent credentials.

---

# 23. FIRST COMPLETE BUSINESS WORKFLOW

Prioritize this workflow before advanced features:

1. A venue owner installs VenueVista Partner.
2. The owner signs up.
3. The owner creates a business profile.
4. The owner adds a function hall.
5. The owner enters its location, seating capacity, dining capacity, amenities and pricing.
6. The owner uploads photographs.
7. The owner submits the venue for approval.
8. The super admin reviews the listing.
9. The super admin approves it.
10. A customer opens VenueVista.
11. The customer selects Visakhapatnam or another supported city.
12. The approved venue appears in search results for the correct location.
13. The customer opens its details.
14. The customer submits an enquiry.
15. The owner receives the enquiry.
16. The owner responds with a quotation.
17. The customer sees the updated enquiry status.

All steps must use real database records and backend APIs.

This workflow is the primary acceptance test for the MVP.

---

# 24. HOW YOU MUST START

First, inspect the supplied project if an archive or repository is available.

Do not blindly overwrite existing working code.

Then provide a concise technical assessment covering:

- Existing project status
- Proposed architecture
- Required dependencies
- Database schema
- API module structure
- Repository structure
- Development milestones
- Identified risks

After this assessment, immediately begin implementing Phase 1.

Do not stop after presenting the plan.

Create the actual source files.

Run available verification commands.

Fix errors you encounter.

Continue systematically through the phases as the execution environment permits.

If you cannot complete all phases in one session, leave the repository in a consistent working state and provide exact continuation instructions.

The objective is not simply to produce a beautiful application design.

**The objective is to build a real, secure, functional, scalable VenueVista marketplace consisting of two Android applications, one super admin web dashboard, one backend, and one shared database, initially serving Andhra Pradesh and Telangana.**

Begin implementation now.
