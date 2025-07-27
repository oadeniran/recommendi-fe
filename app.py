from flask import Flask, render_template, request, jsonify
import api_calls
import uuid

app = Flask(__name__)


def get_data_from_db(search_params):
    """
    Main data fetching router. Handles pagination for different search types.
    """
    category = search_params.get('category', 'Movie')
    page = int(search_params.get('page', 1))
    search_type = search_params.get('search_type', 'message')
    session_id = search_params.get('session_id', None)
    query_value = search_params.get('query')
    tag_name = search_params.get('tag_name', 'Unknown Tag')

    search_context = {'type': search_type, 'query': query_value, 'name': tag_name}
    
    try:
        recommendations_obj = api_calls.get_recommendation_data(session_id, category, query_value=query_value, search_type=search_type, page=page).get("recommendations", {})
        recommendations = recommendations_obj.get('recommendations', [])
        has_next = recommendations_obj.get('has_next_page', False)
    except Exception as e:
        print(f"Error generating recommendations for query{query_value} in category {category}: {e}")
        return [], False
    
    return recommendations, has_next, search_context

# --- Flask Routes ---

@app.route('/', methods=['GET'])
def index():
    """Serves the main application shell."""
    return render_template('index.html')

@app.route('/api/categories')
def api_categories():
    """Provides a list of available recommendation categories."""
    categories = []
    try:
        categories_d = api_calls.get_all_categories()
        categories = categories_d.get('categories_data', [])
        print(f"Fetched categories: {categories}")
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    return jsonify(categories)

# Future extension capability for session management
@app.route('/api/create_session', methods=['POST'])
def create_session():
    """Generates a unique session ID and stores it."""
    session_id = str(uuid.uuid4())
    data = request.json
    print(f"Creating session with ID: {session_id} and data: {data}")
    print(f"New session created: {session_id}") 
    return jsonify({'session_id': session_id})

@app.route('/api/update_session', methods=['POST'])
def update_session():
    """Updates a session in the cache with the full session details."""
    data = request.json
    session_id = data.get('session_id')
    
    # Basic validation
    if not session_id:
        return jsonify({'error': 'Session ID is required'}), 400

    # The session data can then be used extensively in the app
    # For now, we just log it
    print(f"Updating session with ID: {session_id} and data: {data}")

    return jsonify({'status': 'success', 'session_id': session_id})


@app.route('/api/recommendations')
def api_recommendations():
    """A single, powerful API endpoint to get recommendations."""
    recommendations, has_next, search_context = get_data_from_db(request.args)
    return jsonify({
        'recommendations': recommendations,
        'has_next': has_next,
        'next_page': int(request.args.get('page', 1)) + 1,
        'search_context': search_context
    })

@app.route('/tag/<tag_id>')
def search_by_tag(tag_id):
    """Placeholder route for tag searches.
    In a real app, this would also fetch data and return a page or JSON."""
    return f"<h1>Searching for items with Tag ID: {tag_id}</h1><p>This page would show all recommendations associated with this tag.</p>"

if __name__ == '__main__':
    app.run(debug=True)