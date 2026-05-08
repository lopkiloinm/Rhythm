

https://github.com/user-attachments/assets/5566f807-c7fd-4421-8d40-de0355beb48f



# 🌀 Rhythm

> **The routine is the reward. The reward is verified.**
> A dignified, AI-verified, crypto-incentivized companion for people whose brains make everyday tasks hard.

**Stack**: React Native (Expo 54) · TypeScript · Amazon Bedrock (Nova 2 Lite) · AWS Lambda · Solana Mobile Wallet Adapter · x402 · Solana Memo Program · Python

[Demo flow](#-how-to-try-it-in-90-seconds) · [Architecture](#-architecture) · [Why it matters](#-why-this-matters) · [What we built](#-what-we-built)

---

## 💡 The one-liner

Open Rhythm. Tap a routine. Record a short clip. **Amazon Nova 2 Lite watches the video, verifies that the routine actually happened, and a sponsor-funded micro-reward lands in your Solana wallet.** No self-report. No streak guilt. No BS.

## 🌱 Why this matters

Executive dysfunction is a first-class disability. ADHD alone affects ~6% of U.S. adults — roughly **15.5 million people** — and similar deficits appear with autism, depression, TBI, Alzheimer's, chronic stress, and long COVID. For tens of millions of people, *brushing teeth* or *taking medication* isn't a "habit to build." It's a daily point of failure.

Habit trackers assume you'll remember to tap the button *and* tell the truth. Neither assumption is safe for this population. Sponsors, insurers, and pharma companies *want* to pay for completed routines — they can't, because self-report is worthless as an incentive signal.

**Rhythm closes the loop.** Multimodal AI replaces the honor system. The verification signal becomes strong enough to fund.

## 🧠 What we built

A fully functional prototype of the entire loop:

| Layer | What's shipping |
|---|---|
| **Mobile app** | 14 screens, 20 routines across 7 categories, custom swipe tabs, native-driven animations, full accessibility labels, 30s capture with live elapsed/30s counter. |
| **Verification** | Live Python server + AWS Lambda (templated), both calling Amazon Bedrock **Nova 2 Lite** via the Converse API with multimodal video + structured JSON output. |
| **Short-reason feedback** | If verification fails, Nova returns a concrete 3–8 word phrase ("could not detect cup", "pill not swallowed on camera") surfaced in the UI. |
| **Smart video pipeline** | Server re-encodes every upload to **15 fps @ 480 px** with `libx264 ultrafast` — drops a 5 MB phone clip to ~170 KB in ~55 ms, cutting Bedrock latency 50–70%. |
| **On-chain receipts** | Verified completions are recorded on Solana via the Memo Program (devnet or mainnet-beta, cluster-switchable via env). |
| **Sponsor-funded rewards** | x402 payment ID minted server-side on success — ready for a paid `POST /verify` gateway (on the `x402` branch). |
| **Wallet** | Solana Mobile Wallet Adapter on Seeker; graceful no-op fallback on Expo Go so the app always runs. |
| **Identity** | `.skr` domain resolution via Solana Name Service. |
| **Tests** | 145 Jest tests across 19 suites (components, screens, services, utils, state), zero TypeScript errors. |

## 🎬 How to try it in 90 seconds

### 1. Clone & install

```bash
git clone https://github.com/your-org/Rhythm.git
cd Rhythm
npm install
```

### 2. Configure environment

Create `.env` from the template:

```bash
cp .env.example .env
```

Fill in your LAN IP:

```env
EXPO_PUBLIC_VERIFY_URL=http://<YOUR_LAN_IP>:3001/verify
EXPO_PUBLIC_SOLANA_CLUSTER=devnet
```

### 3. Start the verifier (Nova 2 Lite)

Create `backend/.env` with an AWS key scoped to `bedrock:Converse` on Nova 2 Lite:

```env
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-east-1
```

Run the verifier:

```bash
python3 backend/local_server.py
```

You should see:

```
Rhythm Verification Server
  Model:    us.amazon.nova-2-lite-v1:0
  Region:   us-east-1
  Port:     3001
  Encode:   15fps @ 480px long-edge, preset=ultrafast, crf=30, max 30s
  Nova 2 Lite: connected
  Listening on http://0.0.0.0:3001/verify
```

Tail request logs in any other terminal:

```bash
tail -f backend/server.log
```

### 4. Start Expo

```bash
npx expo start
```

Scan the QR code with **Expo Go** (or run `npx expo run:android` / `run:ios` for native builds). Same WiFi as your Mac.

### 5. Complete a routine

On the phone: **Home → Next Up → Start Recording → Submit for Verification**. Watch the terminal log light up in real time with:

- Video encode stats (input/output size, fps, compression ratio, encode time)
- Full raw Nova response (stop reason, token counts, latency)
- Pretty-printed judgment JSON
- Policy breakdown with every check
- Per-stage timing (encode vs. Bedrock vs. read vs. other)
- Final colored decision with short-reason

### 🏃 Want to skip AWS?

Settings → Development → **Demo Mode**. The verifier is bypassed and every routine verifies successfully. Useful for UI review without credentials.

## 🏗️ Architecture

```
┌──────────────────┐
│  React Native    │  1. Record ≤30s clip at native quality
│  (Expo Go +      │  2. Capture GPS in parallel (non-blocking)
│   Seeker MWA)    │  3. Base64 encode via expo-file-system/legacy
└────────┬─────────┘
         │ POST /verify  { routine_id, sponsor, wallet, location, video_b64 }
         ▼
┌──────────────────────────┐
│  Local server OR         │  ffmpeg -vf 'scale=...,fps=15'
│  API Gateway + Lambda    │  libx264 -preset ultrafast -crf 30
│  (Python 3.12 arm64)     │  → ~170 KB out from 5 MB in, ~55ms
└────────┬─────────────────┘
         │ Converse(modelId='us.amazon.nova-2-lite-v1:0')
         ▼
┌──────────────────────────┐
│  Amazon Bedrock          │  Multimodal: video + prompt
│  Nova 2 Lite             │  Temperature 0, structured JSON out:
│                          │    verified, confidence, product_visible,
│                          │    product_in_use, routine_completed,
│                          │    appears_genuine, reason, short_reason
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Policy agent            │  confidence ≥ 0.70
│                          │  sponsor product visible + in use
│                          │  routine completed + appears genuine
│                          │  medication routines require location
└────────┬─────────────────┘
         │ pass → x402 payment id
         ▼
┌──────────────────────────┐
│  Solana Memo Program     │  Phone signs + sends memo tx
│  (devnet / mainnet)      │  routine, sponsor, credits, ts, loc
└──────────────────────────┘
```

## 📊 Cost & performance

| Metric | Value |
|---|---|
| Nova 2 Lite per verification | **~$0.003** (dominant cost) |
| Lambda (30s, 512MB, arm64) | ~$0.000003 |
| S3 PUT + GET | ~$0.000005 |
| API Gateway | ~$0.000001 |
| **Total per verification** | **~$0.003** |
| Video encode (5 MB → 170 KB) | ~55 ms |
| Bedrock inference latency | 1.3–4 s (depends on motion) |
| End-to-end `/verify` round trip | **~3–5 s** on a typical clip |
| Sponsor economics | ~$2.50 reward ÷ $0.003 cost ≈ **0.12% verification overhead** |

## 🎨 Design philosophy

We call it **Tactile Minimalism** — warm oatmeal surfaces, sage green primary, soft terracotta accents, diffuse ambient shadows. The opposite of crypto-bro neon.

- **Dignity over pity.** No patronizing, no infantilizing gamification.
- **Low energy design.** Optimized for cognitive overload.
- **One-handed use.** Thumb-first, fast recovery after interruption.
- **Anti-hustle aesthetic.** Warm, calm, quietly optimistic.
- **Invisible tech.** Users see "credits" and "verified," not tokens and model scores.
- **Equal categories.** Hygiene, medication, pets, cleaning, eating, self-care, testing — every domain treated as first-class.
- **Transparent failure.** When verification fails, show a concrete human reason ("no drinking action visible"), never a generic error.

Full palette, type scale, and spacing tokens in [`src/theme/`](src/theme/). Plus Jakarta Sans throughout.

## 💰 The sponsor model

Rhythm's rewards are funded by two sponsor classes:

1. **Consumer brands** whose products already appear in targeted routines — Colgate, Dove, Liquid Death, Tide, Purina, HelloFresh, Pfizer, Merck. They pay for **verified product usage** — the strongest possible attribution signal in consumer marketing.
2. **Institutional sponsors** — health plans, self-insured employers, pharmaceutical manufacturers, specialty pharmacies — who are financially exposed when adherence drops. They pay for **risk reduction**.

Multimodal verification is what makes this economically new: the verification signal is strong enough to underwrite real payouts.

## 🧪 Verification feedback

A unique feature we shipped: every failed verification returns a **concrete short_reason** you can act on.

Real examples pulled from live Nova responses:

| Input | `short_reason` |
|---|---|
| Black-frame video | `video is completely black` |
| TV static | `video is static noise` |
| SMPTE color bars | `video is test pattern` |
| Spinning Earth (no person) | `no person or product visible` |
| Medication routine with no GPS | `location required for medication` |
| User holds juice, not water | `no drinking action visible` |
| User holds cup but doesn't sip | `could not detect drinking motion` |

The phrase is surfaced on the failure screen as a pill under the heading, so the user knows exactly what to change before retrying.

## 📁 Project structure

```
Rhythm/
├── App.tsx                          # Fonts, providers, navigation container
├── src/
│   ├── components/                  # 8 reusable primitives (Button, Card, Chip, VideoThumb, ...)
│   ├── screens/                     # 14 screens (Welcome, Home, Routines, Capture, Verifying, ...)
│   ├── navigation/                  # Root stack + custom swipe TabNavigator
│   ├── state/                       # AppState context + AsyncStorage-backed Settings
│   ├── services/                    # verification, wallet, skrIdentity
│   ├── config/                      # Solana cluster config
│   ├── theme/                       # Colors, typography, spacing, radii, shadows
│   ├── data/                        # 20 routines, 7 categories
│   └── utils/                       # time, export (CSV), streaks, link
├── backend/
│   ├── lambda/verify.py             # AWS Lambda entrypoint
│   ├── local_server.py              # Dev verifier that calls Bedrock directly
│   └── deploy.sh                    # One-command AWS deploy
└── AGENTS.md                        # Comprehensive codebase reference
```

See [`AGENTS.md`](AGENTS.md) for the full reference — data models, state shape, screen-by-screen behaviors, theming, and testing guidance.

## 🚀 AWS deploy (optional)

```bash
cd backend
./deploy.sh YOUR_AWS_ACCOUNT_ID
```

This creates the S3 bucket, IAM role, Lambda function, and API Gateway in one shot and prints the invoke URL. Then set:

```env
EXPO_PUBLIC_VERIFY_URL=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/verify
```

Details in [`backend/README.md`](backend/README.md).

## 🪙 x402-gated verification (paid `POST /verify`)

The paid gateway lives on the **`x402` branch**. It demonstrates how a sponsor wallet can settle the ~$0.003 verification cost per call via HTTP 402 micropayments, so sponsors pay only for actual verified routines — not for fraud attempts or misfires. Switch branches to see it.

## ✅ Tests

```bash
npm test            # 145 tests across 19 suites
npm run test:watch
npm run test:coverage
```

## 🧭 Status

The mobile UI and verification loop are **fully implemented and demo-ready**:

- All screens, navigation, capture flow, real-time verification, short-reason feedback, and on-chain memo recording work end-to-end.
- The sponsor-funded payout rail is **partially plumbed** — x402 payment IDs are minted and returned; the full escrow/payout flow is prototype, not production.
- This is a hackathon-stage concept, not a shipped product. Don't put it in front of patients.

## 📄 License

Proprietary. All rights reserved.

---

*Built for people whose brains need a little extra scaffolding. You are not lazy. Your brain is working overtime. The routine is the reward. The reward is verified.*
