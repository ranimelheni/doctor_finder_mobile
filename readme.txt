Doctor-finder
app developed by Houssem Bensalah & Ranim Elheni

+ Prerequisites

Python 3.11.11 or later

PostgreSQL (only if running the database locally)

Node.js (for the Ionic frontend)

Git (to clone the repository)

pip (Python package manager)

+ Setup Instructions

1) Clone the Repository Clone the project from GitHub



2) Database Setup The database is hosted on Neon PostgreSQL, so you do not need to run the database script locally unless you want a local database for development.

+ Hosted Database: The API connects to the hosted PostgreSQL database (postgresql://neondb_owner:npg_yDgHEK8r9vXe@ep-ancient-bush-a87ccgy7-pooler.eastus2.azure.neon.tech/neondb?sslmode=require). No action is needed if using the hosted database.

+ Local Database (Optional): To run the database locally (for api.py), install PostgreSQL and run the db.sql script: psql -U your_username -d your_database -f db.sql Update the SQLALCHEMY_DATABASE_URI in api.py to your local database (e.g., postgresql://your_username:your_password@localhost:5432/your_database).

3)Install Dependencies Create a virtual environment and install the required packages: python -m venv venv source venv/bin/activate # On Windows: venv\Scripts\activate pip install -r requirements.txt

The requirements.txt includes:

Flask==2.3.2
Flask-SQLAlchemy==3.0.5
Flask-Cors==4.0.0
Flask-Bcrypt==1.0.1
Flask-SocketIO==5.3.6
Flask-JWT-Extended==4.5.3
psycopg2-binary==2.9.9
python-socketio==5.11.0
Werkzeug==2.3.7
gunicorn==22.0.0
gevent==24.2.1

4)Configure Environment Variables Set the JWT secret key: export JWT_SECRET_KEY=your-secure-key-here # On Windows: set JWT_SECRET_KEY=your-secure-key-here
Or create a .env file in the project root: JWT_SECRET_KEY=your-secure-key-here





+ Running the Project You have three options to run the project:

Option 1: Run api_host.py (Local Server, Hosted Database) This runs the Flask server locally with the hosted PostgreSQL database. python api_host.py
- The server runs on http://localhost:5000.
- Use this for local development with the production database.
- Ensure internet access to connect to the Neon database.

Option 2: Run api.py (Local Server, Local Database) This runs the Flask server locally with a local PostgreSQL database.
-Set up a local PostgreSQL database and run db.sql (see Database Setup).
-Update the SQLALCHEMY_DATABASE_URI in api.py to your local database.
-Run the server: python api.py
-The server runs on http://localhost:5000.
-Use this for fully local development or testing.

Option 3: Run the Ionic Frontend (Online Server) The API is deployed online, so you can run the Ionic frontend without starting the backend locally.
-Navigate to the Ionic project directory
-Install Ionic dependencies: npm install
-Run the Ionic app: ionic serve
-The Ionic app connects to the online API (e.g., https://doctor-finder-3lrk.onrender.com).
-Ensure the Ionic project is configured with the correct API URL.


Real-Time Features The API uses WebSockets for real-time messaging and notifications:
Notifications (e.g., new appointments) are sent to users.
Deployment The API is deployed on Render:
URL: https://doctor-finder-3lrk.onrender.com

Start Command: gunicorn --worker-class gevent -w 1 --bind 0.0.0.0:10000 --timeout 120 api:app

Database: Hosted on Neon PostgreSQL

Troubleshooting

Database Errors: Check SQLALCHEMY_DATABASE_URI. Ensure your IP is whitelisted in Neon (hosted DB) or PostgreSQL is running locally.

Dependency Issues: Run pip install -r requirements.txt again if errors occur.

Ionic Issues: Verify the Ionic project’s API URL and backend accessibility.

Logs: Check Render logs or local console. Enable debug mode in api.py or api_host.py (app.config['DEBUG'] = True).

Contact For issues, open a GitHub issue or contact the project maintainer.

Note : Make sure to change the API URL to localhost in the ionic project if you choose to run the server locally , in all services and messages component and notification component.
