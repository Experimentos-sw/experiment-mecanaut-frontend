<template>
  <div class="wizard-container">
    <div class="wizard-header flex align-items-center justify-content-between mb-4">
      <div class="header-left">
        <h2>Crear Plan de Mantenimiento</h2>
        <!-- Selector de plantillas -->
        <div class="template-selector" v-if="showTemplateSelector">
          <label for="template-select">Cargar Plantilla:</label>
          <Select
              id="template-select"
              v-model="selectedTemplateId"
              :options="templates"
              optionLabel="name"
              optionValue="id"
              placeholder="Seleccionar plantilla..."
              class="template-select"
              :loading="isLoadingTemplates"
              @change="loadTemplate"
          />
          <Button
              icon="pi pi-refresh"
              rounded
              text
              @click="loadTemplates"
              :loading="isLoadingTemplates"
              aria-label="Recargar plantillas"
          />
        </div>
      </div>

      <div class="kpi-panel flex gap-4 align-items-center bg-gray-50 px-3 py-2 border-round">
        <div v-if="isCalculatingKpis" class="flex align-items-center">
          <ProgressSpinner style="width: 20px; height: 20px" strokeWidth="4" class="mr-2" />
          <span class="text-500 text-sm">Calculando proyecciones...</span>
        </div>
        <template v-else-if="mtbf > 0 || mttr > 0">
          <div class="flex flex-column">
            <span class="text-xs text-500 uppercase font-bold">MTBF Proyectado</span>
            <span class="font-bold text-xl" :class="getMtbfColor(mtbf)">{{ mtbf }} hrs</span>
          </div>
          <div class="flex flex-column">
            <span class="text-xs text-500 uppercase font-bold">MTTR Proyectado</span>
            <span class="font-bold text-xl" :class="getMttrColor(mttr)">{{ mttr }} hrs</span>
          </div>
        </template>
        <div v-else class="text-500 text-sm">
          Configura máquinas para ver KPIs
        </div>
      </div>

      <div class="header-actions">
        <Button
            v-if="showSaveTemplate"
            icon="pi pi-save"
            label="Guardar como Plantilla"
            severity="info"
            @click="openSaveTemplateDialog"
            :disabled="!store.canSubmit"
        />
        <Button icon="pi pi-times" rounded text @click="closeWizard" aria-label="Cancelar" />
      </div>
    </div>

    <Stepper v-model:value="currentStep">
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

            <!-- Estado de carga -->
            <div v-if="isLoadingMachines" class="loading-state">
              <ProgressSpinner style="width: 40px; height: 40px" strokeWidth="4" />
              <p>Cargando máquinas disponibles...</p>
            </div>

            <!-- Estado de error -->
            <div v-else-if="machinesError" class="error-state">
              <i class="pi pi-exclamation-triangle" style="font-size: 2rem; color: var(--color-error);"></i>
              <p>{{ machinesError }}</p>
              <div class="error-actions">
                <Button label="Reintentar" severity="secondary" @click="loadMachinesForLine(store.productionLineId)" />
                <Button label="Usar datos de ejemplo" severity="info" @click="useExampleMachines" />
              </div>
            </div>

            <!-- Selector de máquinas -->
            <div v-else class="field">
              <label>Seleccionar Máquinas</label>
              <MultiSelect
                  v-model="store.machineIds"
                  :options="machines"
                  optionLabel="name"
                  optionValue="id"
                  :placeholder="machines.length === 0 ? 'No hay máquinas disponibles para esta línea' : 'Selecciona las máquinas'"
                  :maxSelectedLabels="3"
                  :disabled="machines.length === 0"
                  class="w-full custom-multiselect-header"
              />
              <small v-if="machines.length === 0 && !machinesError" class="help-text">
                No hay máquinas registradas para esta línea de producción.
                <a href="#" @click.prevent="loadAllMachines">Ver todas las máquinas</a>
              </small>
              <small v-else-if="machines.length > 0" class="help-text">
                {{ machines.length }} máquina(s) disponible(s).
                <a href="#" @click.prevent="loadAllMachines">Cargar todas las máquinas</a>
              </small>
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

    <!-- Modal para guardar como plantilla -->
    <Dialog
        v-model:visible="showSaveTemplateModal"
        header="Guardar como Plantilla"
        :modal="true"
        :closable="true"
        class="template-dialog"
    >
      <div class="template-dialog-content">
        <div class="field">
          <label for="templateName">Nombre de la Plantilla</label>
          <InputText
              id="templateName"
              v-model="templateName"
              class="w-full"
              placeholder="Ej. Plantilla Mantenimiento Mensual"
          />
        </div>
        <div class="field">
          <label for="templateDescription">Descripción (opcional)</label>
          <Textarea
              id="templateDescription"
              v-model="templateDescription"
              class="w-full"
              rows="3"
              placeholder="Describe el propósito de esta plantilla..."
          />
        </div>
      </div>
      <template #footer>
        <div class="button-group">
          <Button label="Cancelar" severity="secondary" @click="showSaveTemplateModal = false" />
          <Button
              label="Guardar Plantilla"
              severity="info"
              @click="saveAsTemplate"
              :disabled="!templateName.trim() || isSavingTemplate"
              :loading="isSavingTemplate"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useMaintenancePlanWizardStore } from '@/stores/maintenancePlanWizard.store';
import { PlantApiService } from '../../asset-management/services/plant-api.service.js';
import { ProductionLineApiService } from '../../asset-management/services/production-line-api.service.js';
import { MachineryApiService } from '../../asset-management/services/machinery-api.service.js';
import { KpiProjectionApiService } from '../services/kpi-projection-api.service.js';
import { maintenancePlanTemplateService } from '../services/maintenance-plan-template.service.js';
import { TelemetryService } from '@/core/services/telemetry.service';

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
import ProgressSpinner from 'primevue/progressspinner';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';

const emit = defineEmits(['close', 'planCreated', 'templateSaved']);

const props = defineProps({
  showTemplateSelector: {
    type: Boolean,
    default: true
  },
  showSaveTemplate: {
    type: Boolean,
    default: true
  }
});

const currentStep = ref('1');
const startTime = ref(Date.now());

const getStepName = (stepValue) => {
  switch(stepValue) {
    case '1': return 'Información';
    case '2': return 'Parámetros';
    case '3': return 'Ubicación';
    case '4': return 'Máquinas';
    case '5': return 'Tareas';
    default: return 'Desconocido';
  }
};

const getDurationAndStep = () => {
  const duration = Math.floor((Date.now() - startTime.value) / 1000);
  return { durationSeconds: duration, lastStep: getStepName(currentStep.value) };
};

const closeWizard = () => {
  const stats = getDurationAndStep();
  
  TelemetryService.recordMetric({
    experimentName: 'US09-R | US07-R',
    variant: 'Treatment',
    actionType: 'Plan_Creation_Abandoned',
    durationMilliseconds: stats.durationSeconds * 1000,
    isSuccess: false,
    additionalData: JSON.stringify({ lastStep: stats.lastStep })
  });
  
  emit('close', stats);
};

const store = useMaintenancePlanWizardStore();

const newTaskInput = ref('');

// Opciones para los selectores
const availableMetrics = ref([]);
const plants = ref([]);
const productionLines = ref([]);
const machines = ref([]);

const isCalculatingKpis = ref(false);
const mtbf = ref(0);
const mttr = ref(0);

// Variables para plantillas
const templates = ref([]);
const selectedTemplateId = ref(null);
const isLoadingTemplates = ref(false);
const showSaveTemplateModal = ref(false);
const templateName = ref('');
const templateDescription = ref('');
const isSavingTemplate = ref(false);

// Variables para manejo de máquinas
const isLoadingMachines = ref(false);
const machinesError = ref('');

// Datos de ejemplo para máquinas
const exampleMachines = [
  { id: 101, name: 'MT-430', code: 'MT430' },
  { id: 102, name: 'MT-450', code: 'MT450' },
  { id: 103, name: 'MT-490', code: 'MT490' },
  { id: 104, name: 'MT-510', code: 'MT510' },
  { id: 105, name: 'MT-530', code: 'MT530' }
];

// Debounce Utility
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

const fetchKpiProjections = async () => {
  if (!store.machineIds || store.machineIds.length === 0) {
    mtbf.value = 0;
    mttr.value = 0;
    return;
  }

  isCalculatingKpis.value = true;
  try {
    const kpiService = new KpiProjectionApiService();
    const response = await kpiService.getProjection(
        store.machineIds,
        store.parameterId || 1,
        store.amount || 0,
        store.tasks ? store.tasks.length : 0
    );

    if (response && response.data) {
      mtbf.value = response.data.mtbf;
      mttr.value = response.data.mttr;
    }
  } catch (error) {
    console.error("Error fetching KPI projections", error);
  } finally {
    isCalculatingKpis.value = false;
  }
};

const debouncedFetchKpi = debounce(fetchKpiProjections, 800);

watch(
    [() => store.machineIds, () => store.parameterId, () => store.amount, () => store.tasks ? store.tasks.length : 0],
    () => {
      debouncedFetchKpi();
    },
    { deep: true }
);

const getMtbfColor = (val) => {
  if (val > 200) return 'text-green-500';
  if (val > 100) return 'text-yellow-500';
  return 'text-red-500';
};

const getMttrColor = (val) => {
  if (val < 5) return 'text-green-500';
  if (val < 15) return 'text-yellow-500';
  return 'text-red-500';
};

// Cargar plantillas
const loadTemplates = async () => {
  isLoadingTemplates.value = true;
  try {
    templates.value = await maintenancePlanTemplateService.getAllTemplates();
  } catch (error) {
    console.error('Error al cargar plantillas:', error);
  } finally {
    isLoadingTemplates.value = false;
  }
};

// Cargar plantilla seleccionada
const loadTemplate = async () => {
  if (!selectedTemplateId.value) return;

  try {
    const template = await maintenancePlanTemplateService.getTemplateById(selectedTemplateId.value);
    if (template) {
      // Llenar el store con los datos de la plantilla
      store.planName = template.name || '';
      store.parameter = template.metricId || '';
      store.amount = template.amount || 0;
      store.plantId = template.plantLineId || '';
      store.productionLineId = template.productionLineId || '';
      store.machineIds = template.machines || [];

      // Cargar tareas
      store.tasks = [];
      if (template.tasks && Array.isArray(template.tasks)) {
        template.tasks.forEach(taskDesc => {
          store.addTask(taskDesc);
        });
      }

      // Cargar datos relacionados
      if (store.plantId) {
        await loadProductionLinesForPlant(store.plantId);
        if (store.productionLineId) {
          await loadMachinesForLine(store.productionLineId);
        }
      }

      TelemetryService.recordMetric({
        experimentName: 'US35-R',
        variant: 'Treatment',
        actionType: 'Template_Used',
        durationMilliseconds: 0,
        isSuccess: true,
        additionalData: JSON.stringify({ templateId: selectedTemplateId.value })
      });
    }
  } catch (error) {
    console.error('Error al cargar plantilla:', error);
  }
};

// Funciones auxiliares para cargar datos relacionados
const loadProductionLinesForPlant = async (plantId) => {
  try {
    const lines = await ProductionLineApiService.getProductionLines(Number(plantId));
    productionLines.value = lines || [];
  } catch (e) {
    console.error("Error al cargar líneas de producción", e);
  }
};

// Función para cargar máquinas con manejo de errores mejorado
const loadMachinesForLine = async (productionLineId) => {
  if (!productionLineId) {
    machines.value = [];
    machinesError.value = '';
    return;
  }

  isLoadingMachines.value = true;
  machinesError.value = '';

  try {
    // Intentar obtener máquinas por línea de producción
    let fetchedMachines = await MachineryApiService.getMachinesByProductionLine(Number(productionLineId));

    // Si no hay máquinas en esa línea, intentar con el endpoint directo
    if (!fetchedMachines || fetchedMachines.length === 0) {
      console.log('No hay máquinas en esta línea, intentando endpoint directo...');
      fetchedMachines = await MachineryApiService.getMachinesByProductionLineDirect(Number(productionLineId));
    }

    if (fetchedMachines && fetchedMachines.length > 0) {
      machines.value = fetchedMachines;
      machinesError.value = '';
    } else {
      // Si no hay máquinas, cargar todas y mostrar mensaje
      await loadAllMachines();
      if (machines.value.length > 0) {
        machinesError.value = 'No hay máquinas asignadas a esta línea. Mostrando todas las máquinas disponibles.';
      }
    }
  } catch (error) {
    console.error('Error al cargar máquinas:', error);
    machinesError.value = 'Error al cargar las máquinas. Verifica la conexión con el servidor.';
    // Intentar cargar todas las máquinas como fallback
    await loadAllMachines();
  } finally {
    isLoadingMachines.value = false;
  }
};

// Función para cargar todas las máquinas (fallback)
const loadAllMachines = async () => {
  try {
    const allMachines = await MachineryApiService.getAllMachines();
    if (allMachines && allMachines.length > 0) {
      machines.value = allMachines;
      machinesError.value = '';
    } else {
      // Si no hay máquinas en el sistema, mostrar datos de ejemplo
      machines.value = exampleMachines;
      machinesError.value = 'Usando datos de ejemplo (no se encontraron máquinas en el sistema)';
    }
  } catch (error) {
    console.error('Error al cargar todas las máquinas:', error);
    // Datos de ejemplo como último recurso
    useExampleMachines();
  }
};

// Función para usar datos de ejemplo
const useExampleMachines = () => {
  machines.value = exampleMachines;
  machinesError.value = 'Usando datos de ejemplo (conexión con el servidor no disponible)';
};

// Abrir diálogo para guardar plantilla
const openSaveTemplateDialog = () => {
  templateName.value = store.planName || `Plantilla ${new Date().toLocaleDateString()}`;
  templateDescription.value = '';
  showSaveTemplateModal.value = true;
};

// Guardar como plantilla
const saveAsTemplate = async () => {
  if (!templateName.value.trim()) return;

  isSavingTemplate.value = true;
  try {
    const templateData = {
      name: templateName.value.trim(),
      metricId: String(store.parameter || 1),
      amount: Number(store.amount || 0),
      productionLineId: String(store.productionLineId || 1),
      plantLineId: String(store.plantId || 1),
      machines: store.machineIds.map(id => Number(id)),
      tasks: store.tasks.map(task => task.taskDescription)
    };

    await maintenancePlanTemplateService.createTemplate(templateData);
    emit('templateSaved', templateData);
    showSaveTemplateModal.value = false;

    TelemetryService.recordMetric({
      experimentName: 'US35-R',
      variant: 'Treatment',
      actionType: 'Template_Created',
      durationMilliseconds: 0,
      isSuccess: true,
      additionalData: JSON.stringify({ templateName: templateData.name })
    });

    // Recargar lista de plantillas
    await loadTemplates();
  } catch (error) {
    console.error('Error al guardar plantilla:', error);
  } finally {
    isSavingTemplate.value = false;
  }
};

// Función para probar la conexión a la API
const testApiConnection = async () => {
  try {
    const response = await fetch(import.meta.env.VITE_API_BASE_URL + '/api/v1/health', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Error en health check:', error);
    return false;
  }
};

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

  // Cargar máquinas reales desde el backend
  try {
    const allMachines = await MachineryApiService.getAllMachines();
    if (allMachines && allMachines.length > 0) {
      machines.value = allMachines;
      console.log(`Cargadas ${allMachines.length} máquinas del backend`);
    } else {
      // Solo usar datos de ejemplo si realmente no hay máquinas
      machines.value = exampleMachines;
      machinesError.value = 'Usando datos de ejemplo (no se encontraron máquinas en el sistema)';
    }
  } catch (error) {
    console.error('Error al cargar máquinas iniciales:', error);
    machines.value = exampleMachines;
    machinesError.value = 'Error al conectar con el servidor. Usando datos de ejemplo.';
  }

  // Cargar plantillas
  await loadTemplates();
});

watch(() => store.plantId, async (newVal) => {
  store.productionLineId = null;
  store.machineIds = [];
  productionLines.value = [];
  machines.value = [];
  machinesError.value = '';

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
  machinesError.value = '';

  if (newVal) {
    await loadMachinesForLine(newVal);
  }
}, { immediate: true });

const addTask = () => {
  if (newTaskInput.value.trim()) {
    store.addTask(newTaskInput.value.trim());
    newTaskInput.value = '';
  }
};

const submitPlan = async () => {
  try {
    const result = await store.submitWizard();
    const stats = getDurationAndStep();
    stats.lastStep = 'Enviar';
    
    TelemetryService.recordMetric({
      experimentName: 'US09-R | US07-R',
      variant: 'Treatment',
      actionType: 'Plan_Created',
      durationMilliseconds: stats.durationSeconds * 1000,
      isSuccess: true,
      additionalData: JSON.stringify({ lastStep: stats.lastStep })
    });

    emit('planCreated', result, stats);
    emit('close', { ...stats, isSubmit: true });
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
  max-width: 900px;
  margin: 0 auto;
}

.wizard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.wizard-header h2 {
  margin: 0;
  color: var(--clr-text, #333);
  font-family: var(--font-family-base, 'Montserrat', sans-serif);
  font-weight: 600;
}

.template-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.template-selector label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--clr-text, #333);
  white-space: nowrap;
}

.template-select {
  min-width: 200px;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.kpi-panel {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: var(--clr-surface, #f8f9fa);
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

/* Estados de carga y error */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  gap: 1rem;
  color: var(--clr-text-muted, #666);
}

.loading-state p {
  margin: 0;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  gap: 1rem;
  color: var(--color-error, #f44336);
  background: var(--color-error-bg, #fff5f5);
  border-radius: 8px;
  border: 1px solid var(--color-error, #f44336);
  margin-bottom: 1rem;
}

.error-state p {
  margin: 0;
  text-align: center;
}

.error-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.help-text {
  display: block;
  margin-top: 0.5rem;
  color: var(--clr-text-muted, #666);
  font-size: 0.85rem;
}

.help-text a {
  color: var(--clr-primary-500, #1565c0);
  cursor: pointer;
  text-decoration: underline;
}

.help-text a:hover {
  color: var(--clr-primary-700, #0d47a1);
}

/* Template Dialog */
.template-dialog :deep(.p-dialog-content) {
  padding: 1.5rem;
}

.template-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.button-group {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

/* Estilos responsivos */
@media (max-width: 768px) {
  .wizard-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-left {
    width: 100%;
  }

  .template-selector {
    flex-wrap: wrap;
  }

  .template-select {
    flex: 1;
    min-width: 150px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .kpi-panel {
    width: 100%;
    justify-content: center;
  }

  .error-actions {
    flex-direction: column;
    width: 100%;
  }

  .error-actions .p-button {
    width: 100%;
  }
}

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

/* Estilos para el multiselect deshabilitado */
:deep(.p-multiselect.p-disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>