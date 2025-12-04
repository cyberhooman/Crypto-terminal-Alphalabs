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

  // Delete all alerts from backend database
  async deleteAllAlerts(): Promise<{ success: boolean; deleted: number; message: string }> {
    try {
      const response = await axios.delete(`${this.baseURL}/alerts`);
      return {
        success: response.data.success,
        deleted: response.data.deleted,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Error deleting alerts from backend:', error);
      return {
        success: false,
        deleted: 0,
        message: 'Failed to delete alerts from backend',
      };
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

  // Fetch all market data from backend (pre-calculated, instant)
  async getMarketData(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/market/data`, {
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching market data from backend:', error);
      throw error;
    }
  }

  // Fetch specific symbol data
  async getSymbolData(symbol: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/market/data/${symbol}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
      return null;
    }
  }

  // Get market stats
  async getMarketStats(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/market/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching market stats:', error);
      return null;
    }
  }
}

export const backendAPI = new BackendAPI();
