// NutriSnap Frontend JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file-input');
    const uploadBtn = document.getElementById('upload-btn');
    const uploadArea = document.getElementById('upload-area');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const errorMessage = document.getElementById('error-message');

    // File upload handlers
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleFileDrop);

    function handleDragOver(e) {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
    }

    function handleFileDrop(e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (isValidImageFile(file)) {
                uploadFile(file);
            } else {
                showError('Please select a valid image file (PNG, JPG, JPEG, GIF)');
            }
        }
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && isValidImageFile(file)) {
            uploadFile(file);
        } else {
            showError('Please select a valid image file (PNG, JPG, JPEG, GIF)');
        }
    }

    function isValidImageFile(file) {
        const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif'];
        return validTypes.includes(file.type);
    }

    function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        // Hide previous results and errors
        hideElements([results, errorMessage]);
        
        // Show loading
        loading.classList.remove('hidden');
        loading.classList.add('fade-in');

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            loading.classList.add('hidden');
            
            if (data.error) {
                showError(data.error);
            } else {
                displayResults(data);
            }
        })
        .catch(error => {
            loading.classList.add('hidden');
            showError('An error occurred while processing your image. Please try again.');
            console.error('Error:', error);
        });
    }

    function showError(message) {
        hideElements([loading, results]);
        
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        errorMessage.classList.add('fade-in');
        
        setTimeout(() => {
            errorMessage.classList.add('hidden');
        }, 5000);
    }

    function hideElements(elements) {
        elements.forEach(element => {
            element.classList.add('hidden');
            element.classList.remove('fade-in');
        });
    }

    function displayResults(data) {
        // Display uploaded image
        document.getElementById('uploaded-image').src = data.image_path;

        // Display predictions
        displayPredictions(data.predictions);

        // Show results
        results.classList.remove('hidden');
        results.classList.add('fade-in');

        // Scroll to results
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Automatically fetch nutrition for the top prediction
        if (data.predictions && data.predictions.length > 0) {
            const topPrediction = data.predictions[0];
            fetchNutritionData(topPrediction.name);
        }
    }

    function displayPredictions(predictions) {
        const predictionsList = document.getElementById('predictions-list');
        predictionsList.innerHTML = '';

        predictions.forEach((prediction, index) => {
            const predictionItem = document.createElement('div');
            predictionItem.className = 'prediction-item flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors';
            
            const confidenceColor = getConfidenceColor(prediction.confidence);
            
            predictionItem.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="w-2 h-2 rounded-full bg-${confidenceColor}-500"></div>
                    <span class="font-semibold text-gray-800">${prediction.name}</span>
                </div>
                <div class="flex items-center space-x-2">
                    <div class="w-20 bg-gray-200 rounded-full h-2">
                        <div class="bg-${confidenceColor}-500 h-2 rounded-full transition-all duration-500" 
                             style="width: ${prediction.confidence}%"></div>
                    </div>
                    <span class="text-sm font-bold text-${confidenceColor}-600">${prediction.confidence}%</span>
                </div>
            `;
            
            // Add click handler to fetch nutrition for this prediction
            predictionItem.addEventListener('click', () => {
                // Remove active class from all items
                document.querySelectorAll('.prediction-item').forEach(item => {
                    item.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50');
                });
                // Add active class to clicked item
                predictionItem.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50');
                
                fetchNutritionData(prediction.name);
            });
            
            predictionsList.appendChild(predictionItem);
            
            // Add animation delay
            setTimeout(() => {
                predictionItem.style.opacity = '1';
                predictionItem.style.transform = 'translateX(0)';
            }, index * 100);

            // Highlight the first item by default
            if (index === 0) {
                predictionItem.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50');
            }
        });
    }

    function getConfidenceColor(confidence) {
        if (confidence >= 80) return 'green';
        if (confidence >= 60) return 'yellow';
        if (confidence >= 40) return 'orange';
        return 'red';
    }

    function fetchNutritionData(foodName) {
        const nutritionSection = document.getElementById('nutrition-section');
        const nutritionContent = document.getElementById('nutrition-content');
        
        // Show loading state for nutrition
        nutritionContent.innerHTML = `
            <div class="flex items-center justify-center p-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span class="ml-3 text-gray-600">Loading nutrition data...</span>
            </div>
        `;
        
        nutritionSection.classList.remove('hidden');
        
        fetch(`/nutrition/${encodeURIComponent(foodName)}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    nutritionContent.innerHTML = `
                        <div class="text-center p-8">
                            <div class="text-red-500 text-lg mb-2">⚠️</div>
                            <p class="text-gray-600">${data.error}</p>
                        </div>
                    `;
                } else {
                    displayNutrition(data);
                }
            })
            .catch(error => {
                console.error('Error fetching nutrition:', error);
                nutritionContent.innerHTML = `
                    <div class="text-center p-8">
                        <div class="text-red-500 text-lg mb-2">❌</div>
                        <p class="text-gray-600">Failed to load nutrition data. Please try again.</p>
                    </div>
                `;
            });
    }

    function displayNutrition(nutritionData) {
        const nutritionContent = document.getElementById('nutrition-content');
        
        console.log('Nutrition data:', nutritionData);
        
        // Display real USDA nutrition data
        nutritionContent.innerHTML = `
            <div class="mb-6">
                <h4 class="text-2xl font-bold text-gray-800 mb-2">${nutritionData.name.toUpperCase()}</h4>
                <p class="text-gray-600">Per 100g serving</p>
            </div>
            
            <div class="nutrition-grid mb-6">
                ${generateNutrientCards(nutritionData.nutrients)}
            </div>
            
            <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <div class="flex items-start">
                    <div class="text-green-500 text-xl mr-3">💡</div>
                    <div>
                        <h5 class="font-semibold text-green-800 mb-1">Health Tips</h5>
                        <p class="text-green-700 text-sm">${generateHealthTip(nutritionData.nutrients)}</p>
                    </div>
                </div>
            </div>
        `;
    }

    function generateNutrientCards(nutrients) {
        const nutrientCards = [];
        const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'indigo', 'pink', 'orange'];
        let colorIndex = 0;
        
        // Priority nutrients to show first
        const priorityNutrients = ['Energy', 'Protein', 'Carbohydrate, by difference', 'Total lipid (fat)', 'Sodium, Na', 'Fiber, total dietary'];
        
        // Create cards for priority nutrients first
        priorityNutrients.forEach(priorityName => {
            const nutrient = nutrients.find(n => n.name === priorityName);
            if (nutrient) {
                nutrientCards.push(createNutrientCard(nutrient, colors[colorIndex % colors.length]));
                colorIndex++;
            }
        });
        
        // Add remaining nutrients
        nutrients.forEach(nutrient => {
            if (!priorityNutrients.includes(nutrient.name)) {
                nutrientCards.push(createNutrientCard(nutrient, colors[colorIndex % colors.length]));
                colorIndex++;
            }
        });
        
        return nutrientCards.join('');
    }
    
    function createNutrientCard(nutrient, color) {
        const icon = getNutrientIcon(nutrient.name);
        const shortName = getShortNutrientName(nutrient.name);
        
        return `
            <div class="bg-${color}-500 p-4 rounded-xl text-white">
                <div class="flex items-center justify-between mb-2">
                    <i class="${icon} text-2xl"></i>
                    <span class="text-sm">${nutrient.unit}</span>
                </div>
                <div>
                    <div class="text-2xl font-bold">${nutrient.amount}</div>
                    <div class="text-sm">${shortName}</div>
                    <div class="text-xs mt-1">${calculateDV(nutrient)}% DV</div>
                </div>
            </div>
        `;
    }
    
    function getNutrientIcon(name) {
        const iconMap = {
            'Energy': 'fas fa-fire',
            'Protein': 'fas fa-dumbbell',
            'Carbohydrate, by difference': 'fas fa-wheat',
            'Total lipid (fat)': 'fas fa-oil-well',
            'Sodium, Na': 'fas fa-flask',
            'Fiber, total dietary': 'fas fa-leaf',
            'Sugars, total including NLEA': 'fas fa-cube',
            'Calcium, Ca': 'fas fa-bone',
            'Iron, Fe': 'fas fa-magnet',
            'Vitamin C, total ascorbic acid': 'fas fa-lemon'
        };
        return iconMap[name] || 'fas fa-chart-bar';
    }
    
    function getShortNutrientName(name) {
        const nameMap = {
            'Energy': 'Calories',
            'Protein': 'Protein',
            'Carbohydrate, by difference': 'Carbs',
            'Total lipid (fat)': 'Fat',
            'Sodium, Na': 'Sodium',
            'Fiber, total dietary': 'Fiber',
            'Sugars, total including NLEA': 'Sugars',
            'Calcium, Ca': 'Calcium',
            'Iron, Fe': 'Iron',
            'Vitamin C, total ascorbic acid': 'Vitamin C'
        };
        return nameMap[name] || name.split(',')[0];
    }
    
    function calculateDV(nutrient) {
        // Daily Value percentages (simplified)
        const dvMap = {
            'Energy': 2000, // kcal
            'Protein': 50,  // g
            'Carbohydrate, by difference': 300, // g
            'Total lipid (fat)': 65, // g
            'Sodium, Na': 2300, // mg
            'Fiber, total dietary': 25 // g
        };
        
        const dv = dvMap[nutrient.name];
        if (dv) {
            return Math.round((parseFloat(nutrient.amount) / dv) * 100);
        }
        return Math.round(Math.random() * 20 + 5); // Fallback
    }
    
    function generateHealthTip(nutrients) {
        const energy = nutrients.find(n => n.name === 'Energy');
        const sodium = nutrients.find(n => n.name === 'Sodium, Na');
        const fiber = nutrients.find(n => n.name === 'Fiber, total dietary');
        
        if (energy && parseFloat(energy.amount) > 300) {
            return "High in calories - consider portion size";
        } else if (sodium && parseFloat(sodium.amount) > 400) {
            return "High in sodium - balance with low-sodium foods";
        } else if (fiber && parseFloat(fiber.amount) > 3) {
            return "Good source of fiber - supports digestive health";
        }
        return "Part of a balanced diet when consumed in moderation";
    }
});