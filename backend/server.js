require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 5000;
const { ObjectId } = require('mongodb');
app.use(cors());
app.use(express.json());


console.log('ENV MONGODB_URI:', process.env.MONGODB_URI);

const { GoogleGenAI } = require('@google/genai')

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateRecipe(userIngredients, dietaryRestrictions) {
  const prompt = `
Create a recipe in the following strict JSON format. Only return JSON.
Use the user-provided ingredients and dietary restrictions where possible.
Ensure the image_url, video_url, and website_url are realistic and relevant to the recipe.

IMPORTANT: For all quantities, use decimal numbers instead of fractions (e.g., 0.5 instead of 1/2).
Give atleast 10-15 Instructions for the recipes.
Give priority for Indian dishes.
{
  "name": "<recipe name>",
  "instructions": ["<step1>", "<step2>", "..."],
  "calories_per_serving": <number>,
  "difficulty_level": "<Easy|Medium|Hard>",
  "prep_time": "<time in minutes with 'mins'>",
  "servings": <number>,
  "dietaryRestrictions": ["<e.g. vegetarian, gluten-free, etc.>"],
  "image_url": "<realistic image URL related to the recipe>",
  "video_url": "<YouTube video URL showing how to prepare this recipe>",
  "website_url": "<URL to a website showing step-by-step instructions for this recipe>",
  "ingredients": [
    {
      "name": "<ingredient name>",
      "quantity": <number>,
      "unit": "<g|pieces|cups|tbsp|...>"
    }
  ]
}

User ingredients: ${userIngredients.join(', ')}
User dietary restrictions: ${dietaryRestrictions || 'none'}
`;


  try {
    const result = await ai.models.generateContent({
      model: 'gemini-1.5-flash', // or whatever model you're using
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    console.log('Full API result:', JSON.stringify(result, null, 2));

  if (!result.candidates || result.candidates.length === 0) {
  throw new Error('No candidates in response');
}
const text = result.candidates[0].content.parts[0].text;


    // Clean JSON if it's wrapped in backticks
    const cleaned = text.startsWith('```')
      ? text.replace(/^```json\n?|```[\s\n]?$/g, '').trim()
      : text;

    return cleaned;
  } catch (error) {
    console.error('❌ Error generating recipe:', error);
    throw new Error('Failed to generate recipe');
  }
}




const client = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000
});
let db;

async function connectToMongoDB() {
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    db = client.db('cookai');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
}


app.post('/api/recipes', async (req, res) => {
  try {
    const { ingredients, dietaryRestrictions } = req.body;

    console.log('👉 Incoming ingredients:', ingredients);
    console.log('👉 Incoming restrictions:', dietaryRestrictions);

    const result = await generateRecipe(ingredients, dietaryRestrictions);
    const recipeJson = JSON.parse(result); // parse from Gemini output

    // Save parsed recipe to MongoDB
    await db.collection('recipes').insertOne({
      ...recipeJson,
      createdAt: new Date()
    });

    res.json({ recipe: recipeJson });

  } catch (error) {
    console.error('❌ Recipe generation error:', error);
    res.status(500).json({ error: 'Failed to generate recipe' });
  }
});


// Health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is healthy' });
  });

// ---

// ---

// Add this route for adding user-submitted recipes
// ADD THESE ROUTES TO YOUR EXISTING BACKEND FILE

// Add this route for adding user-submitted recipes
app.post('/api/recipes/add', async (req, res) => {
  try {
    console.log('👉 Received recipe submission:', req.body);

    const {
      name,
      ingredients,
      instructions,
      calories_per_serving,
      difficulty_level,
      prep_time,
      servings,
      dietaryRestrictions,
      userEmail
    } = req.body;

    // Validation
    if (!name || !ingredients || !instructions || !calories_per_serving || !difficulty_level || !prep_time || !servings || !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one ingredient is required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Create recipe object
    const newRecipe = {
      name: name.trim(),
      ingredients: ingredients,
      instructions: Array.isArray(instructions) ? instructions : instructions.split('\n').filter(step => step.trim()),
      calories_per_serving: parseInt(calories_per_serving),
      difficulty_level: difficulty_level,
      prep_time: prep_time.trim(),
      servings: parseInt(servings),
      dietaryRestrictions: dietaryRestrictions || [],
      userEmail: userEmail.toLowerCase().trim(),
      image_url: "https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=400", // Default image
      video_url: "", // Can be empty
      website_url: "", // Can be empty
      createdAt: new Date(),
      isUserSubmitted: true // Flag to identify user-submitted recipes
    };

    // Save to the 'user_recipes' collection
    const result = await db.collection('user_recipes').insertOne(newRecipe); // <-- CHANGE MADE HERE

    console.log('✅ Recipe saved successfully:', result.insertedId);

    res.status(201).json({
      success: true,
      message: 'Recipe added successfully! Thank you for your contribution.',
      recipeId: result.insertedId
    });

  } catch (error) {
    console.error('❌ Error saving user recipe:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save recipe. Please try again.'
    });
  }
});

// Add this route to get user-submitted recipes
app.get('/api/recipes/user-submitted', async (req, res) => {
  try {
    const userRecipes = await db.collection('recipes')
      .find({ isUserSubmitted: true })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      count: userRecipes.length,
      recipes: userRecipes
    });
  } catch (error) {
    console.error('❌ Error fetching user recipes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user recipes'
    });
  }
});

// Add this route to get recipes by email (for users to see their submissions)
// Add this route to get recipes by email (for users to see their submissions)
app.get('/api/recipes/my-recipes/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const userRecipes = await db.collection('user_recipes') // <-- CHANGE MADE HERE
      .find({
        userEmail: email.toLowerCase(),
        isUserSubmitted: true // This is still good to keep for clarity, though it's assumed all in 'user_recipes' are user-submitted.
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      count: userRecipes.length,
      recipes: userRecipes
    });
  } catch (error) {
    console.error('❌ Error fetching user\'s recipes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your recipes'
    });
  }
});

// Add this route for contact form (since it's referenced in your frontend)
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Save contact message to database
    const contactMessage = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      message: message.trim(),
      createdAt: new Date()
    };

    await db.collection('contact_messages').insertOne(contactMessage);

    console.log('✅ Contact message saved:', contactMessage);

    res.json({
      success: true,
      message: 'Thank you for your message! We will get back to you soon.'
    });

  } catch (error) {
    console.error('❌ Error saving contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again.'
    });
  }
});


// MODIFY YOUR EXISTING /api/recipes GET ROUTE TO INCLUDE USER RECIPES
// Replace your existing app.get('/api/recipes', ...) with this updated version:
app.get('/api/recipes', async (req, res) => {
    try {
      // Extract ingredients and restrictions from query params
      const ingredients = (req.query.ingredients || '')
        .split(',')
        .map(i => i.trim().toLowerCase())
        .filter(Boolean);

      const restriction = (req.query.restrictions || '')
        .toLowerCase()
        .trim();

      // Build MongoDB filter
      const filter = {};

      if (ingredients.length) {
        // Search in both AI-generated and user-submitted recipes
        filter.$or = [
          { 'ingredients.name': { $in: ingredients } }, // AI-generated recipes (assuming 'ingredients' is an array of objects with a 'name' field)
          { // For user-submitted recipes where ingredients might be a simple array of strings
            ingredients: {
              $elemMatch: {
                name: { $in: ingredients }
              }
            }
          }
        ];
      }

      if (restriction && restriction !== 'all') {
        filter.dietaryRestrictions = restriction;
      }

      // Return filtered recipe list (both AI and user-submitted)
      const recipes = await db.collection('recipes')
        .find(filter)
        .project({
          name: 1,
          image_url: 1,
          prep_time: 1,
          servings: 1,
          calories_per_serving: 1,
          dietaryRestrictions: 1,
          isUserSubmitted: 1,
          userEmail: 1
        })
        .toArray();

      res.json(recipes);
    } catch (error) {
      console.log('❌ Error fetching recipes:', error);
      res.status(500).json({ error: 'Failed to fetch recipes' });
    }
  });


app.get('/api/recipes/random', async (req, res) => {
    try {
      const randomRecipe = await db.collection('recipes')
        .aggregate([
          { $sample: { size: 1 } }, // Select 1 random document
          {
            $project: {
              name: 1,
              image_url: 1,
              prep_time: 1,
              servings: 1,
              calories_per_serving: 1,
              dietaryRestrictions: 1,
              ingredients: 1,
              instructions: 1
            }
          }
        ])
        .toArray();


      if (!randomRecipe.length) {
        return res.status(404).json({ error: 'No recipes found' });
      }

      res.json(randomRecipe[0]);
    } catch (error) {
      console.error('❌ Error fetching random recipe:', error);
      res.status(500).json({ error: 'Failed to fetch random recipe' });
    }
  });

  app.get('/api/recipes/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ObjectId if you're using MongoDB
      console.log(id);
      const recipe = await db.collection('recipes').findOne({ _id: new ObjectId(id) });

      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      res.json(recipe);
    } catch (error) {
      console.error('❌ Error fetching recipe by ID:', error);
      res.status(500).json({ error: 'Failed to fetch recipe' });
    }
  });

  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is healthy' });
  });

  app.get('/api/generate', async (req, res) => {
    try {
      const ingredients = (req.query.ingredients || '')
        .split(',')
        .map(i => i.trim().toLowerCase())
        .filter(Boolean);

      const restriction = (req.query.restrictions || '')
        .toLowerCase()
        .trim();

      const result = await generateRecipe(ingredients, restriction);
      console.log(result);

      res.json({ recipe: result }); // <<< send response properly!
    } catch (error) {
      console.error('Error generating recipe:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


connectToMongoDB().then(() => {
  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
});



// Catch all unexpected errors
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);