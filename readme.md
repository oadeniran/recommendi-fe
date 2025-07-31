# Recommendi Frontend

A Flask-based frontend application for the Recommendi recommendation system. This project serves as the user interface layer, handling web routes and user interactions while connecting to an external backend API for recommendation data.

## 🏗️ Architecture

This is a **frontend-only project** where Flask is used primarily as a web server to:

- Serve static HTML, CSS, and JavaScript files
- Handle frontend routing and templating
- Manage user sessions
- Proxy API calls to the external recommendation backend

```text
┌─────────────────┐    HTTP Requests    ┌──────────────────┐    API Calls    ┌─────────────────┐
│   Web Browser   │ ◄─────────────────► │  Flask Frontend  │ ◄──────────────► │ Backend API     │
│                 │                     │  (This Project)  │                 │ (External)      │
└─────────────────┘                     └──────────────────┘                 └─────────────────┘
```

## ✨ Features

- **Category-based Recommendations**: Support for Movies, Books, Places, and TV Shows
- **Session Management**: Maintains user context across interactions
- **Pagination**: Handles large recommendation sets with pagination
- **Responsive UI**: Modern, mobile-friendly interface
- **Search History**: Track and revisit previous searches
- **Real-time Loading**: Skeleton loading states for better UX

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd flask-fe
   ```

2. **Create a virtual environment**

   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**

   Create a `.env` file in the root directory:

   ```env
   API_BASE_URL=http://your-backend-api-url
   SECRET_KEY=your-secret-key-here
   ```

5. **Run the application**

   ```bash
   python app.py
   ```

   The application will be available at `http://localhost:5000`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_BASE_URL` | The base URL of the recommendation backend API | `http://localhost:5000` |
| `SECRET_KEY` | Flask session secret key | `default_secret_key` |

### API Integration

The frontend communicates with an external backend through the following endpoints:

- `GET /available-entities` - Fetch available recommendation categories
- `POST /recommendations` - Generate new recommendations
- `GET /recommendations/{session_id}/details` - Fetch paginated recommendation details

## 📁 Project Structure

```text
flask-fe/
├── app.py                 # Main Flask application
├── api_calls.py          # Backend API integration layer
├── config.py             # Configuration management
├── requirements.txt      # Python dependencies
├── Dockerfile           # Docker container configuration
├── Procfile             # Heroku deployment configuration
├── static/              # Static assets
│   ├── css/
│   │   └── style.css    # Application styles
│   └── js/
│       └── loader.js    # Frontend JavaScript
├── templates/           # Jinja2 templates
│   └── index.html       # Main application template
└── local/               # Local development files
    └── venv.txt         # Virtual environment info
```

## 🎯 API Endpoints

### Frontend Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Serve the main application |
| `GET` | `/api/categories` | Get available recommendation categories |
| `POST` | `/api/create_session` | Create a new user session |
| `POST` | `/api/update_session` | Update session data |
| `POST` | `/api/reset_session` | Clear current session |
| `GET` | `/api/recommendations` | Get recommendations with pagination |

### Session Management

The application uses Flask sessions to maintain user context:

- Session IDs are generated using UUID4
- Sessions track user interactions and search history
- Session data is used for personalized recommendations

## 🎨 Frontend Features

### User Interface

- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Clean, intuitive interface with smooth animations
- **Loading States**: Skeleton loading for better perceived performance
- **Session History**: Sidebar showing previous searches with navigation

### Categories Supported

1. **Movies** - Film recommendations based on user preferences
2. **Books** - Book suggestions tailored to reading interests
3. **Places** - Location and restaurant recommendations
4. **TV Shows** - Television series recommendations

## 🐳 Deployment

### Docker

Build and run with Docker:

```bash
docker build -t recommendi-frontend .
docker run -p 5000:5000 --env-file .env recommendi-frontend
```

### Heroku

Deploy to Heroku using the included `Procfile`:

```bash
git push heroku main
```

Make sure to set environment variables in Heroku:

```bash
heroku config:set API_BASE_URL=your-backend-url
heroku config:set SECRET_KEY=your-secret-key
```

## 🔄 Development Workflow

1. **Backend Dependency**: Ensure the recommendation backend API is running and accessible
2. **Environment Setup**: Configure `.env` with correct API endpoint
3. **Local Development**: Run `python app.py` for development server
4. **API Testing**: Use the `/api/` endpoints to test backend integration
5. **Frontend Changes**: Modify templates and static files as needed

## 🧪 Testing

To test the API integration:

```bash
# Test categories endpoint
curl http://localhost:5000/api/categories

# Test session creation
curl -X POST http://localhost:5000/api/create_session

# Test recommendations
curl "http://localhost:5000/api/recommendations?category=Movies&query=romantic%20comedy&page=1"
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly with the backend API
5. Commit your changes: `git commit -m 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## ⚠️ Important Notes

- This is a **frontend-only application** - it requires an external recommendation backend API to function
- Flask is used here as a web server and template engine, not for complex backend logic
- All recommendation logic and data processing happens in the external backend
- Make sure the backend API is running and accessible before starting this frontend

## 📄 License

[Add your license information here]

## 🤝 Support

For issues related to:

- **Frontend/UI**: Create an issue in this repository
- **Recommendations/Backend**: Check the backend API documentation
- **API Integration**: Verify your `API_BASE_URL` configuration

---

**Note**: This frontend application is designed to work with the Recommendi backend API. Ensure you have access to and proper configuration for the backend service before running this application.