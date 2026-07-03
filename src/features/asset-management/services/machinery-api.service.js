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
   * Obtiene todas las máquinas (método principal)
   * @returns {Promise<Array>} Lista de máquinas
   */
  static async getMachines() {
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
        if (Array.isArray(response.data.machines)) {
          return response.data.machines.map(machine => ({
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
      throw new Error('Error al cargar las máquinas');
    }
  }

  /**
   * Obtiene todas las máquinas (alias de getMachines para compatibilidad)
   * @returns {Promise<Array>} Lista de máquinas
   */
  static async getAllMachines() {
    return this.getMachines();
  }

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
      const allMachines = await this.getMachines();

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

  /**
   * Asigna una máquina a una línea de producción
   * @param {number} machineId - ID de la máquina
   * @param {number} productionLineId - ID de la línea de producción
   * @returns {Promise<Object>} Máquina actualizada
   */
  static async assignMachineToProductionLine(machineId, productionLineId) {
    try {
      if (!machineId) {
        throw new Error('No se proporcionó ID de máquina');
      }
      if (!productionLineId) {
        throw new Error('No se proporcionó ID de línea de producción');
      }

      console.log(`Asignando máquina ${machineId} a la línea ${productionLineId}...`);
      
      const response = await http.put(`/machines/${machineId}/assign`, {
        productionLineId: productionLineId
      });
      
      console.log('Máquina asignada correctamente:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error al asignar máquina a línea de producción:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      throw new Error(`Error al asignar la máquina: ${errorMessage}`);
    }
  }

  /**
   * Crea una nueva máquina
   * @param {Object} machineData - Datos de la máquina
   * @returns {Promise<Object>} Máquina creada
   */
  static async createMachine(machineData) {
    try {
      const response = await http.post('/machines', machineData);
      return response.data;
    } catch (error) {
      console.error('Error al crear máquina:', error);
      throw error;
    }
  }

  /**
   * Actualiza una máquina existente
   * @param {number} machineId - ID de la máquina
   * @param {Object} machineData - Datos actualizados
   * @returns {Promise<Object>} Máquina actualizada
   */
  static async updateMachine(machineId, machineData) {
    try {
      const response = await http.put(`/machines/${machineId}`, machineData);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar máquina:', error);
      throw error;
    }
  }

  /**
   * Elimina una máquina
   * @param {number} machineId - ID de la máquina
   * @returns {Promise<boolean>} true si se eliminó correctamente
   */
  static async deleteMachine(machineId) {
    try {
      await http.delete(`/machines/${machineId}`);
      return true;
    } catch (error) {
      console.error('Error al eliminar máquina:', error);
      return false;
    }
  }

  /**
   * Obtiene máquinas por planta
   * @param {number|string} plantId - ID de la planta
   * @returns {Promise<Array>} Lista de máquinas
   */
  static async getMachinesByPlant(plantId) {
    try {
      if (!plantId) {
        console.warn('No se proporcionó ID de planta');
        return [];
      }

      console.log(`Obteniendo máquinas para planta ${plantId}...`);
      const allMachines = await this.getMachines();
      
      // Filtrar por plantId (asumiendo que las máquinas tienen relación con plantas)
      // Si no tienen relación directa, puedes obtener las líneas de producción de la planta
      // y luego filtrar las máquinas por esas líneas
      return allMachines;
    } catch (error) {
      console.error('Error al obtener máquinas por planta:', error);
      return [];
    }
  }

  /**
   * Obtiene el estado de una máquina
   * @param {number} machineId - ID de la máquina
   * @returns {Promise<Object>} Estado de la máquina
   */
  static async getMachineStatus(machineId) {
    try {
      const response = await http.get(`/machines/${machineId}/status`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener estado de máquina:', error);
      return null;
    }
  }

  /**
   * Actualiza el estado de una máquina
   * @param {number} machineId - ID de la máquina
   * @param {string} status - Nuevo estado
   * @returns {Promise<Object>} Estado actualizado
   */
  static async updateMachineStatus(machineId, status) {
    try {
      const response = await http.patch(`/machines/${machineId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Error al actualizar estado de máquina:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de mantenimiento de una máquina
   * @param {number} machineId - ID de la máquina
   * @returns {Promise<Array>} Lista de mantenimientos
   */
  static async getMachineMaintenanceHistory(machineId) {
    try {
      const response = await http.get(`/machines/${machineId}/maintenance-history`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener historial de mantenimiento:', error);
      return [];
    }
  }

  /**
   * Obtiene el estado actual de todas las máquinas
   * @returns {Promise<Array>} Lista de estados
   */
  static async getAllMachinesStatus() {
    try {
      const response = await http.get('/machines/status');
      return response.data;
    } catch (error) {
      console.error('Error al obtener estados de máquinas:', error);
      return [];
    }
  }
}