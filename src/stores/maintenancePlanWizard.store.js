import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { maintenanceDynamicPlanService } from '@/features/maintenance-plan/services/maintenance-dynamic-plan.service.js';

export const useMaintenancePlanWizardStore = defineStore('maintenancePlanWizard', () => {
  // Estado
  const planName = ref('');
  const parameter = ref('');
  const amount = ref(null);
  const plantId = ref('');
  const productionLineId = ref('');
  const machineIds = ref([]);
  const tasks = ref([]);
  const error = ref('');
  const isSubmitting = ref(false);

  // Computed
  const isStep1Valid = computed(() => planName.value.trim() !== '');

  const isStep2Valid = computed(() =>
      parameter.value !== '' &&
      amount.value !== null &&
      amount.value > 0
  );

  const isStep3Valid = computed(() =>
      plantId.value !== '' &&
      productionLineId.value !== ''
  );

  const isStep4Valid = computed(() =>
      machineIds.value.length > 0
  );

  const canSubmit = computed(() =>
      isStep1Valid.value &&
      isStep2Valid.value &&
      isStep3Valid.value &&
      isStep4Valid.value &&
      tasks.value.length > 0 &&
      tasks.value.every(task => task.taskDescription.trim() !== '')
  );

  // Acciones
  function addTask(description) {
    tasks.value.push({ taskDescription: description });
  }

  function removeTask(index) {
    tasks.value.splice(index, 1);
  }

  function reset() {
    planName.value = '';
    parameter.value = '';
    amount.value = null;
    plantId.value = '';
    productionLineId.value = '';
    machineIds.value = [];
    tasks.value = [];
    error.value = '';
    isSubmitting.value = false;
  }

  async function submitWizard() {
    if (!canSubmit.value) return;

    isSubmitting.value = true;
    error.value = '';

    try {
      const planData = {
        planName: planName.value,
        parameter: parameter.value,
        amount: Number(amount.value),
        productionLineId: productionLineId.value,
        plantLineId: plantId.value,
        machineIds: machineIds.value,
        tasks: tasks.value
      };

      const result = await maintenanceDynamicPlanService.createPlan(planData);
      reset();
      return result;
    } catch (err) {
      error.value = err.message || 'Error al crear el plan';
      throw err;
    } finally {
      isSubmitting.value = false;
    }
  }

  return {
    // Estado
    planName,
    parameter,
    amount,
    plantId,
    productionLineId,
    machineIds,
    tasks,
    error,
    isSubmitting,
    // Computed
    isStep1Valid,
    isStep2Valid,
    isStep3Valid,
    isStep4Valid,
    canSubmit,
    // Acciones
    addTask,
    removeTask,
    reset,
    submitWizard
  };
});