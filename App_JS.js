const ingredients = [
    // Vegetables
    "Tomato", "Onion", "Garlic", "Potato", "Carrot", "Pepper", "Ginger", "Coriander",
    "Zucchini", "Lemon", "Bell Pepper", "Spinach", "Cucumber", "Lettuce", "Avocado",
    "Broccoli", "Peas", "Corn", "Brinjal", "Cauliflower", "Radish", "Capsicum",
    "Cabbage", "Chili", "Mushroom", "Curry leaves", "Beetroot", "Turnip", "Pumpkin",
    "Sweet Potato", "Okra", "Green Beans", "Leeks", "Spring Onion", "Fenugreek Leaves",
    "Kale", "Artichoke", "Celery", "Asparagus",

    // Fruits
    "Apple", "Banana", "Mango", "Pineapple", "Orange", "Grapes", "Pomegranate", "Papaya",
    "Pear", "Strawberry", "Blueberry", "Coconut", "Guava", "Watermelon", "Kiwi", "Lime",

    // Grains & Cereals
    "Rice", "Pasta", "Bread", "Wheat Flour", "Maida", "Rava", "Semolina", "Oats",
    "Millets", "Barley", "Quinoa", "Cornmeal", "Noodles", "Bulgur", "Couscous",

    // Dairy & Eggs
    "Milk", "Cheese", "Butter", "Curd", "Yogurt", "Cream", "Paneer", "Ghee", "Eggs",

    // Meats & Seafood
    "Chicken", "Beef", "Fish", "Pork", "Mutton", "Prawns", "Crab", "Lobster", "Turkey",
    "Duck", "Ham", "Bacon", "Sausage",

    // Legumes & Pulses
    "Kidney beans", "Urad dal", "Chana dal", "Moong dal", "Toor dal", "Masoor dal",
    "Black beans", "Lentils", "Chickpeas", "Green gram", "Soybeans", "Peanuts",

    // Spices & Condiments
    "Turmeric", "Chili Powder", "Cumin", "Coriander Powder", "Garam Masala", "Black Pepper",
    "Cardamom", "Cinnamon", "Cloves", "Nutmeg", "Mustard Seeds", "Asafoetida", "Fenugreek Seeds",
    "Curry Powder", "Paprika", "Saffron", "Bay Leaf", "Fennel Seeds", "Dry Mango Powder",
    "Salt", "Sugar", "Jaggery", "Vinegar", "Soy Sauce", "Tomato Paste", "Ketchup", "Mayonnaise",
    "Honey", "Tamarind", "Pickle", "Green Chutney", "Mint Chutney",

    // Oils & Fats
    "Olive oil", "Vegetable oil", "Sunflower oil", "Canola oil", "Sesame oil", "Mustard oil",
    "Coconut oil", "Groundnut oil", "Ghee",

    // Others
    "Yeast", "Baking Soda", "Baking Powder", "Gelatin", "Corn Flour", "Rice Flour",
    "Tapioca", "Vermicelli", "Nuts", "Raisins", "Almonds", "Cashews", "Walnuts",
    "Pine Nuts", "Poppy Seeds", "Chia Seeds", "Flax Seeds", "Sesame Seeds", "Bread Crumbs",
    "Tofu", "Tempeh", "Soya Chunks"
];

const searchInput = document.getElementById("ingredientSearch");
const dropdown = document.getElementById("dropdown");
const selectedContainer = document.getElementById("selectedIngredients");
const loading = document.getElementById("loading");
let selectedIngredients = [];
let activeFilters = [];
let minCalories = null;
let maxCalories = null;

// Connection status management
const connectionStatus = document.getElementById('connection-status');
const statusDot = connectionStatus?.querySelector('.status-dot'); // Use optional chaining for safety
const statusText = connectionStatus?.querySelector('.status-text'); // Use optional chaining for safety

// Function to show/hide sections
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.main-content > div').forEach(section => {
        section.classList.add('hidden');
    });

    // Show the selected section
    const target = document.getElementById(`${sectionId}-section`);
    if (target) {
        target.classList.remove('hidden');
    }

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Add active class based on matching section
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('onclick')?.includes(`showSection('${sectionId}')`)) {
            link.classList.add('active');
        }
    });
}


// Function to handle ingredient search
if (searchInput) { // Ensure searchInput exists
    searchInput.addEventListener("input", function () {
        const query = searchInput.value.toLowerCase();
        if (dropdown) { // Ensure dropdown exists
            dropdown.innerHTML = "";

            const filtered = ingredients.filter(ing => ing.toLowerCase().includes(query));

            if (filtered.length === 0) {
                dropdown.classList.add('hidden');
                return;
            }

            filtered.forEach(ing => {
                const item = document.createElement("li");
                item.textContent = ing;
                item.addEventListener("click", () => selectIngredient(ing));
                dropdown.appendChild(item);
            });

            dropdown.classList.remove("hidden");
            positionDropdown();
        }
    });
}


// Function to select ingredient
function selectIngredient(ingredient) {
    if (!selectedIngredients.includes(ingredient)) {
        selectedIngredients.push(ingredient);
        updateSelectedIngredients();
    }
    if (searchInput) searchInput.value = ""; // Ensure searchInput exists
    if (dropdown) dropdown.classList.add("hidden"); // Ensure dropdown exists
}

// Function to update selected ingredients display
function updateSelectedIngredients() {
    const container = document.getElementById('selectedIngredients');
    if (container) { // Ensure container exists
        container.innerHTML = selectedIngredients.map(ingredient => `
            <div class="ingredient-tag">
                ${ingredient}
                <button onclick="removeIngredient('${ingredient}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
}

// Function to remove ingredient
function removeIngredient(ingredient) {
    selectedIngredients = selectedIngredients.filter(i => i !== ingredient);
    updateSelectedIngredients();
}

// Function to apply filters
function filterRecipes(filter) {
    const buttons = document.querySelectorAll('.filter-button');
    buttons.forEach(button => button.classList.remove('active'));
    // Use `this` or pass event.target if calling directly from HTML onClick
    // For JavaScript-driven calls, you might need to adjust
    // For simplicity, assuming `event` is accessible if called from HTML `onclick`
    // If not, you'll need to pass the clicked element or get it differently.
    // Example: If called like `filterRecipes('vegan', event)` and in HTML `onclick="filterRecipes('vegan', event)"`
    // For now, assuming `event.target` refers to the button
    if (event && event.target) {
        event.target.classList.add('active');
    }


    if (filter === 'all') {
        activeFilters = [];
    } else {
        activeFilters = [filter];
    }

    // Check if there are any selected ingredients
    const selectedIngredientsDiv = document.getElementById('selectedIngredients');
    const ingredientsInDiv = selectedIngredientsDiv ? Array.from(selectedIngredientsDiv.querySelectorAll('.ingredient-tag')).map(tag => tag.textContent.trim()) : [];

    if (ingredientsInDiv.length === 0) {
        const recipeList = document.getElementById('recipe-list');
        if (recipeList) {
            recipeList.innerHTML = '<p class="text-center text-gray-500">Please select at least one ingredient to find recipes.</p>';
        }
        return;
    }

    searchRecipes();
}

// Function to apply calorie filter
function applyCalorieFilter() {
    minCalories = document.getElementById('minCalories')?.value;
    maxCalories = document.getElementById('maxCalories')?.value;
    searchRecipes();
}

// Function to display recipes
function displayRecipes(recipes) {
    const recipeList = document.getElementById('recipe-list');
    if (!recipeList) return; // Exit if recipeList element doesn't exist

    recipeList.innerHTML = '';

    if (!recipes || recipes.length === 0) {
        recipeList.innerHTML = '<p class="text-center text-gray-500">No recipes found. Try adjusting your filters.</p>';
        return;
    }

    recipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'recipe-card';

        const image = recipe.image_url ? `<img src="${recipe.image_url}" alt="${recipe.title}" class="recipe-image">` : '';

        card.innerHTML = `
            ${image}
            <div class="recipe-content">
                <h3 class="recipe-title">${recipe.title}</h3>
                <div class="recipe-meta">
                    <span><i class="fas fa-clock"></i> ${recipe.prep_time}</span>
                    <span><i class="fas fa-fire"></i> ${recipe.calories} cal</span>
                    <span><i class="fas fa-utensils"></i> ${recipe.servings} servings</span>
                </div>
                <p class="recipe-description">${recipe.instructions.substring(0, 150)}...</p>
                <div class="recipe-tags">
                    ${recipe.dietary_restrictions.map(restriction =>
                        `<span class="tag">${restriction}</span>`
                    ).join('')}
                </div>
            </div>
        `;

        recipeList.appendChild(card);
    });
}

// Function to check connection
async function checkConnection() {
    try {
        const response = await fetch('http://localhost:5000/api/health');
        if (response.ok) {
            if (statusDot) {
                statusDot.classList.remove('disconnected');
                statusDot.classList.add('connected');
            }
            if (statusText) statusText.textContent = 'Connected to server';
            return true;
        }
    } catch (error) {
        if (statusDot) {
            statusDot.classList.remove('connected');
            statusDot.classList.add('disconnected');
        }
        if (statusText) statusText.textContent = 'Server disconnected';
        return false;
    }
}

// Function to fetch recipes from the API
async function fetchRecipes() {
    try {
        // Get selected ingredients
        const ingredientsQuery = selectedIngredients.map(ing => ing).join(',');

        // Get active filter for restrictions
        const activeFilterButton = Array.from(document.querySelectorAll('.filter-button'))
            .find(btn => btn.classList.contains('active'));

        let restrictions = 'all';
        if (activeFilterButton) {
            const onclickAttr = activeFilterButton.getAttribute('onclick');
            const match = onclickAttr?.match(/'([^']+)'/);
            if (match && match[1]) {
                restrictions = match[1];
            }
        }
        restrictions = restrictions === 'all' ? '' : restrictions;


        console.log('Fetching recipes with:', { ingredients: ingredientsQuery, restrictions });

        const res = await fetch(
            `http://localhost:5000/api/recipes?ingredients=${encodeURIComponent(ingredientsQuery)
            }&restrictions=${encodeURIComponent(restrictions)}`);

        if (!res.ok) {
            throw new Error(`API responded with status: ${res.status}`);
        }

        const recipes = await res.json();
        console.log('Received recipes:', recipes);

        renderRecipeCards(recipes);
    } catch (error) {
        console.error('Error in fetchRecipes:', error);
        const container = document.getElementById('recipe-cards');
        if (container) {
            container.innerHTML = `<p class="error-message">An error occurred while fetching recipes: ${error.message}</p>`;
        }
    }
}

// Function to render recipe cards
function renderRecipeCards(recipes) {
    const container = document.getElementById('recipe-cards');
    if (!container) return; // Exit if container doesn't exist

    container.innerHTML = ''; // Clear previous cards

    const recipeList = Array.isArray(recipes) ? recipes : [recipes];

    recipeList.forEach(r => {
        if (!r) return; // Skip null/undefined

        const card = document.createElement('div');
        card.className = 'recipe-card';

        card.innerHTML = `
            <img src="${r.image_url || ''}" alt="${r.name || 'Recipe'}" />
            <h3>${r.name || 'Unknown Recipe'}</h3>
            <ul class="meta">
                <li>${r.prep_time || 'N/A'}</li>
                <li>${r.calories_per_serving ? r.calories_per_serving + ' cal' : 'N/A'}</li>
                <li>${r.servings ? r.servings + ' servings' : 'N/A'}</li>
            </ul>
            <p>${(r.dietaryRestrictions || []).join(', ')}</p>
        `;

        card.onclick = () => location.href = `/recipe.html?id=${r._id}`;
        container.appendChild(card);
    });
}

// Function to search recipes
async function searchRecipes() {
    const loadingElement = document.getElementById('loading'); // Renamed to avoid conflict with global 'loading'
    const recipeCards = document.getElementById('recipe-cards');

    // Check if there are any selected ingredients
    if (selectedIngredients.length === 0) {
        if (recipeCards) {
            recipeCards.innerHTML = '<p class="text-center text-gray-500">Please select at least one ingredient to find recipes.</p>';
        }
        return;
    }

    // Show loading state
    if (loadingElement) loadingElement.classList.remove('hidden');
    if (recipeCards) recipeCards.innerHTML = '';

    // Check connection first
    const isConnected = await checkConnection();
    if (!isConnected) {
        if (loadingElement) loadingElement.classList.add('hidden');
        if (recipeCards) recipeCards.innerHTML = '<p class="error-message">Unable to connect to server. Please try again later.</p>';
        return;
    }

    try {
        // Fetch and render recipes
        await fetchRecipes();

        // Hide loading state
        if (loadingElement) loadingElement.classList.add('hidden');
    } catch (error) {
        console.error('Error fetching recipes:', error);
        if (loadingElement) loadingElement.classList.add('hidden');
        if (recipeCards) recipeCards.innerHTML = '<p class="error-message">An error occurred while fetching recipes. Please try again.</p>';
    }
}

async function getRandomRecipe() {
    const loadingElement = document.getElementById('loading'); // Renamed
    const recipeCards = document.getElementById('recipe-cards');

    // Show loading state
    if (loadingElement) loadingElement.classList.remove('hidden');
    if (recipeCards) recipeCards.innerHTML = '';

    // Check connection first
    const isConnected = await checkConnection();
    if (!isConnected) {
        if (loadingElement) loadingElement.classList.add('hidden');
        if (recipeCards) recipeCards.innerHTML = '<p class="error-message">Unable to connect to server. Please try again later.</p>';
        return;
    }

    try {
        // Fetch a random recipe
        const response = await fetch(
            `http://localhost:5000/api/recipes/random`);
        if (!response.ok) throw new Error('Failed to fetch random recipe');

        const recipe = await response.json();

        // Render the random recipe
        renderRecipeCards(recipe);

        // Hide loading state
        if (loadingElement) loadingElement.classList.add('hidden');
    } catch (error) {
        console.error('Error fetching random recipe:', error);
        if (loadingElement) loadingElement.classList.add('hidden');
        if (recipeCards) recipeCards.innerHTML = '<p class="error-message">An error occurred while fetching the recipe. Please try again.</p>';
    }
}

async function getGenerateRecipe() {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingMessage = document.getElementById('loading-message');

    // Show loading screen and update message
    if (loadingScreen) loadingScreen.classList.remove('hidden');

    try {
        const ingredientsQuery = selectedIngredients.map(ing => ing).join(',');

        // Get active filter for restrictions
        const activeFilterButton = Array.from(document.querySelectorAll('.filter-button'))
            .find(btn => btn.classList.contains('active'));

        let restrictions = 'all';
        if (activeFilterButton) {
            const onclickAttr = activeFilterButton.getAttribute('onclick');
            const match = onclickAttr?.match(/'([^']+)'/);
            if (match && match[1]) {
                restrictions = match[1];
            }
        }
        restrictions = restrictions === 'all' ? '' : restrictions;

        const response = await fetch(
            `http://localhost:5000/api/generate?ingredients=${encodeURIComponent(ingredientsQuery)}&restrictions=${encodeURIComponent(restrictions)}`
        );

        if (!response.ok) throw new Error('Failed to fetch recipe');

        const recipe = await response.json();

        // Store recipe in sessionStorage to pass data between pages
        sessionStorage.setItem('data', JSON.stringify(recipe));

        // Hide loading screen before navigation (optional, since page will change)
        if (loadingScreen) loadingScreen.classList.add('hidden');

        // Navigate to the next page
        location.href = `/showAIRecipe.html`;

    } catch (error) {
        if (loadingScreen) loadingScreen.classList.add('hidden');
        alert("Oops! There was an error fetching the recipe: " + error.message);
    }
}

// Function to show recipe details
function showRecipeDetails(recipeId) {
    window.location.href = `recipe.html?id=${recipeId}`;
}

// Function to toggle mobile menu
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        navLinks.classList.toggle('active');
    }
}

// Function to handle dropdown positioning
function positionDropdown() {
    const searchInput = document.getElementById('ingredientSearch');
    const dropdown = document.getElementById('dropdown');

    if (searchInput && dropdown) {
        const inputRect = searchInput.getBoundingClientRect();
        // const containerRect = searchInput.parentElement.getBoundingClientRect(); // Not used currently

        dropdown.style.top = `${inputRect.height + 5}px`;
        dropdown.style.left = '0';
        dropdown.style.width = '100%';
    }
}

// Function to fetch and display recipes (for initial load of main page)
async function fetchAndDisplayRecipes() {
    const loadingElement = document.getElementById('loading'); // Renamed
    if (loadingElement) loadingElement.classList.remove('hidden');

    try {
        const response = await fetch('http://localhost:5000/api/recipes');
        if (!response.ok) {
            throw new Error('Failed to fetch recipes');
        }

        const recipes = await response.json();
        displayRecipes(recipes);
    } catch (error) {
        console.error('Error fetching recipes:', error);
        const recipeList = document.getElementById('recipe-list');
        if (recipeList) {
            recipeList.innerHTML = '<p class="text-center text-red-500">Error loading recipes. Please try again later.</p>';
        }
    } finally {
        if (loadingElement) loadingElement.classList.add('hidden');
    }
}

// --- Initialize form handling when DOM is loaded ---
function initializeAddRecipeForm() {
    const form = document.getElementById('addRecipeForm');
    const ingredientInput = document.getElementById('ingredientInput');
    const ingredientDropdown = document.getElementById('ingredientDropdown');
    const selectedRecipeIngredients = document.getElementById('selectedRecipeIngredients');
    const hiddenIngredientsInput = document.getElementById('ingredients');

    let selectedRecipeIngredientsList = [];

    // Use your existing ingredients array
    const availableIngredients = ingredients;

    // --- Helper functions ---

    // Function to add an ingredient to the selected list and update UI
    function addRecipeIngredient(ingredient) {
        console.log('Attempting to add ingredient:', ingredient);
        if (!selectedRecipeIngredientsList.includes(ingredient)) { // Prevent duplicates
            selectedRecipeIngredientsList.push(ingredient);
            console.log('selectedRecipeIngredientsList after push:', selectedRecipeIngredientsList);
            updateSelectedRecipeIngredients(); // Update the display
            if (ingredientInput) ingredientInput.value = ''; // Clear the input field
            if (ingredientDropdown) ingredientDropdown.classList.add('hidden'); // Hide dropdown after selection
        } else {
            console.log('Ingredient already selected:', ingredient);
        }
    }

    // Function to remove an ingredient from the selected list and update UI
    function removeRecipeIngredient(ingredientToRemove) {
        console.log('Attempting to remove ingredient:', ingredientToRemove);
        selectedRecipeIngredientsList = selectedRecipeIngredientsList.filter(item => item !== ingredientToRemove);
        console.log('selectedRecipeIngredientsList after filter:', selectedRecipeIngredientsList);
        updateSelectedRecipeIngredients(); // Update the display
    }

    // Function to update the HTML display and the hidden input
    function updateSelectedRecipeIngredients() {
        console.log('Updating selected ingredients UI. Current list:', selectedRecipeIngredientsList);
        if (selectedRecipeIngredients) { // Ensure element exists
            selectedRecipeIngredients.innerHTML = ''; // Clear previous display

            if (selectedRecipeIngredientsList.length > 0) {
                selectedRecipeIngredientsList.forEach(ingredient => {
                    const tag = document.createElement('span');
                    tag.classList.add('ingredient-tag'); // Apply CSS for styling
                    tag.innerHTML = `${ingredient} <button type="button" class="remove-ingredient-btn" data-ingredient="${ingredient}"><i class="fas fa-times"></i></button>`;
                    selectedRecipeIngredients.appendChild(tag);
                    console.log('Appended tag for:', ingredient);
                });
            } else {
                console.log('selectedRecipeIngredientsList is empty, clearing UI.');
            }
        }


        // Update the value of the hidden input field for form submission
        if (hiddenIngredientsInput) { // Ensure element exists
            hiddenIngredientsInput.value = JSON.stringify(selectedRecipeIngredientsList);
            console.log('Hidden input value:', hiddenIngredientsInput.value);
        }


        // Re-filter dropdown options based on new selected list
        // This is important so selected ingredients don't show up in the dropdown anymore
        if (ingredientInput && ingredientDropdown) { // Ensure elements exist
            const query = ingredientInput.value.toLowerCase();
            if (query.length >= 2) {
                const filtered = availableIngredients.filter(ingredient =>
                    ingredient.toLowerCase().includes(query) &&
                    !selectedRecipeIngredientsList.includes(ingredient)
                );
                if (filtered.length > 0) {
                    ingredientDropdown.innerHTML = filtered
                        .map(ingredient => `<li class="dropdown-item" data-ingredient="${ingredient}">${ingredient}</li>`)
                        .join('');
                    ingredientDropdown.classList.remove('hidden');
                } else {
                    ingredientDropdown.classList.add('hidden');
                }
            } else {
                ingredientDropdown.classList.add('hidden'); // Hide if query is short
            }
        }
    }

    // Collect form data for add recipe
    function collectAddRecipeFormData() {
        const dietaryRestrictions = Array.from(
            document.querySelectorAll('input[name="dietary_restrictions"]:checked')
        ).map(checkbox => checkbox.value);

        const recipeTitle = document.getElementById('recipeTitle')?.value.trim();
        const instructions = document.getElementById('instructions')?.value.trim().split('\n').filter(step => step.trim());
        const calories = parseInt(document.getElementById('calories')?.value);
        const difficulty = document.getElementById('difficulty')?.value;
        const prepTime = document.getElementById('prepTime')?.value.trim();
        const servings = parseInt(document.getElementById('servings')?.value);
        const userEmail = document.getElementById('userEmail')?.value.trim();


        return {
            name: recipeTitle,
            // Ingredients are taken from the 'selectedRecipeIngredientsList'
            ingredients: selectedRecipeIngredientsList.map(ing => ({
                name: ing.toLowerCase(),
                quantity: 1, // Default or prompt user for quantity in the future
                unit: "piece" // Default or prompt user for unit in the future
            })),
            instructions: instructions,
            calories_per_serving: calories,
            difficulty_level: difficulty,
            prep_time: prepTime,
            servings: servings,
            dietaryRestrictions: dietaryRestrictions,
            userEmail: userEmail,
            createdAt: new Date().toISOString(),
            isUserSubmitted: true // Ensure this flag is set for user submissions
        };
    }

    // Form validation for add recipe
    function validateAddRecipeForm(data) {
        if (!data.name) {
            showErrorMessage('Recipe title is required');
            return false;
        }

        if (data.ingredients.length === 0) {
            showErrorMessage('At least one ingredient is required');
            return false;
        }

        if (!data.instructions || data.instructions.length === 0) {
            showErrorMessage('Instructions are required');
            return false;
        }

        if (isNaN(data.calories_per_serving) || data.calories_per_serving < 0) {
            showErrorMessage('Valid calories value is required');
            return false;
        }

        if (isNaN(data.servings) || data.servings < 1) {
            showErrorMessage('Valid number of servings is required');
            return false;
        }

        if (!data.userEmail || !isValidEmail(data.userEmail)) { // Assuming isValidEmail is defined elsewhere
            showErrorMessage('Valid email address is required');
            return false;
        }

        return true;
    }

    // Submit recipe to server using your existing backend
    async function submitRecipe(recipeData) {
        const response = await fetch('http://localhost:5000/api/recipes/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(recipeData)
        });

        return await response.json();
    }

    // --- Event Listeners ---

    // Ingredient input handling for add recipe form
    if (ingredientInput) {
        ingredientInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();

            if (query.length < 2) {
                if (ingredientDropdown) ingredientDropdown.classList.add('hidden');
                return;
            }

            const filtered = availableIngredients.filter(ingredient =>
                ingredient.toLowerCase().includes(query) &&
                !selectedRecipeIngredientsList.includes(ingredient)
            );

            if (filtered.length > 0) {
                if (ingredientDropdown) {
                    ingredientDropdown.innerHTML = filtered
                        .map(ingredient => `<li class="dropdown-item" data-ingredient="${ingredient}">${ingredient}</li>`)
                        .join('');
                    ingredientDropdown.classList.remove('hidden');
                }
            } else {
                if (ingredientDropdown) ingredientDropdown.classList.add('hidden');
            }
        });

        // Ingredient selection (using .closest for robustness)
        if (ingredientDropdown) {
            ingredientDropdown.addEventListener('click', function(e) {
                const clickedItem = e.target.closest('.dropdown-item');
                if (clickedItem) {
                    const ingredient = clickedItem.dataset.ingredient;
                    console.log('Dropdown item clicked:', ingredient); // Debug log
                    addRecipeIngredient(ingredient); // This now has access to ingredientInput etc.
                } else {
                    console.log('Clicked element is not a dropdown item:', e.target); // Debug log
                }
            });

            // Hide dropdown when input loses focus (blur)
            ingredientInput.addEventListener('blur', function() {
                setTimeout(() => {
                    if (ingredientDropdown) ingredientDropdown.classList.add('hidden');
                }, 150);
            });

            // Show dropdown when input gains focus (if there's content)
            ingredientInput.addEventListener('focus', function() {
                if (this.value.length >= 2 && ingredientDropdown.children.length > 0) {
                    ingredientDropdown.classList.remove('hidden');
                }
            });
        }
    }

    // Remove ingredient from recipe form by clicking the 'x'
    if (selectedRecipeIngredients) {
        selectedRecipeIngredients.addEventListener('click', function(e) {
            // Use .closest() to find the button even if an icon inside it is clicked
            const removeButton = e.target.closest('.remove-ingredient-btn');
            if (removeButton) {
                const ingredient = removeButton.dataset.ingredient;
                removeRecipeIngredient(ingredient);
            }
        });
    }


    // Form submission for add recipe
    if (form) {
        form.addEventListener('submit', async function(e) {
            console.log('Form submission event triggered!');
            e.preventDefault(); // Prevent default form submission

            const formData = collectAddRecipeFormData();

            if (!validateAddRecipeForm(formData)) {
                return;
            }

            try {
                const response = await submitRecipe(formData);
                if (response.success) {
                    showSuccessMessage('Recipe added successfully!');
                    form.reset();
                    selectedRecipeIngredientsList = []; // Clear selected ingredients list
                    updateSelectedRecipeIngredients(); // Clear displayed selected ingredients
                } else {
                    showErrorMessage(response.message || 'Failed to add recipe');
                }
            } catch (error) {
                console.error('Error submitting recipe:', error);
                showErrorMessage('An error occurred while adding the recipe');
            }
        });
    }

    // Initial call to ensure display is empty on load if no ingredients are pre-selected
    updateSelectedRecipeIngredients();
}

// Utility functions (defined globally)
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showSuccessMessage(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background-color: #10b981;
        color: white;
        border-radius: 5px;
        font-weight: bold;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showErrorMessage(message) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background-color: #ef4444;
        color: white;
        border-radius: 5px;
        font-weight: bold;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// --- Consolidated DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize the main section and dropdown for ingredient search
    showSection('home');
    positionDropdown();

    // Initialize the Add Recipe Form functionalities
    initializeAddRecipeForm();

    // Check connection status
    await checkConnection();

    // Add window resize listener for dropdown positioning
    window.addEventListener('resize', positionDropdown);

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        const mainSearchDropdown = document.getElementById('dropdown');
        const mainSearchInput = document.getElementById('ingredientSearch');
        const recipeIngredientDropdown = document.getElementById('ingredientDropdown');
        const recipeIngredientInput = document.getElementById('ingredientInput');

        // Check and hide the main recipe search dropdown
        if (mainSearchDropdown && mainSearchInput && !mainSearchDropdown.contains(e.target) && e.target !== mainSearchInput) {
            mainSearchDropdown.classList.add('hidden');
        }

        // Check and hide the add recipe ingredient dropdown
        if (recipeIngredientDropdown && recipeIngredientInput && !recipeIngredientDropdown.contains(e.target) && e.target !== recipeIngredientInput) {
            recipeIngredientDropdown.classList.add('hidden');
        }
    });

    // Initial fetch of recipes for the home section (optional, if you want to show recipes on load)
    fetchAndDisplayRecipes();
});