# Meat Pick

Meat Pick is an early MVP for a shopping assistant that helps users compare beef candidates by photo, preference, and price.

The current prototype focuses on **beef for grilling**. Users can upload 2-5 candidate photos, add purchase information such as price and weight, and receive separate recommendations for taste and value.

## Current Features

- Upload 2-5 beef candidate images
- Choose a preference mode:
  - Balanced
  - Lean
  - Rich
  - Tender
  - Value
- Add purchase information per candidate:
  - Price
  - Weight
  - Grade
  - Origin
- Calculate price per 100g
- Compare candidates with a multimodal LLM
- Show separate recommendations:
  - Taste-first recommendation
  - Value recommendation
- Display per-candidate analysis:
  - Fat amount
  - Fat distribution
  - Color tone
  - Surface/photo signals
  - Overall grilling suitability
- Apply local usage limits to reduce accidental API spending
- Fall back to local heuristic analysis if live LLM analysis fails

## Project Structure

```text
docs/
  meat-selection-product-plan.md
  meat-selection-design.md
  mvp-development-spec.md

prototype/
  index.html
  styles.css
  app.js
  server.mjs
  run-dev.ps1
  .env.example

test_image/
  SOURCES.md
  sample images
```

## Running Locally

From the project root:

```powershell
node .\prototype\server.mjs
```

Then open:

```text
http://127.0.0.1:4173/
```

On Windows, you can also run:

```powershell
.\prototype\run-dev.ps1
```

## API Key Security

The API key must stay local. Do not commit it.

The server reads the key from either:

- an environment variable, or
- a local ignored file named `openai_api_key.txt`

The key file is listed in `.gitignore`, and the browser frontend never receives the key.

The app also ignores:

```text
openai_api_key.txt
prototype/server.log
prototype/usage-state.json
test_image/KakaoTalk_*.jpg
```

## Cost Controls

The prototype includes basic live-analysis limits:

- Maximum images per live analysis: 3 by default
- Maximum live analyses per day: 10 by default
- Images are resized before being sent to the server
- Failed calls fall back to local heuristic analysis

Adjustable settings are documented in:

```text
prototype/.env.example
```

## Notes

This prototype is not a food safety tool. It only provides photo-based shopping guidance. Users should still check expiration dates, packaging condition, smell, and store handling before purchase.

