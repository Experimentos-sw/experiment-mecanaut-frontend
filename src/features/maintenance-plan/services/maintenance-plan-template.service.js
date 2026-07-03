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

export class MaintenancePlanTemplateService {
    /**
     * Obtiene todas las plantillas disponibles
     * @returns {Promise<Array>} Lista de plantillas
     */
    async getAllTemplates() {
        try {
            const response = await http.get('/maintenance-plan-templates');
            return response.data || [];
        } catch (error) {
            console.error('Error al cargar plantillas:', error);
            return [];
        }
    }

    /**
     * Obtiene una plantilla por ID
     * @param {number} templateId - ID de la plantilla
     * @returns {Promise<Object>} Plantilla
     */
    async getTemplateById(templateId) {
        try {
            const response = await http.get(`/maintenance-plan-templates/${templateId}`);
            return response.data;
        } catch (error) {
            console.error('Error al cargar plantilla:', error);
            return null;
        }
    }

    /**
     * Crea una nueva plantilla
     * @param {Object} templateData - Datos de la plantilla
     * @returns {Promise<Object>} Plantilla creada
     */
    async createTemplate(templateData) {
        try {
            const response = await http.post('/maintenance-plan-templates', templateData);
            return response.data;
        } catch (error) {
            console.error('Error al crear plantilla:', error);
            throw error;
        }
    }

    /**
     * Elimina una plantilla
     * @param {number} templateId - ID de la plantilla
     * @returns {Promise<boolean>} true si se eliminó correctamente
     */
    async deleteTemplate(templateId) {
        try {
            await http.delete(`/maintenance-plan-templates/${templateId}`);
            return true;
        } catch (error) {
            console.error('Error al eliminar plantilla:', error);
            return false;
        }
    }
}

export const maintenancePlanTemplateService = new MaintenancePlanTemplateService();