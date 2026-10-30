# Stockroom's assistant

## The job

Answer shop staff's questions about their own shop's orders, stock and customers, from inside Stockroom, and refund an order when they ask. It's for the questions in `docs/research/staff-notes.md`: the ones staff answer today by clicking through several pages.

## Who it acts for

Whoever is signed in, with exactly their rights, in their shop only. It never has more access than the person using it.

| Role | Can see | Can change |
|---|---|---|
| Owner | Everything in their shop | Refunds of any size |
| Support | Orders, customers, products | Refunds up to £50 an order |
| Warehouse | Orders (no customer emails), products | Nothing |

## Tools

| Tool | What it does | Reads or changes | Owner | Support | Warehouse |
|---|---|---|---|---|---|
| `search_orders` | Find orders by status, customer or date | Reads | Yes | Yes | Yes |
| `get_order` | One order by its number: items, status, dates, refunds | Reads | Yes | Yes | Yes, without the customer's email |
| `find_customer` | A customer and their past orders | Reads | Yes | Yes | No |
| `list_products` | Products and stock, or only what's running low | Reads | Yes | Yes | Yes |
| `refund_order` | Refund some or all of an order | Changes: moves money | Yes | Up to £50 | No |

Every tool goes through `server/services/` as the signed-in user, so the checks the app already makes apply to the assistant too. No tool takes a shop or a user as an argument: those come from who's signed in.

## Not in the first version

- Emailing customers. Stockroom doesn't send email today, and it would be acting in the shop's name.
- Changing prices or products. Rare, and the Products page already does it.
- Deleting anything.
- Running SQL or any other open-ended query.
- Another shop's data, ever.

## Limits

- Anything that changes data needs the person to confirm it in Stockroom first. The assistant only proposes it.
- A limit on how many steps it takes for one question, and a daily allowance per person.
- It answers from what the tools return, and says so when it doesn't know.

## How we'll know it helps

Take the questions in `docs/research/staff-notes.md`, ask them as the right person, and check the answers against the database.
