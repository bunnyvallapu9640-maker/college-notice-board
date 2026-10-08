# CampusConnect – College Digital Notice Board

A responsive college notice board built with HTML, CSS, vanilla JavaScript, Express, and SQLite. Vite provides the local development server, while Express exposes the notice API and serves the production build.

## Demo login
Username: admin
Password: admin123

## Run locally

1. Install [Node.js](https://nodejs.org/) if it is not already installed.
2. In the project folder, install dependencies:

   ```sh
   npm install
   ```

3. Start the app and API server:

   ```sh
   npm run dev
   ```

4. Open the Vite URL printed in the terminal (usually `http://localhost:5173`). The API and database server runs at `http://localhost:3000`.

In VS Code, open this folder, choose **Terminal → New Terminal**, then run the commands above. Press `Ctrl+C` in the terminal to stop the server.

The SQLite database is created at `data/campusconnect.sqlite` on first run and is initialized with sample notices when empty. The database file is ignored by Git; its schema and seed data are created by `server.js`. In production, build the frontend with `npm run build`, then start the API and static web server with `npm start`.

## Features
- Student notice board
- Department filtering
- Category filtering
- Search
- Important notice badges
- Admin login
- Create, edit and delete notices
- PDF/image/DOC/TXT attachment support
- Attachment download
- Responsive mobile layout
- Sample notices in SQLite
- Persistent notices shared by browsers using the same server

## Important note
This is a local demo. Admin login is still a client-side demo check, not secure authentication; the API is not protected for production use. Do not deploy it with real private notices or attachments without adding server-side authentication and authorization.

For a real college deployment, connect the same UI to Firebase/Supabase/another backend for:
- secure authentication
- cloud file storage
- shared notices across devices
- role-based access
- audit logs
