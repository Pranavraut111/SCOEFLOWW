import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/v1` 
  : '/api/v1';

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const error: any = new Error(`HTTP ${res.status}`);
    try {
      error.response = { status: res.status, data: await res.json() };
    } catch {
      error.response = { status: res.status, data: { detail: res.statusText } };
    }
    throw error;
  }
  return res.json();
};

export const api = {
  // Students API
  students: {
    getAll: () => fetch(`${API_BASE_URL}/students/`).then(handleResponse),
    getById: (id: string) => fetch(`${API_BASE_URL}/students/${id}`).then(handleResponse),
    create: (data: any) => fetch(`${API_BASE_URL}/students/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),
    update: (id: string, data: any) => fetch(`${API_BASE_URL}/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),
    delete: (id: string) => fetch(`${API_BASE_URL}/students/${id}`, {
      method: 'DELETE'
    }).then(handleResponse),
  },

  // Subjects API
  subjects: {
    getAll: (params?: Record<string, string>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetch(`${API_BASE_URL}/subjects/${query}`).then(handleResponse);
    },
    getById: (id: string) => fetch(`${API_BASE_URL}/subjects/${id}`).then(handleResponse),
    create: (data: any) => fetch(`${API_BASE_URL}/subjects/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),
    update: (id: string, data: any) => fetch(`${API_BASE_URL}/subjects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),
    delete: (id: string) => fetch(`${API_BASE_URL}/subjects/${id}`, {
      method: 'DELETE'
    }).then(handleResponse),
    getCatalog: (department: string, semester?: string) => {
      const params = new URLSearchParams({ department });
      if (semester) params.set('semester', semester);
      return fetch(`${API_BASE_URL}/subjects/catalog?${params}`).then(handleResponse);
    },
    getTemplates: () => fetch(`${API_BASE_URL}/subjects/templates/components`).then(handleResponse),
  },

  // Exams API
  exams: {
    getEvents: () => fetch(`${API_BASE_URL}/exams/events/`).then(handleResponse),
    createEvent: (data: any) => fetch(`${API_BASE_URL}/exams/events/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),
    updateEvent: (id: string, data: any) => fetch(`${API_BASE_URL}/exams/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),
    deleteEvent: (id: string) => fetch(`${API_BASE_URL}/exams/events/${id}`, {
      method: 'DELETE'
    }).then(handleResponse),
    getSchedules: (eventId: string) => fetch(`${API_BASE_URL}/exams/events/${eventId}/schedules`).then(handleResponse),
    createSchedule: (data: any) => fetch(`${API_BASE_URL}/exams/schedules/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),
    getEnrollments: (eventId: string) => fetch(`${API_BASE_URL}/exams/events/${eventId}/enrollments`).then(handleResponse),
    createEnrollment: (data: any) => fetch(`${API_BASE_URL}/exams/enrollments/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),
    getMarks: (eventId: string) => fetch(`${API_BASE_URL}/exams/events/${eventId}/marks`).then(handleResponse),
    createMarks: (data: any) => fetch(`${API_BASE_URL}/exams/marks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),
    getResults: (eventId?: string) => {
      const query = eventId ? `?exam_event_id=${eventId}` : '';
      return fetch(`${API_BASE_URL}/exams/results/${query}`).then(handleResponse);
    },
  },
};

export default api;
