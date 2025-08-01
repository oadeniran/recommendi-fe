from flask import Flask, render_template, request, jsonify, session
import api_calls
import uuid
from config import SECRET_KEY

app = Flask(__name__)
app.secret_key = SECRET_KEY


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
    error = None
    
    try:
        recommendations_obj = api_calls.get_recommendation_data(session_id, category, query_value=query_value, search_type=search_type, page=page)
        recommendations = recommendations_obj.get("recommendations", {}).get('recommendations', [])
        has_next = recommendations_obj.get("recommendations", {}).get('has_next_page', False)
        error = recommendations_obj.get('error', None)
    except Exception as e:
        print(f"Error generating recommendations for query{query_value} in category {category}: {e}")
        return [], False, search_context, error
    
    return recommendations, has_next, search_context, error

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
    if session.get('session_id'):
        return jsonify({'session_id': session['session_id']})
    session_id = str(uuid.uuid4())
    data = request.json
    session['session_id'] = session_id
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

@app.route('/api/reset_session', methods=['POST'])
def reset_session():
    """Resets the current session by clearing the session data."""
    session.clear()
    print("Session cleared.")
    return jsonify({'status': 'success', 'message': 'Session cleared successfully'})


@app.route('/api/recommendations')
def api_recommendations():
    """A single, powerful API endpoint to get recommendations."""
    recommendations, has_next, search_context, error = get_data_from_db(request.args)
    print(error)
    return jsonify({
        'recommendations': recommendations,
        'has_next': has_next,
        'next_page': int(request.args.get('page', 1)) + 1,
        'search_context': search_context,
        'error_message': error
    })

if __name__ == '__main__':
    app.run(debug=True)