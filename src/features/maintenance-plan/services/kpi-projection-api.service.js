import axios from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL + '/api/v1',
  timeout: 8000,
});

// Interceptor to add auth token if necessary
http.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export class KpiProjectionApiService {
    /**
     * Obtiene la proyección matemática de MTBF y MTTR para un conjunto de máquinas y parámetros
     * @param {Array<number>} machineIds - Lista de IDs de las máquinas
     * @param {number} metricId - ID del parámetro / métrica
     * @param {number} amount - Cantidad esperada
     * @returns {Promise<Object>} Promesa con los datos {mtbf, mttr, unit}
     */
    getProjection(machineIds, metricId = 1, amount = 0, taskCount = 0) {
        if (!machineIds || machineIds.length === 0) {
            return Promise.resolve({ data: { mtbf: 0, mttr: 0, unit: 'hours' } });
        }

        // Serializar array de IDs para el query params (ej. machineIds=1&machineIds=2)
        const params = new URLSearchParams();
        machineIds.forEach(id => params.append('machineIds', id));
        params.append('metricId', metricId);
        params.append('amount', amount);
        params.append('taskCount', taskCount);

        return http.get(`/dynamic-maintenance-plans/kpi-projections?${params.toString()}`);
    }
}
