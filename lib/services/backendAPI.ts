// Backend API client
import axios from 'axios';
import type { ConfluenceAlert } from '../alerts/confluenceDetector';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export class BackendAPI {
  private baseURL: string;

  constructor(baseURL: string = BACKEND_URL) {
    this.baseURL = `${baseURL}/api`;
  }

  // Fetch all alerts from past 48 hours
  async getAlerts(): Promise<ConfluenceAlert[]> {
    try {
      const response = await axios.get(`${this.baseURL}/alerts`);
      return response.data.alerts;
    } catch (error) {
      console.error('Error fetching alerts from backend:', error);
      return [];
    }
  }

  // Fetch alerts for specific symbol
  async getAlertsForSymbol(symbol: string): Promise<ConfluenceAlert[]> {
    try {
      const response = await axios.get(`${this.baseURL}/alerts/${symbol}`);
      return response.data.alerts;
    } catch (error) {
      console.error(`Error fetching alerts for ${symbol}:`, error);
      return [];
    }
  }

  // Fetch alerts by severity
  async getAlertsBySeverity(severity: string): Promise<ConfluenceAlert[]> {
    try {
      const response = await axios.get(`${this.baseURL}/alerts/severity/${severity}`);
      return response.data.alerts;
    } catch (error) {
      console.error(`Error fetching ${severity} alerts:`, error);
      return [];
    }
  }

  // Get statistics
  async getStats(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      return null;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      return response.data.status === 'ok';
    } catch (error) {
      return false;
    }
  }
}

export const backendAPI = new BackendAPI();
