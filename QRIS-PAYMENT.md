# ZYREX Static QRIS Payment

The supplied QRIS artwork is used as a static payment code.

Customer flow:
Checkout -> order -> static QRIS -> exact amount -> upload proof -> WAITING_VERIFICATION.

Admin flow:
review order/proof -> approve or reject.

Important:
- The browser never marks an order PAID.
- The QRIS image is not an API secret.
- Payment proof is stored in backend private storage, not public frontend assets.
- `ADMIN_TOKEN` stays server-side.
- Production should replace in-memory orders with the relational database and connect private product storage for delivery.
