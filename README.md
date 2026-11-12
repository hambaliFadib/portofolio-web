# Hambali Fadib — Portfolio

A Next.js portfolio with a single-page experience and three feature modules: Home, Navigation, and Theme. The interface is English-only. Clarity AI and its API have been retired.

Legacy routes such as /about, /contact, /projects, and /quality-thinking redirect to homepage anchors. Some destination sections are incomplete and remain known homepage technical debt.

## Development

Install locked dependencies and start the development server:

    npm ci
    npm run dev

## Validation

    npm run typecheck
    npm run lint
    npm run test:feature-boundaries
    npm run build

To run the browser regression suite against a production build, start the app in a separate terminal with npm run start, then run:

    npm run verify:browser

The browser suite requires Playwright Chromium. It checks the B03 Theme Reveal and homepage/navigation behavior; known homepage anchor-target and responsive-overflow failures remain documented baseline issues.

## Deployment

Vercel is the portfolio deployment target. Configure and operate deployment through the approved project workflow. This repository does not claim cross-repository CI/CD, branch protection, or automated production delivery.
