// api.js — Frontend API client
import { API_BASE } from './config.js';

class ApiClient {
  constructor() {
    this._token = null;
    this._username = null;
    this._id = null;
  }

  init() {
    this._token = localStorage.getItem('aura_token');
    this._username = localStorage.getItem('aura_username');
    this._id = localStorage.getItem('aura_player_id');
  }

  get token() { return this._token; }
  get username() { return this._username; }
  get playerId() { return this._id; }
  get loggedIn() { return !!this._token; }

  setAuth(token, username, id) {
    this._token = token;
    this._username = username;
    this._id = String(id);
    localStorage.setItem('aura_token', token);
    localStorage.setItem('aura_username', username);
    localStorage.setItem('aura_player_id', String(id));
  }

  logout() {
    this._token = null;
    this._username = null;
    this._id = null;
    localStorage.removeItem('aura_token');
    localStorage.removeItem('aura_username');
    localStorage.removeItem('aura_player_id');
  }

  async _req(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (this._token) headers['Authorization'] = `Bearer ${this._token}`;
    let res;
    try {
      res = await fetch(API_BASE + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error('Could not reach server');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // Auth
  async register(username, password) {
    const data = await this._req('POST', '/auth/register', { username, password });
    this.setAuth(data.token, data.username, data.id);
    return data;
  }

  async login(username, password) {
    const data = await this._req('POST', '/auth/login', { username, password });
    this.setAuth(data.token, data.username, data.id);
    return data;
  }

  // Chat
  async getChat(before) {
    const q = before ? `?before=${before}` : '';
    return this._req('GET', `/chat${q}`);
  }

  async sendChat(message) {
    return this._req('POST', '/chat', { message });
  }

  // Profile
  async getProfile(username) {
    return this._req('GET', `/profile/${encodeURIComponent(username)}`);
  }

  async updateProfile(data) {
    return this._req('PATCH', '/profile', data);
  }

  async getLeaderboard() {
    return this._req('GET', '/profile');
  }

  // Trades
  async getTrades() {
    return this._req('GET', '/trades');
  }

  async getMyTrades() {
    return this._req('GET', '/trades/mine');
  }

  async createTrade(auraId, auraName, auraTier, wantDescription) {
    return this._req('POST', '/trades', { aura_id: auraId, aura_name: auraName, aura_tier: auraTier, want_description: wantDescription });
  }

  async claimTrade(tradeId) {
    return this._req('POST', `/trades/${tradeId}/claim`);
  }

  async completeTrade(tradeId) {
    return this._req('POST', `/trades/${tradeId}/complete`);
  }

  async cancelTrade(tradeId) {
    return this._req('DELETE', `/trades/${tradeId}`);
  }

  async getPendingAuras() {
    return this._req('GET', '/trades/pending');
  }

  async claimPendingAura(pendingId) {
    return this._req('DELETE', `/trades/pending/${pendingId}`);
  }

  // Game state (server-authoritative)
  async gameState() {
    return this._req('GET', '/game/state');
  }

  async roll(count = 1) {
    return this._req('POST', '/game/roll', { count });
  }

  async buy(itemId) {
    return this._req('POST', '/game/buy', { itemId });
  }

  async sell(auraId, count = 1) {
    return this._req('POST', '/game/sell', { auraId, count });
  }

  async equip(auraId) {
    return this._req('POST', '/game/equip', { auraId });
  }

  async syncState(state) {
    return this._req('POST', '/game/save', { state });
  }
}

export const API = new ApiClient();
