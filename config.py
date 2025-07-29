import os
from dotenv import load_dotenv
load_dotenv()

API_BASE_URL= os.getenv('API_BASE_URL', 'http://localhost:5000')
PER_PAGE = 3 # How many results to fetch at a time
SECRET_KEY = os.getenv('SECRET_KEY', 'default_secret_key')