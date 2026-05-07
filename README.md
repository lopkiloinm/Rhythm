

https://github.com/user-attachments/assets/5566f807-c7fd-4421-8d40-de0355beb48f



# Rhythm

**Agentic Verification and Incentive Infrastructure for Activities of Daily Living**

---

## The Problem

Executive dysfunction can turn ordinary daily routines into repeated points of failure. For people living with ADHD, autism spectrum disorder, depression, bipolar disorder, anxiety, traumatic brain injury, Alzheimer's disease, dementia, and chronic stress, tasks like brushing teeth, showering, taking medication, preparing food, doing laundry, cleaning, or caring for a pet are often not trivial habits but real barriers to health, dignity, and independence.

ADHD alone affects an estimated 6.0% of U.S. adults — about 15.5 million people — and executive function difficulties are documented across many other conditions as well.

Most existing tools are not designed for this problem. Reminder apps and habit trackers can encourage action, but they cannot verify whether the action actually occurred. Self-report is easy to fake, easy to forget, and too weak for sponsor funding or outcome-based incentives.

## What Rhythm Does

Rhythm is a consumer-facing mobile app that helps people start and finish everyday routines by reducing friction, lowering shame, structuring next steps, verifying completion through short capture sessions, and providing small cryptocurrency rewards — without making the experience feel childish, clinical, or transactional.

The system treats an activity of daily living as a job with evidence, evaluation, and payout conditions:

1. **Capture** — A user records a short clip while performing a task (brushing teeth, drinking water, feeding a pet, etc.) on Solana Seeker.
2. **Verify** — The clip is sent to a verification endpoint and evaluated by Amazon Bedrock (Nova 2 Lite) as a multimodal verifier.
3. **Reward** — If the task appears completed, a reward can be released through a sponsor-funded payout flow (not fully implemented yet).

All routine categories — hygiene, grooming, meal preparation, cleaning, laundry, hydration, pet care, and self-care — are treated as equally important first-class experiences.

## Technical Stack

- **App framework**: React Native (Expo) + TypeScript  
- **Verification**: Amazon Bedrock (Nova 2 Lite) via:
  - **Local dev server**: `backend/local_server.py` (runs on your machine, app calls `http://<host>:3001/verify`)
  - **AWS deploy path**: API Gateway → Lambda (see `backend/README.md`)
- **Wallet integration**: Solana Mobile Wallet Adapter packages are included (Seeker-focused UX)

## Sponsor Model

Rhythm's rewards are funded by two classes of sponsors:

- **Consumer brands** whose products already appear inside targeted routines (toothpaste, shampoo, detergent, pet food). They pay for verified product usage.
- **Institutional sponsors** — health plans, self-insured employers, pharmaceutical manufacturers, specialty pharmacies — who are financially exposed when routine adherence fails. They pay for risk reduction.

## Project Structure

```
Rhythm/
├── App.tsx                        # Entry point, font loading, navigation container
├── src/
│   ├── theme/                     # Design system tokens
│   │   ├── colors.ts              # Full Material 3-style color palette
│   │   ├── typography.ts          # Plus Jakarta Sans type scale
│   │   ├── spacing.ts             # 4px grid spacing tokens
│   │   └── index.ts               # Barrel + radii, shadows
│   ├── components/                # Reusable UI primitives
│   │   ├── Button.tsx             # Primary / Secondary / Ghost variants
│   │   ├── Card.tsx               # Surface card with optional accent stripe
│   │   ├── Chip.tsx               # Filter/category chip
│   │   ├── TopBar.tsx             # App header with avatar + title
│   │   ├── BackHeader.tsx         # Detail/flow screen back navigation
│   │   └── index.ts               # Barrel export
│   ├── screens/                   # All app screens
│   │   ├── WelcomeScreen.tsx      # Onboarding entry
│   │   ├── HomeScreen.tsx         # Dashboard with next-best-action
│   │   ├── RoutinesScreen.tsx     # Category browser + featured routines
│   │   ├── CaptureScreen.tsx      # Camera capture interface
│   │   ├── RewardsScreen.tsx      # Wallet balance + earnings history
│   │   ├── HistoryScreen.tsx      # Momentum chart + completion timeline
│   │   ├── RoutineDetailScreen.tsx # Task steps + verification info
│   │   ├── VerifiedScreen.tsx     # Success state + reward confirmation
│   │   ├── AlmostScreen.tsx       # Partial match / retry guidance
│   │   ├── SponsorsScreen.tsx     # Sponsor transparency + privacy info
│   │   └── index.ts               # Barrel export
│   └── navigation/                # React Navigation setup
│       ├── types.ts               # Stack + Tab param lists
│       ├── RootNavigator.tsx      # Root stack (Welcome → Main → flows)
│       ├── TabNavigator.tsx       # Bottom tab bar (5 tabs)
│       └── index.ts               # Barrel export
├── backend/
│   ├── local_server.py            # Local Bedrock verifier (POST /verify on :3001)
│   ├── lambda/verify.py           # Lambda handler for AWS deploy
│   └── README.md                  # AWS deployment notes
```

## Design Principles

- **Dignity over pity.** No patronizing language or infantilizing gamification.
- **Low energy design.** Optimized for cognitive overload, executive dysfunction, and chronic stress.
- **One-handed use.** Thumb-first mobile interactions, fast recovery after interruption.
- **Anti-hustle aesthetic.** Warm, tactile, calm, and quietly optimistic. No neon gradients, no crypto-bro energy, no hustle-productivity tropes.
- **Invisible tech.** Solana-powered rewards and AWS Nova AI verification happen behind the scenes. The user sees "credits" and "verified," not blockchain transactions and model confidence scores.
- **Equal categories.** Every routine domain — hygiene, pets, cleaning, eating, self-care — is visually and structurally equal. No single category dominates.

## Design System

The visual language is called **Tactile Minimalism** — warm oatmeal surfaces, sage green primary actions, soft terracotta accents, diffuse ambient shadows, and generous spacing. The sole typeface is **Plus Jakarta Sans** with an exaggerated weight hierarchy for effortless scanning.

Key tokens:
- Background: `#fcf9f3` (warm oatmeal)
- Primary: `#465547` (sage green)
- Secondary: `#94492d` (terracotta)
- Tertiary: `#674c1a` (sand/gold)
- Touch targets: 48px minimum
- Card radius: 16px
- Button height: 56px

## Getting Started

```bash
# Install dependencies
cd Rhythm
npm install

# Start the Expo development server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```

## Verification (Demo vs Real)

Rhythm supports a **Demo Mode** (no backend required) and a **real verification** flow (local server or AWS).

- **Demo Mode**: open the Settings screen and enable Demo Mode to bypass verification.
- **Local verification server**:

```bash
cd Rhythm
python3 backend/local_server.py
```

The app will typically auto-detect the host and call `http://<host>:3001/verify`. If you need to override it explicitly, set:

- `EXPO_PUBLIC_VERIFY_URL` to a full endpoint like `http://192.168.1.10:3001/verify`

Note: the local verifier uses `ffmpeg` for optional video compression; install it if you see compression-related errors.

For AWS deployment instructions, see `backend/README.md`.

## Status

The **mobile UI and verification flow are implemented**:

- App screens, navigation, capture flow, and routines UI are in place.
- Verification supports **Demo Mode** and a **Bedrock-backed verifier** via `backend/local_server.py` (and an AWS deploy path in `backend/README.md`).

The sponsor-funded reward rail / escrow-style payout is **not complete** and should be treated as an evolving design + partial plumbing rather than a production payment system.

## License

Proprietary. All rights reserved.
