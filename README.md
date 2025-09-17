# LocalTagEditor

This repository contains a simple tag-based file manager that runs entirely on a local machine.

- **Backend:** Python + Flask
- **Database:** SQLite via SQLAlchemy
- **Frontend:** React
- **Supported image formats:** PNG, JPG, JPEG, GIF, WEBP
- **Supported video formats:** MP4, WEBM, OGG

## Projects

- **Project2 — GIF Frame Viewer:** Static web app located in `project2/` that lets you upload a GIF file and view every frame as a still image.

## Setup

### Backend
```bash
cd backend
python -m venv venv
# On Windows use: venv\Scripts\activate
source venv/bin/activate
pip install -r requirements.txt
# Optional: copy `backend/.env.example` to `backend/.env` to configure the server
cp backend/.env.example backend/.env
python app.py
```

### Frontend
```bash
cd frontend
npm install
```
To start the development server so that other devices can access it:
```bash
cp frontend/.env.example frontend/.env
# Edit frontend/.env and replace <PC_IP> with the IP address of your PC
npm start
```

Create the `.env` file the same way on Windows.

Now open `http://<PC_IP>:3000` on your smartphone browser to use the app.
