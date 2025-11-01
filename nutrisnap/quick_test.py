import requests

def test_nutrition_endpoint():
    """Quick test of nutrition endpoint"""
    try:
        url = "http://127.0.0.1:5000/nutrition/pizza"
        response = requests.get(url)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_nutrition_endpoint()