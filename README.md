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
python -m venv venv
# On Windows use: venv\Scripts\activate
source venv/bin/activate
pip install -r requirements.txt
# Run on 0.0.0.0 so other devices on the network can reach it
python app.py
```

### Frontend
```bash
cd frontend
npm install
```
To start the development server so that other devices can access it:
```bash
# Replace <PC_IP> with the IP address of your PC
export HOST=0.0.0.0
export REACT_APP_API_URL=http://<PC_IP>:5000
npm start
```

On Windows `cmd` use:
```cmd
set HOST=0.0.0.0
set REACT_APP_API_URL=http://<PC_IP>:5000
npm start
```

Now open `http://<PC_IP>:3000` on your smartphone browser to use the app.
