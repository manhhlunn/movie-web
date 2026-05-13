/**
 * OPhim API Client — Axios instance configured for the OPhim REST API.
 */

import axios from 'axios';

const ophimClient = axios.create({
  baseURL: 'https://ophim1.com',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
ophimClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[OPhim API Error]', error?.message || error);
    return Promise.reject(error);
  }
);

export default ophimClient;
