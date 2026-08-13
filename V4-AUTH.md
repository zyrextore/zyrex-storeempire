# V4 Authentication Redesign

- Customer registration/login/logout.
- Passwords are hashed with Node.js `crypto.scryptSync`.
- Customer bearer sessions expire after 7 days.
- Checkout requires an authenticated customer.
- Orders are tied to the authenticated user.
- Payment proof upload is authorized against the order owner.
- Customer order history is available at `/api/me/orders`.
- Separate admin login with a 12-hour admin session.
- Admin endpoints accept the admin bearer session; legacy `x-admin-token` is retained for compatibility.
- Admin credentials are configured through environment variables.
