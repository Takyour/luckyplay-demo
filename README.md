# LuckyPlay Firebase Demo

A mobile-first, real-money-free gaming demo.

## Included
- Firebase Email/Password Authentication
- Firestore user profiles
- Virtual coin balance
- Animated demo games
- Leaderboard
- Profile screen
- Admin dashboard
- Mobile responsive UI

## Setup
1. Create a Firebase project.
2. Enable Authentication -> Sign-in method -> Email/Password.
3. Create a Firestore database.
4. Add a Web App in Firebase Project Settings.
5. Copy its config into `firebase-config.js`.
6. Publish the Firestore rules from `firestore.rules`.
7. Serve this folder from a web server (ES modules generally won't work from `file://`).

## Make yourself admin
After registering, open Firestore and change that user's document:
`users/<YOUR_UID>`
Set:
`role: "admin"`

Do not expose service-account credentials in the browser.

## Important
This project is intentionally limited to virtual/demo coins. It does not implement real-money deposits, withdrawals, betting, or cash-out.
For production, move reward/game logic to trusted server-side code and add strict Firestore validation/rate limits.
