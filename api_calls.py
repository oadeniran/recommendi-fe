import requests
from config import API_BASE_URL

def get_all_categories():
    """
    Fetches all available categories from the API.
    """
    # For now lets add here for latency reasons
    CATEGORIES_DATA = [
    {
        "name": "Movies",
        "value": "Movies",
        "label": "Tell us what kind of movie recommendations you are looking for",
        "placeholder": "e.g., 'I just saw Romeo and Juliet, can you recommmend more movies like this..'",
    },
    {
        "name": "Books",
        "value": "Books",
        "label": "Tell us what kind of book recommendations you are looking for",
        "placeholder": "e.g., 'I just read The Great Gatsby, can you recommmend more books like this..'",
    },
    {
        "name": "Places",
        "value": "Places",
        "label": "Tell us what kind of place recommendations you are looking for",
        "placeholder": "e.g., 'I am looking for good restaurants in New York, can you recommmend some places..'",
    },
    {
        "name": "TV Shows",
        "value": "TV Shows",
        "label": "Tell us what kind of TV show recommendations you are looking for",
        "placeholder": "e.g., 'I just saw Breaking Bad, can you recommmend more shows like this..'",
    },
    # {
    #     "name": "Destinations",
    #     "value": "Destinations",
    #     "label": "Tell us what kind of travel destination recommendations you are looking for",
    #     "placeholder": "e.g., 'I am planning a trip to Europe, can you recommmend some destinations..'",
    # },
    ]
    return {
        'categories_data': CATEGORIES_DATA,
        'status_code': 200
    }
    # url = f"{API_BASE_URL}/available-entities"
    # response = requests.get(url)
    
    # if response.status_code == 200:
    #     if 'status_code' in response.json() and response.json()['status_code'] == 200:
    #         print(response.text[:300])  # Log the first 300 characters of the response
    #         return response.json()
    #     else:
    #         raise ValueError("Unexpected response format or status code.")
    # else:
    #     response.raise_for_status()  # Raise an error for bad responses

def generate_recommendation(session_id, category, query_value, search_type='message'):
    """
    Generates a recommendation based on user input.
    """
    url = f"{API_BASE_URL}/recommendations"
    if search_type == 'tag':
        body = {
            'session_id': session_id,
            'selected_category': category,
            'selected_tag_id': query_value,
            'is_tags_only': True
        }
    else:
        body = {
            'session_id': session_id,
            'selected_category': category,
            'user_message': query_value,
            'is_tags_only': False
        }
    print(f"Sending request to {url} with body: {body}")
    
    response = requests.post(url, json=body)
    
    if response.status_code == 200:
        resp = response.json()
        if 'status_code' in resp and resp['status_code'] == 200:
            return resp
    else:
        response.raise_for_status()  # Raise an error for bad responses

def get_recommendation_data(session_id, category, query_value, search_type='message', page=1):
    """
    Fetches recommendation data from the API.
    """

    if page == 1:
        # Means it's the first page, so we can use the main endpoint
        return generate_recommendation(session_id, category, query_value, search_type)
    
    # For subsequent pages, we need to use the paginated endpoint
    if search_type == 'tag':
        url = f"{API_BASE_URL}/recommendations/{session_id}/details?recommendation_category={category}&selected_tag_id={query_value}&page={page}"
    else:
        url = f"{API_BASE_URL}/recommendations/{session_id}/details?recommendation_category={category}&user_message={query_value}&page={page}"

    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        response.raise_for_status()  # Raise an error for bad responses