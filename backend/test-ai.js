// Simple test to verify AI service loading
require('dotenv').config();

const { aiService } = require('./dist/services/aiService');

console.log('Testing AI service...');
console.log('AI service available:', aiService.isAvailable());
console.log('OpenAI API key configured:', !!process.env.OPENAI_API_KEY);

if (process.env.OPENAI_API_KEY) {
  console.log('✅ OpenAI API key is configured');
} else {
  console.log('❌ OpenAI API key is not configured');
  console.log('Please set OPENAI_API_KEY in your .env file');
}

console.log('AI service test completed!');