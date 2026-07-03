import axios from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL + '/api/v1',
  timeout: 8000,
});

// Interceptor para agregar el token
http.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores de respuesta
http.interceptors.response.use(
    response => response,
    error => {
      console.error('Error en la petición:', error);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      }
      return Promise.reject(error);
    }
);

export class MachineryApiService {
  /**
   * Obtiene las métricas disponibles para parámetros
   */
  static getAvailableMetrics() {
    return [
      { id: '1', name: 'Kilometraje' },
      { id: '2', name: 'Temperatura' },
      { id: '3', name: 'Presión' },
      { id: '4', name: 'Vibración' }
    ];
  }

  /**
   * Obtiene todas las máquinas disponibles desde /api/v1/machines
   * @returns {Promise<Array>} Lista de máquinas
   */
  static async getAllMachines() {
    try {
      console.log('Obteniendo todas las máquinas desde /machines...');
      const response = await http.get('/machines');
      console.log('Respuesta de máquinas:', response.data);

      // Verificar si la respuesta es un array
      if (Array.isArray(response.data)) {
        return response.data.map(machine => ({
          id: machine.id,
          name: machine.name || `Máquina ${machine.id}`,
          code: machine.serialNumber || machine.model || '',
          serialNumber: machine.serialNumber || '',
          manufacturer: machine.manufacturer || '',
          model: machine.model || '',
          type: machine.type || '',
          status: machine.status || '',
          productionLineId: machine.productionLineId || null
        }));
      }

      // Si la respuesta es un objeto con data
      if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data.data)) {
          return response.data.data.map(machine => ({
            id: machine.id,
            name: machine.name || `Máquina ${machine.id}`,
            code: machine.serialNumber || machine.model || '',
            serialNumber: machine.serialNumber || '',
            manufacturer: machine.manufacturer || '',
            model: machine.model || '',
            type: machine.type || '',
            status: machine.status || '',
            productionLineId: machine.productionLineId || null
          }));
        }
        if (Array.isArray(response.data.items)) {
          return response.data.items.map(machine => ({
            id: machine.id,
            name: machine.name || `Máquina ${machine.id}`,
            code: machine.serialNumber || machine.model || '',
            serialNumber: machine.serialNumber || '',
            manufacturer: machine.manufacturer || '',
            model: machine.model || '',
            type: machine.type || '',
            status: machine.status || '',
            productionLineId: machine.productionLineId || null
          }));
        }
      }

      console.warn('No se encontraron máquinas en la respuesta:', response.data);
      return [];
    } catch (error) {
      console.error('Error al obtener todas las máquinas:', error);
      return [];
    }
  }

  /**
   * Obtiene las máquinas por línea de producción
   * @param {number|string} productionLineId - ID de la línea de producción
   * @returns {Promise<Array>} Lista de máquinas
   */
  static async getMachinesByProductionLine(productionLineId) {
    try {
      if (!productionLineId) {
        console.warn('No se proporcionó ID de línea de producción');
        return [];
      }

      console.log(`Obteniendo máquinas para línea ${productionLineId}...`);

      // Obtener todas las máquinas y filtrar por línea de producción
      const allMachines = await this.getAllMachines();

      // Filtrar máquinas por productionLineId
      const filtered = allMachines.filter(
          machine => machine.productionLineId === Number(productionLineId)
      );

      console.log(`Encontradas ${filtered.length} máquinas para la línea ${productionLineId}`);
      return filtered;
    } catch (error) {
      console.error('Error al obtener máquinas por línea de producción:', error);
      return [];
    }
  }

  /**
   * Obtiene una máquina por ID
   * @param {number} machineId - ID de la máquina
   * @returns {Promise<Object|null>} Máquina
   */
  static async getMachineById(machineId) {
    try {
      const response = await http.get(`/machines/${machineId}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener máquina:', error);
      return null;
    }
  }

  /**
   * Obtiene las máquinas filtradas por línea de producción usando endpoint directo
   * @param {number|string} productionLineId - ID de la línea de producción
   * @returns {Promise<Array>} Lista de máquinas
   */
  static async getMachinesByProductionLineDirect(productionLineId) {
    try {
      if (!productionLineId) {
        console.warn('No se proporcionó ID de línea de producción');
        return [];
      }

      console.log(`Obteniendo máquinas para línea ${productionLineId} desde /production-lines/${productionLineId}/machines...`);

      const response = await http.get(`/production-lines/${productionLineId}/machines`);
      console.log('Respuesta de máquinas por línea:', response.data);

      if (Array.isArray(response.data)) {
        return response.data.map(machine => ({
          id: machine.id,
          name: machine.name || `Máquina ${machine.id}`,
          code: machine.serialNumber || machine.model || '',
          serialNumber: machine.serialNumber || '',
          manufacturer: machine.manufacturer || '',
          model: machine.model || '',
          type: machine.type || '',
          status: machine.status || '',
          productionLineId: machine.productionLineId || null
        }));
      }

      return [];
    } catch (error) {
      console.error('Error en endpoint directo de máquinas:', error);
      return [];
    }
  }
}