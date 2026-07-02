import { defineStore } from 'pinia';
import { maintenanceDynamicPlanService } from '../features/maintenance-plan/services/maintenance-dynamic-plan.service.js';

export const useMaintenancePlanWizardStore = defineStore('maintenancePlanWizard', {
  state: () => ({
    // Step 1: Información General
    planName: '',
    
    // Step 2: Parámetros
    parameter: null,
    amount: null,
    
    // Step 3: Ubicación
    plantId: null,
    productionLineId: null,
    
    // Step 4: Máquinas
    machineIds: [],
    
    // Step 5: Tareas
    tasks: [],
    
    isSubmitting: false,
    error: null,
  }),
  
  getters: {
    isStep1Valid: (state) => !!state.planName && state.planName.trim().length > 0,
    isStep2Valid: (state) => !!state.parameter && !!state.amount && state.amount > 0,
    isStep3Valid: (state) => !!state.plantId && !!state.productionLineId,
    isStep4Valid: (state) => state.machineIds.length > 0,
    isStep5Valid: (state) => state.tasks.length > 0 && state.tasks.every(t => !!t.taskDescription),
    
    canSubmit: (state) => {
      return state.planName && 
             state.parameter && 
             state.amount && 
             state.plantId && 
             state.productionLineId && 
             state.machineIds.length > 0 && 
             state.tasks.length > 0;
    }
  },
  
  actions: {
    setGeneralInfo(name) {
      this.planName = name;
    },
    
    setParameters(parameter, amount) {
      this.parameter = parameter;
      this.amount = amount;
    },
    
    setLocation(plantId, productionLineId) {
      this.plantId = plantId;
      this.productionLineId = productionLineId;
    },
    
    setMachines(machineIds) {
      this.machineIds = machineIds;
    },
    
    addTask(description) {
      this.tasks.push({ taskDescription: description });
    },
    
    removeTask(index) {
      this.tasks.splice(index, 1);
    },
    
    reset() {
      this.planName = '';
      this.parameter = null;
      this.amount = null;
      this.plantId = null;
      this.productionLineId = null;
      this.machineIds = [];
      this.tasks = [];
      this.isSubmitting = false;
      this.error = null;
    },
    
    async submitWizard() {
      this.isSubmitting = true;
      this.error = null;
      
      try {
        const planData = {
          planName: this.planName,
          parameter: this.parameter,
          amount: this.amount,
          plantLineId: this.plantId,
          productionLineId: this.productionLineId,
          machineIds: this.machineIds,
          tasks: this.tasks
        };
        
        const result = await maintenanceDynamicPlanService.createPlan(planData);
        this.reset();
        return result;
      } catch (err) {
        this.error = err.message || 'Error al crear el plan de mantenimiento';
        throw err;
      } finally {
        this.isSubmitting = false;
      }
    }
  }
});
