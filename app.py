import re
import json
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
PER_PAGE = 3 # How many results to fetch at a time

# --- Helper Functions & Data Transformation ---

def clean_html_text(raw_html):
    if not isinstance(raw_html, str): return raw_html
    return re.sub(re.compile('<.*?>'), '', raw_html)

def format_extra_data_as_string(data_dict):
    print(f"Formatting extra data: {data_dict}")
    """
    NEW: Converts the extra_data dictionary into a formatted, multi-line string.
    """
    output_lines = []
    for key, value in data_dict.items():
        if not value: continue
        
        formatted_key = key.replace('_', ' ').title()
        
        if isinstance(value, dict):
            output_lines.append(f"{formatted_key}:")
            for sub_key, sub_value in value.items():
                output_lines.append(f"  {sub_key.replace('_', ' ').title()}: {sub_value}")
        elif isinstance(value, list):
            output_lines.append(f"{formatted_key}:")
            for item in value:
                output_lines.append(f"  - {item}")
        else:
            output_lines.append(f"{formatted_key}: {value}")
            
    return "\n".join(output_lines)

def transform_movie_entity(entity):
    extra_data_dict = {
        'duration': entity.get('properties', {}).get('duration'),
        'content_rating': entity.get('properties', {}).get('content_rating'),
        'popularity': entity.get('popularity'),
    }
    # Add external sources like imdb, where_to_watch
    for source, data in entity.get('external', {}).items():
        extra_data_dict[source] = data[0] if source != 'where_to_watch' else data
        
    return {
        'id': entity.get('id'), 'title': entity.get('name'),
        'release_date': entity.get('properties', {}).get('release_date', '')[:4],
        'description': clean_html_text(entity.get('properties', {}).get('description')),
        'genre': next((tag['name'] for tag in entity.get('tags', []) if tag['type'] == 'genre'), None),
        'image': entity.get('properties', {}).get('image'), 'tags': entity.get('tags', []),
        'extra_data': format_extra_data_as_string(extra_data_dict), # Use the new string formatter
        'action': entity.get('action')
    }

def transform_book_entity(entity):
    def clean_author(author_str: str) -> str:
        match = re.match(r"^\d{4},\s*(.*)", author_str); return match.group(1) if match else author_str
    
    extra_data_dict = {
        'publisher': entity.get('properties', {}).get('publisher'),
        'page_count': entity.get('properties', {}).get('page_count'),
        'popularity': entity.get('popularity'),
        'goodreads': entity.get('external', {}).get('goodreads', [{}])[0]
    }

    return {
        'id': entity.get('id'), 'title': entity.get('name'), 'author': clean_author(entity.get('disambiguation', '')),
        'publication_date': entity.get('properties', {}).get('publication_date', '')[:4],
        'description': clean_html_text(entity.get('properties', {}).get('description')),
        'genre': next((tag['name'] for tag in entity.get('tags', []) if tag['type'] == 'genre'), None),
        'image': entity.get('properties', {}).get('image'), 'tags': entity.get('tags', []),
        'extra_data': format_extra_data_as_string(extra_data_dict), # Use the new string formatter
        'action': entity.get('action')
    }

# --- Mock Data and Recommendation Logic ---

from MOCK_DATA import MOCK_MOVIES, MOCK_BOOKS
CATEGORY_MAP = {'Movie': {'data': MOCK_MOVIES, 'transform': transform_movie_entity}, 'Book': {'data': MOCK_BOOKS, 'transform': transform_book_entity}}


def get_data_from_db(search_params):
    """
    Main data fetching router. Handles pagination for different search types.
    """
    category = search_params.get('category', 'Movie')
    page = int(search_params.get('page', 1))
    search_type = search_params.get('search_type', 'message')

    if category not in CATEGORY_MAP: return [], False
    
    source_data = CATEGORY_MAP[category]['data']
    
    # Filter data based on search type
    if search_type == 'tag':
        tag_id = search_params.get('query')
        filtered_data = [item for item in source_data if any(tag['id'] == tag_id for tag in item.get('tags', []))]
    else: # Default to 'message' search (we don't filter by message text in this mock)
        filtered_data = source_data

    # Paginate the filtered data
    start_index = (page - 1) * PER_PAGE
    end_index = start_index + PER_PAGE
    paginated_data = filtered_data[start_index:end_index]
    has_next = end_index < len(filtered_data)
    
    # Transform and add context
    transform_function = CATEGORY_MAP[category]['transform']
    recommendations = [transform_function(entity) for entity in paginated_data]
    for rec in recommendations:
        rec['context'] = f"This recommendation seems like a great fit."
        
    return recommendations, has_next

# --- Flask Routes ---

@app.route('/', methods=['GET'])
def index():
    """Serves the main application shell."""
    return render_template('index.html')

@app.route('/api/recommendations')
@app.route('/api/recommendations')
def api_recommendations():
    """A single, powerful API endpoint to get recommendations."""
    recommendations, has_next = get_data_from_db(request.args)
    return jsonify({
        'recommendations': recommendations,
        'has_next': has_next,
        'next_page': int(request.args.get('page', 1)) + 1
    })

@app.route('/tag/<tag_id>')
def search_by_tag(tag_id):
    """Placeholder route for tag searches.
    In a real app, this would also fetch data and return a page or JSON."""
    return f"<h1>Searching for items with Tag ID: {tag_id}</h1><p>This page would show all recommendations associated with this tag.</p>"

if __name__ == '__main__':
    app.run(debug=True)