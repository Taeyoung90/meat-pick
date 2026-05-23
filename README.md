# Fresh Pick

[English](README.md) | [한국어](README.ko.md)

Fresh Pick is an early web MVP for a supermarket shopping assistant. It helps users compare fresh-food candidates from photos and choose the item that looks most suitable for purchase.

The prototype started with beef selection and now supports category-based comparison for:

- Beef for grilling
- Leafy greens
- Tomatoes

Users upload 2-5 candidate photos, confirm the product area to analyze, optionally read a price label with OCR, and receive photo-based recommendations for the best-looking candidate and value candidate.

## Current Features

- Category selection:
  - Beef for grilling
  - Leafy greens
  - Tomatoes
- Upload 2-5 candidate images
- Auto-detect a product area, then let the user adjust it
- Mark a candidate as having no visible price label
- Crop and read price labels with multimodal OCR
- Add purchase information per candidate:
  - Price
  - Weight
  - Grade or product note
  - Origin
  - Item/cut
  - Discount
  - Packaged or expiry date
- Calculate price per 100g
- Compare candidates with a multimodal LLM
- Fall back to local category-aware heuristic analysis if live LLM analysis fails
- Show a polished result experience:
  - BEST PICK card
  - Taste/freshness-first recommendation
  - Value recommendation
  - Candidate difference summary
  - Photo-quality warnings
  - Image analysis tags
- Save recent analysis history in the browser with small thumbnails only
- Restore a saved history result without storing original full-size images
- Apply local usage limits to reduce accidental API spending

## Project Structure

```text
docs/
  fresh-pick-product-spec.md
  meat-selection-product-plan.md
  meat-selection-design.md
  mvp-development-spec.md

prototype/
  index.html
  styles.css
  app.js
  server.mjs
  smoke-test.mjs
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

## Smoke Test

Run the lightweight static smoke test:

```powershell
node .\prototype\smoke-test.mjs
```

It checks that the category modes, key frontend functions, backend prompt helpers, and usage-limit guard functions are present.

## Product Spec

The current product direction is documented in:

```text
docs/fresh-pick-product-spec.md
```

The older beef-selection docs are kept as early planning and decision history.

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
- Maximum label OCR calls per day: 15 by default
- Images are resized before being sent to the server
- Analysis and OCR usage reservations are serialized in-process to reduce accidental limit bypass from concurrent requests
- Failed analysis calls fall back to local heuristic analysis

Adjustable settings are documented in:

```text
prototype/.env.example
```

## Notes

Fresh Pick is not a food safety, freshness guarantee, or official grading tool. It only provides photo-based shopping guidance. Users should still check expiration dates, packaging condition, smell, visible damage, and store handling before purchase.
