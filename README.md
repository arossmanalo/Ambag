# Ambag

Split a restaurant bill by what each person ordered, then see who pays whom.

*Ambag* is Filipino for a share or contribution.

The usual situation: the bill is ₱1,500, everyone agrees to pay for what they ordered, but only
two people have cash on them. One hands over ₱1,000 and another ₱500. Now nobody is sure who owes
whom, or who should get the change. One person enters the bill on their phone, and Ambag works
out:

- each person's share, including their part of the service charge or discount
- where the restaurant's change goes
- the fewest payments that settle everyone, and where to send each one

There is no backend and no account. Bills are saved in the browser, and a bill is shared as a
link or as plain text for the group chat.

## Using it

1. **People.** Add everyone who ate, including whoever paid. Use the wallet button to save
   someone's GCash, Maya or bank details, so the others know where to send their share.
2. **Orders.** Add each dish or drink with its price and pick who had it. A shared dish is
   split evenly between the people picked. Service charge and discount can be a percentage or a
   fixed amount.
3. **Who paid.** Enter the cash each person handed to the restaurant.
4. **Settle up.** Read who pays whom. Tick each payment as it comes in, then copy the summary or a
   link to send to the group.

The home screen lists every bill saved on the device, with its total and how many payments are
left.

### How the numbers are worked out

- Money is kept in whole centavos, never as fractions, so every share adds up exactly to the
  bill.
- A shared dish is split evenly. A centavo that cannot be split goes to the first person ticked
  on that order, one each.
- Service charge and discount are spread in proportion to what each person ordered.
- If more cash was handed over than the bill, the change goes back to whoever handed over the
  most. If that is more than they gave, the rest goes to the next largest payer.
- Payments are planned by matching whoever owes the most with whoever is owed the most, so a
  group of *n* people never needs more than *n* − 1 payments.
- A payment ticked as paid stays ticked only while its amount is unchanged. If an edit changes
  that payment, the tick drops.

### Where bills are kept

- Bills are saved in this browser's local storage under `ambag:bills:v1`. They do not sync to
  other devices, and clearing the site's data deletes them. A bill saved by an older version
  under `ambag:bill:v1` is moved into the list on first load.
- A share link carries the whole bill in the part of the address after `#`. Browsers do not send
  that part to any server. Anyone with the link can read the bill, including names and payment
  details, so share it only with the people at the table.
- Opening a share link shows the bill read-only. "Edit a copy" adds it to your own list.

## Running it locally

You need Node.js 22.12 or newer (the test runner needs it; it has been run on Node 24).

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173.

| Script | What it does |
| --- | --- |
| `npm run dev` | Starts the development server with live reload |
| `npm run build` | Type-checks and builds the static site into `dist/` |
| `npm run preview` | Serves the built `dist/` folder to check the production build |
| `npm run typecheck` | Runs the TypeScript compiler without writing files |
| `npm run lint` | Runs ESLint |
| `npm test` | Runs the Vitest tests once |

The build is a plain static site. Any static host can serve `dist/`; no server code or
environment variables are needed.

## Project layout

```
src/
  domain/      Bill rules with no React in them: money, splitting, settling up, summaries
  state/       The bill reducer and the hook that keeps the list of bills saved
  storage/     Browser storage and share links, both validated with zod on the way in
  components/  Screens and sections: home, bill editor, settle-up receipt, shared view
  styles/      tokens.css holds the colours, sizes and spacing; app.css uses only those
```

The calculation lives in `src/domain` and is tested there, apart from the UI. Anything read from
storage or a link is checked against the schema in `src/domain/bill.ts` before the app uses it,
so a damaged or edited link shows an error instead of breaking the page.

Built with React, TypeScript and Vite. Icons are from Lucide, and the type is IBM Plex Sans and
IBM Plex Mono.
