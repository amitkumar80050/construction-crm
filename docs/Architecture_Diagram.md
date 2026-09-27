```mermaid
flowchart LR
	Browser[React client]
	Proxy[Nginx reverse proxy\nTLS and static files]
	API[Express CRM API\nJWT and role checks]
	Socket[Socket.IO\nJWT-authenticated events]
	Mongo[(MongoDB)]
	Uploads[(Persistent uploads)]
	Mail[SMTP provider]
	Certbot[Certbot / Let's Encrypt]

	Browser -->|HTTPS /api| Proxy
	Browser <-->|HTTPS /socket.io| Proxy
	Proxy -->|HTTP| API
	Proxy -->|static SPA| Browser
	API --> Mongo
	API --> Uploads
	API --> Mail
	API --> Socket
	Socket --> Mongo
	Certbot -->|ACME HTTP-01| Proxy
```

## Runtime boundaries

- Nginx is the only public application service. It serves the React single-page app, forwards `/api` to Express, and forwards `/socket.io` with WebSocket upgrades.
- Express owns authentication, role/team authorization, CRM workflows, and persistence. MongoDB is not published to the host network.
- Socket.IO authenticates the same JWT as the API. Server code assigns each connection to its user room; event notifications are sent only to that room.
- MongoDB data, API uploads, WhatsApp browser credentials, and TLS certificates are separate persistent Docker volumes.
- SMTP is optional and used for email delivery. In-app notifications remain stored in MongoDB and are also pushed over Socket.IO.
