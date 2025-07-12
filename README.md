# LocalTagEditor

This repository contains a simple tag-based file manager that runs entirely on a local machine.

- **Backend:** Python + Flask
- **Database:** SQLite via SQLAlchemy
- **Frontend:** React
- **Supported image formats:** PNG, JPG, JPEG, GIF, WEBP
- **Supported video formats:** MP4, WEBM, OGG

## Setup

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
flask run --host 0.0.0.0
```

### Frontend
```bash
cd frontend
npm install
npm start
```

Access the frontend at `http://<server-ip>:3000` and the backend at
`http://<server-ip>:5000` from other devices on your local network.
