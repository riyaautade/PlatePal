from flask import Flask, request, render_template, jsonify
import os
import requests
import base64
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# API Keys
CLARIFAI_API_KEY = "3ee1d0f1c2de452bbfa0b8bcb3bb432d"
USDA_API_KEY = "D5PqyX9fndFxt9Nqlgd931PvXzAFK1SyEF9GppkH"

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def analyze_food_image(image_path):
    """Analyze food image using Clarifai API via direct HTTP requests"""
    try:
        # Read and encode image to base64
        with open(image_path, "rb") as f:
            image_bytes = f.read()
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')

        # Clarifai API endpoint for food recognition
        url = "https://api.clarifai.com/v2/models/food-item-recognition/outputs"
        
        headers = {
            "Authorization": f"Key {CLARIFAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "inputs": [
                {
                    "data": {
                        "image": {
                            "base64": image_base64
                        }
                    }
                }
            ]
        }
        
        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code == 200:
            result = response.json()
            predictions = []
            
            if result.get('outputs') and result['outputs'][0].get('data', {}).get('concepts'):
                concepts = result['outputs'][0]['data']['concepts']
                for concept in concepts[:5]:  # Top 5 predictions
                    predictions.append({
                        'name': concept['name'],
                        'confidence': round(concept['value'] * 100, 2)
                    })
            
            return predictions, None
        else:
            return None, f"Clarifai API error: {response.status_code} - {response.text}"
            
    except Exception as e:
        return None, f"Error analyzing image: {str(e)}"

def get_nutrition_data(food_name):
    """Get nutrition data from USDA API"""
    try:
        # Search for food
        search_url = f"https://api.nal.usda.gov/fdc/v1/foods/search"
        search_params = {
            'query': food_name,
            'api_key': USDA_API_KEY,
            'pageSize': 1
        }
        
        response = requests.get(search_url, params=search_params)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('foods') and len(data['foods']) > 0:
                food_item = data['foods'][0]
                
                # Get detailed nutrition info
                fdc_id = food_item['fdcId']
                detail_url = f"https://api.nal.usda.gov/fdc/v1/food/{fdc_id}"
                detail_params = {'api_key': USDA_API_KEY}
                
                detail_response = requests.get(detail_url, params=detail_params)
                
                if detail_response.status_code == 200:
                    detail_data = detail_response.json()
                    
                    nutrition = {
                        'name': detail_data.get('description', food_name),
                        'nutrients': []
                    }
                    
                    # Extract key nutrients
                    key_nutrients = {
                        'Energy': 'kcal',
                        'Protein': 'g',
                        'Total lipid (fat)': 'g',
                        'Carbohydrate, by difference': 'g',
                        'Fiber, total dietary': 'g',
                        'Sugars, total including NLEA': 'g',
                        'Sodium, Na': 'mg'
                    }
                    
                    for nutrient in detail_data.get('foodNutrients', []):
                        nutrient_name = nutrient.get('nutrient', {}).get('name', '')
                        if nutrient_name in key_nutrients:
                            nutrition['nutrients'].append({
                                'name': nutrient_name,
                                'amount': nutrient.get('amount', 0),
                                'unit': nutrient.get('nutrient', {}).get('unitName', key_nutrients[nutrient_name])
                            })
                    
                    return nutrition, None
                else:
                    return None, f"Error getting detailed nutrition data: {detail_response.status_code}"
            else:
                return None, "No nutrition data found for this food item"
        else:
            return None, f"USDA API error: {response.status_code}"
            
    except Exception as e:
        return None, f"Error getting nutrition data: {str(e)}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if file and allowed_file(file.filename):
            # Create uploads directory if it doesn't exist
            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
            
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Analyze the image
            predictions, error = analyze_food_image(filepath)
            if error:
                return jsonify({'error': error}), 500
            
            if not predictions:
                return jsonify({'error': 'No food items detected in the image'}), 400
            
            # Get nutrition data for the top prediction
            top_prediction = predictions[0]['name']
            nutrition_data, nutrition_error = get_nutrition_data(top_prediction)
            
            return jsonify({
                'predictions': predictions,
                'nutrition': nutrition_data,
                'nutrition_error': nutrition_error,
                'image_path': f'static/uploads/{filename}'
            })
        
        return jsonify({'error': 'Invalid file type'}), 400
        
    except Exception as e:
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)