<template>
  <div class="wizard-container">
    <div class="wizard-header">
      <h2>Crear Plan de Mantenimiento</h2>
      <Button icon="pi pi-times" rounded text @click="$emit('close')" aria-label="Cancelar" />
    </div>

    <Stepper value="1">
      <StepList>
        <Step value="1">Información</Step>
        <Step value="2">Parámetros</Step>
        <Step value="3">Ubicación</Step>
        <Step value="4">Máquinas</Step>
        <Step value="5">Tareas</Step>
      </StepList>
      <StepPanels>
        <!-- Paso 1: Información General -->
        <StepPanel v-slot="{ activateCallback }" value="1">
          <div class="step-content">
            <h3>Información General</h3>
            <div class="field">
              <label for="planName">Nombre del Plan</label>
              <InputText id="planName" v-model="store.planName" class="w-full" placeholder="Ej. Mantenimiento Preventivo Mensual" />
            </div>
            <div class="step-actions">
              <Button label="Siguiente" @click="activateCallback('2')" :disabled="!store.isStep1Valid" />
            </div>
          </div>
        </StepPanel>

        <!-- Paso 2: Parámetros -->
        <StepPanel v-slot="{ activateCallback }" value="2">
          <div class="step-content">
            <h3>Parámetros</h3>
            <div class="field">
              <label for="parameter">Parámetro a evaluar</label>
              <Select 
                id="parameter" 
                v-model="store.parameter" 
                :options="availableMetrics" 
                optionLabel="name" 
                optionValue="id" 
                placeholder="Selecciona un parámetro" 
                class="w-full" />
            </div>
            <div class="field mt-3">
              <label for="amount">Cantidad / Frecuencia</label>
              <InputNumber id="amount" v-model="store.amount" class="w-full" placeholder="Ej. 5000" />
            </div>
            <div class="step-actions">
              <Button label="Atrás" severity="secondary" @click="activateCallback('1')" />
              <Button label="Siguiente" @click="activateCallback('3')" :disabled="!store.isStep2Valid" />
            </div>
          </div>
        </StepPanel>

        <!-- Paso 3: Ubicación -->
        <StepPanel v-slot="{ activateCallback }" value="3">
          <div class="step-content">
            <h3>Ubicación</h3>
            <div class="field">
              <label for="plantId">Planta</label>
              <Select 
                id="plantId" 
                v-model="store.plantId" 
                :options="plants" 
                optionLabel="name" 
                optionValue="id" 
                placeholder="Selecciona una planta" 
                class="w-full" />
            </div>
            <div class="field mt-3">
              <label for="productionLineId">Línea de Producción</label>
              <Select 
                id="productionLineId" 
                v-model="store.productionLineId" 
                :options="productionLines" 
                optionLabel="name" 
                optionValue="id" 
                placeholder="Selecciona una línea de producción" 
                :disabled="!store.plantId"
                class="w-full" />
            </div>
            <div class="step-actions">
              <Button label="Atrás" severity="secondary" @click="activateCallback('2')" />
              <Button label="Siguiente" @click="activateCallback('4')" :disabled="!store.isStep3Valid" />
            </div>
          </div>
        </StepPanel>

        <!-- Paso 4: Máquinas -->
        <StepPanel v-slot="{ activateCallback }" value="4">
          <div class="step-content">
            <h3>Máquinas</h3>
            <div class="field">
              <label>Seleccionar Máquinas</label>
              <MultiSelect 
                v-model="store.machineIds" 
                :options="machines" 
                optionLabel="name" 
                optionValue="id" 
                :placeholder="machines.length === 0 ? 'No hay máquinas disponibles' : 'Selecciona las máquinas'" 
                :maxSelectedLabels="3" 
                :disabled="machines.length === 0"
                class="w-full custom-multiselect-header" />
            </div>
            <div class="step-actions">
              <Button label="Atrás" severity="secondary" @click="activateCallback('3')" />
              <Button label="Siguiente" @click="activateCallback('5')" :disabled="!store.isStep4Valid" />
            </div>
          </div>
        </StepPanel>

        <!-- Paso 5: Tareas -->
        <StepPanel v-slot="{ activateCallback }" value="5">
          <div class="step-content">
            <h3>Tareas</h3>
            <div class="field flex gap-2">
              <InputText v-model="newTaskInput" class="flex-1" placeholder="Nueva tarea..." @keyup.enter="addTask" />
              <Button icon="pi pi-plus" @click="addTask" :disabled="!newTaskInput.trim()" />
            </div>
            <ul class="task-list mt-3">
              <li v-for="(task, index) in store.tasks" :key="index" class="flex justify-content-between align-items-center mb-2 p-2 border-1 border-round surface-border">
                <span>{{ task.taskDescription }}</span>
                <Button icon="pi pi-trash" severity="danger" text rounded @click="store.removeTask(index)" />
              </li>
            </ul>
            <div v-if="store.error" class="error-message mt-3">
              {{ store.error }}
            </div>
            <div class="step-actions mt-4">
              <Button label="Atrás" severity="secondary" @click="activateCallback('4')" />
              <Button label="Finalizar y Crear" severity="success" @click="submitPlan" :loading="store.isSubmitting" :disabled="!store.canSubmit" />
            </div>
          </div>
        </StepPanel>
      </StepPanels>
    </Stepper>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useMaintenancePlanWizardStore } from '@/stores/maintenancePlanWizard.store';
import { PlantApiService } from '../../asset-management/services/plant-api.service.js';
import { ProductionLineApiService } from '../../asset-management/services/production-line-api.service.js';
import { MachineryApiService } from '../../asset-management/services/machinery-api.service.js';

import Stepper from 'primevue/stepper';
import StepList from 'primevue/steplist';
import StepPanels from 'primevue/steppanels';
import StepPanel from 'primevue/steppanel';
import Step from 'primevue/step';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';

const emit = defineEmits(['close', 'planCreated']);
const store = useMaintenancePlanWizardStore();

const newTaskInput = ref('');

// Opciones para los selectores
const availableMetrics = ref([]);
const plants = ref([]);
const productionLines = ref([]);
const machines = ref([]);

onMounted(async () => {
  store.reset();
  
  // Cargar datos iniciales
  availableMetrics.value = MachineryApiService.getAvailableMetrics();
  
  try {
    const fetchedPlants = await PlantApiService.getPlants();
    plants.value = fetchedPlants || [];
  } catch (e) {
    console.error("Error al cargar plantas", e);
  }
});

watch(() => store.plantId, async (newVal) => {
  store.productionLineId = null;
  store.machineIds = [];
  productionLines.value = [];
  machines.value = [];
  
  if (newVal) {
    try {
      const lines = await ProductionLineApiService.getProductionLines(Number(newVal));
      productionLines.value = lines || [];
    } catch (e) {
      console.error("Error al cargar líneas de producción", e);
    }
  }
});

watch(() => store.productionLineId, async (newVal) => {
  store.machineIds = [];
  machines.value = [];
  
  if (newVal) {
    try {
      const fetchedMachines = await MachineryApiService.getMachinesByProductionLine(Number(newVal));
      machines.value = fetchedMachines || [];
    } catch (e) {
      console.error("Error al cargar máquinas", e);
    }
  }
});

const addTask = () => {
  if (newTaskInput.value.trim()) {
    store.addTask(newTaskInput.value.trim());
    newTaskInput.value = '';
  }
};

const submitPlan = async () => {
  try {
    const result = await store.submitWizard();
    emit('planCreated', result);
    emit('close');
  } catch (error) {
    console.error(error);
  }
};
</script>

<style scoped>
.wizard-container {
  background: var(--clr-bg, #ffffff);
  border-radius: var(--radius-lg, 16px);
  padding: 1.5rem;
  box-shadow: 0 4px 20px var(--clr-shadow, rgba(0, 0, 0, 0.1));
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}
.wizard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}
.wizard-header h2 {
  margin: 0;
  color: var(--clr-text, #333);
  font-family: var(--font-family-base, 'Montserrat', sans-serif);
  font-weight: 600;
}
.step-content {
  padding: 1rem 0;
  min-height: 250px;
  display: flex;
  flex-direction: column;
}
.step-content h3 {
  color: var(--clr-primary-500, #1565c0);
  margin-top: 0;
  font-family: var(--font-family-base, 'Montserrat', sans-serif);
}
.field {
  margin-bottom: 1rem;
}
.field label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--clr-text, #333);
}
.step-actions {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  padding-top: 1.5rem;
  border-top: 1px solid var(--clr-border, #eee);
}
.task-list {
  list-style-type: none;
  padding: 0;
  max-height: 150px;
  overflow-y: auto;
}
.error-message {
  color: var(--color-error, #f44336);
  font-size: 0.9rem;
}

/* Label visual para el checkbox de Seleccionar Todas */
:deep(.custom-multiselect-header .p-multiselect-header) {
  display: flex;
  align-items: center;
}
:deep(.custom-multiselect-header .p-multiselect-header .p-checkbox) {
  display: flex;
  align-items: center;
}
:deep(.custom-multiselect-header .p-multiselect-header .p-checkbox::after) {
  content: "Seleccionar todas";
  margin-left: 0.75rem;
  font-family: var(--font-family-base, 'Montserrat', sans-serif);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--clr-text, #333);
  white-space: nowrap;
}
</style>
