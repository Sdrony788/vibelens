# VibeLens

**Evidence, not hype.** An explainable launch-intelligence terminal for [vibe/vibe](https://testnet.vibevibe.fun) on Robinhood Chain Testnet (chain ID `46630`).

VibeLens helps users inspect live launches without connecting a wallet. It converts public launch metadata, market participation, curve progress, lifecycle and data-quality signals into an explainable report. Every point is visible; missing data is treated as missing—not silently scored as zero.

## Real use case

- Discover active vibe/vibe launches
- Compare participation and bonding-curve progress
- Identify missing descriptions, links and build artifacts
- Inspect buy/sell balance and holder breadth
- Add creator context from the public builder index
- Share a transparent due-diligence workflow

> Testnet research only. Heuristic scores are not financial advice, audits, or guarantees.

## Run locally

Requires Node.js 18+ and no third-party packages.

```bash
npm start
# http://localhost:4173
```

Optional port:

```bash
PORT=8080 npm start
```

## Architecture

- `server.js` — dependency-free Node static server and narrow read-only API proxy
- `public/index.html` — accessible semantic application shell
- `public/styles.css` — responsive original visual system
- `public/app.js` — live data rendering and transparent scoring engine

The server only exposes curated read routes and never requests wallet permissions. Data source:

```text
https://testnet.vibevibe.fun/api/v1/chains/46630
```

## Score model v1

| Evidence family | Weight |
|---|---:|
| Product proof | 30% |
| Market health | 25% |
| Community quality | 20% |
| Creator context | 15% |
| Data confidence | 10% |

The current prototype derives granular checks from these families and exposes each check in the report drawer. A production roadmap should add GitHub artifact verification, creator-history lookups, concentration data and persistent watchlists when public endpoints support them.

## Builder submission checklist

1. Deploy the app publicly.
2. Add the deployment URL and screenshots here.
3. Create a vibe/vibe testnet token under **Product & Utility / Vibecoded Product**.
4. Add the token address below and link the app from its metadata.
5. Submit the demo, repository and token in the official builders Discord.

**Token address:** `TBD`  
**Live app:** `TBD`  
**Builder wallet:** `TBD`

## Security and integrity

- No wallet connection
- No signing or token approvals
- No private keys or API secrets
- Read-only public data
- Escaped user-controlled metadata before rendering
- Strict allowlist for proxied API routes

## License

MIT
