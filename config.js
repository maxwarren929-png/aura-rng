// config.js — Set your Render API URL here before deploying
export const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api'
  : 'https://aura-rng-api.onrender.com/api'; // <-- replace with your actual Render API URL
