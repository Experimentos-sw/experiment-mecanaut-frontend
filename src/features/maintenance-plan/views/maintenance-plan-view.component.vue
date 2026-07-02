<template>
  <div class="container">
    <header class="breadcrumb-header">
      <h1>Planes de Mantenimiento</h1>
    </header>

    <!-- Selectores de filtrado -->
    <div class="filters-container">
      <div class="filter-group">
        <label for="plant-selector">Planta:</label>
        <select 
          id="plant-selector" 
          v-model="selectedPlantId" 
          @change="onPlantChange"
          class="filter-select">
          <option value="">Todas las plantas</option>
          <option 
            v-for="plant in plants" 
            :key="plant.id" 
            :value="plant.id">
            {{ plant.name }}
          </option>
        </select>
      </div>
      
      <div class="filter-group">
        <label for="production-line-selector">Línea de Producción:</label>
        <select 
          id="production-line-selector" 
          v-model="selectedProductionLineId" 
          @change="onProductionLineChange"
          class="filter-select"
          :disabled="!selectedPlantId">
          <option value="">Todas las líneas</option>
          <option 
            v-for="line in productionLines" 
            :key="line.id" 
            :value="line.id">
            {{ line.name }} ({{ line.code }})
          </option>
        </select>
      </div>
    </div>

    <main class="main-container">
      <div class="search-container" :class="{'full-width': !showDetailPanel}">
        <!-- El componente app-record-table ya implementa la búsqueda internamente -->
        
        <div v-if="loading && !showDetailPanel" class="loading-indicator">
          Cargando datos...
        </div>
        
        <div v-if="error && !showDetailPanel" class="error-message">
          {{ error }}
          <button @click="loadPlans()">Reintentar</button>
        </div>
        
        <div v-if="!loading && !error" class="table-container">
          <app-record-table
            :columns="tableColumns"
            :data="filteredPlansData"
            :search-placeholder="'Buscar plan de mantenimiento...'"
            :new-label="'Plan'"
            :searchable-columns="['dynamicPlanId', 'planName', 'parameter', 'maxValue']"
            :show-new-button="true"
            @search="onSearch"
            @filter-change="onFilterChange"
            @new-click="openNewPlanModal"
            @ctaClick="onRowClick">
          </app-record-table>
        </div>
      </div>
      
      <!-- Panel de información -->
      <div v-if="showDetailPanel" class="information-panel-container">
        <div class="panel-header">
          <button class="close-button" @click="closeDetailPanel">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        
        <div v-if="loading" class="loading-indicator">
          Cargando información del plan...
        </div>
        
        <div v-if="!loading && selectedPlan">
          <app-information-panel
            :headerText="'Plan: ' + selectedPlan.planName + ' (ID: ' + selectedPlan.dynamicPlanId + ')'"
            :showHeader="true"
            :showPrimaryButton="true"
            :primaryButtonText="'Editar'">
            
            <app-info-section 
              :infoType="2" 
              :data="planInfoData">
            </app-info-section>
            
            <app-info-container 
              :title="'Tareas del Plan'" 
              :titleType="1">
              <app-info-list-items 
                :type="'simpleList'" 
                :items="planTasksItems">
              </app-info-list-items>
            </app-info-container>
          </app-information-panel>
        </div>
      </div>
    </main>

    <!-- Modal de selección de tipo de plan -->
    <choose-plan-type-modal 
      v-if="showChoosePlanModal" 
      @close="closeChoosePlanModal" 
      @select="openPlanForm" 
    />

    <!-- Modal de formulario para plan dinámico (Wizard) -->
    <div v-if="showDynamicForm" class="wizard-overlay">
      <plan-wizard 
        @close="closeDynamicForm" 
        @planCreated="onPlanCreated" 
      />
    </div>

    <!-- Modal de formulario para plan estático -->
    <static-plan-form 
      v-if="showStaticForm" 
      @close="closeStaticForm" 
      @planCreated="onPlanCreated" 
    />
    <!-- Encuesta Post-Tarea -->
    <Dialog v-model:visible="showSurveyDialog" :modal="false" position="bottomright" :closable="true" :dismissableMask="true" header="¿Qué tan fácil fue usar el Wizard?">
      <div class="flex flex-column align-items-center gap-3 p-3">
        <Rating v-model="surveyRating" @change="submitSurvey" :cancel="false" />
      </div>
    </Dialog>
  </div>
</template>

<script setup>

import { ref, onMounted, computed } from 'vue';
import { maintenancePlanService } from '../services/maintenance-plan.service.js';
import { maintenanceDynamicPlanService } from '../services/maintenance-dynamic-plan.service.js';
import { MaintenancePlanModel, MaintenancePlanItemModel, MaintenancePlanTaskModel } from "../models/maintenance-plan.model.js";
import { MaintenancePlanListResponse } from "../models/maintenance-plan.response.js";
import { TelemetryService } from '../../../core/services/telemetry.service.js';

import Dialog from 'primevue/dialog';
import Rating from 'primevue/rating';

// Componentes importados con rutas relativas correctas
import AppRecordTable from '../../../shared/components/record-table.component.vue';
import AppInformationPanel from '../../../shared/components/information-panel/information-panel.component.vue';
import AppInfoSection from '../../../shared/components/information-panel/info-section.component.vue';
import AppInfoContainer from '../../../shared/components/information-panel/info-container.component.vue';
import AppInfoListItems from '../../../shared/components/information-panel/info-list-items.component.vue';

// Componentes para el flujo de creación de planes
import ChoosePlanTypeModal from '../components/choose-plan-type-modal.component.vue';
import PlanWizard from '../components/plan-wizard.component.vue';
import StaticPlanForm from '../components/static-plan-form.component.vue';

// Variables reactivas
const allPlansData = ref([]);
const filteredPlansData = ref([]);
const showDetailPanel = ref(false);
const selectedPlan = ref(null);
const planTasksItems = ref([]);

// Telemetría
const showSurveyDialog = ref(false);
const surveyRating = ref(0);
const lastSurveyAction = ref('');
const lastPlanId = ref(0);

const submitSurvey = async () => {
  if (surveyRating.value > 0) {
    showSurveyDialog.value = false;
    await TelemetryService.sendSurvey({
      maintenancePlanId: lastPlanId.value || 0,
      rating: surveyRating.value,
      variant: 'guided_wizard',
      action: lastSurveyAction.value
    });
    surveyRating.value = 0; // reset
  }
};
const planInfoData = ref([]);
const loading = ref(false);
const error = ref('');

// Variables para los selectores
const plants = ref([]);
const productionLines = ref([]);
const selectedPlantId = ref('');
const selectedProductionLineId = ref('');

// Estados para los modales
const showChoosePlanModal = ref(false);
const showDynamicForm = ref(false);
const showStaticForm = ref(false);

// Estado para la búsqueda y filtrado
const searchQuery = ref('');
const activeFilters = ref({});

// Configuración de filtros para el componente de búsqueda
const searchFilters = [
  {
    label: 'Parámetro',
    value: 'parameter',
    options: [
      { label: 'Todos', value: '' },
      { label: 'Kilometraje', value: '1' },
      { label: 'Temperatura', value: '2' },
      { label: 'Presión', value: '3' },
      { label: 'Vibración', value: '4' }
    ]
  },
  {
    label: 'Número de tareas',
    value: 'taskCount',
    options: [
      { label: 'Todos', value: '' },
      { label: '1 tarea', value: 1 },
      { label: '2-3 tareas', value: '2-3' },
      { label: 'Más de 3 tareas', value: '4+' }
    ]
  }
];



// Filtra los planes según la búsqueda y filtros activos
const filterPlans = () => {
  if (!allPlansData.value.length) {
    filteredPlansData.value = [];
    return;
  }
  
  let filtered = [...allPlansData.value];
  
  // Filtrar por texto de búsqueda
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(plan => 
      plan.planName?.toLowerCase().includes(query) || 
      plan.dynamicPlanId?.toString().includes(query) ||
      getParameterName(plan.parameter)?.toLowerCase().includes(query) ||
      plan.amount?.toString().includes(query)
    );
  }
  
  // Filtrar por planta (si se selecciona una planta específica)
  if (selectedPlantId.value) {
    // Por ahora filtramos por línea de producción, pero en el futuro
    // podríamos tener un campo plantId en los planes
    if (selectedProductionLineId.value) {
      // Para planes dinámicos, podríamos filtrar por máquinas que pertenezcan a la línea
      // Por ahora no aplicamos este filtro ya que no tenemos esa relación
    }
  }
  
  // Filtrar por parámetro
  if (activeFilters.value.parameter) {
    filtered = filtered.filter(plan => 
      plan.parameter === activeFilters.value.parameter
    );
  }
  
  // Filtrar por número de tareas
  if (activeFilters.value.taskCount) {
    const taskCountFilter = activeFilters.value.taskCount;
    
    if (taskCountFilter === 1) {
      filtered = filtered.filter(plan => (plan.tasks ? plan.tasks.length : 0) === 1);
    } else if (taskCountFilter === '2-3') {
      filtered = filtered.filter(plan => {
        const taskCount = plan.tasks ? plan.tasks.length : 0;
        return taskCount >= 2 && taskCount <= 3;
      });
    } else if (taskCountFilter === '4+') {
      filtered = filtered.filter(plan => (plan.tasks ? plan.tasks.length : 0) >= 4);
    }
  }
  
  filteredPlansData.value = filtered;
};


// Función para cargar plantas
const loadPlants = async () => {
  try {
    const plantsData = await maintenanceDynamicPlanService.getPlants();
    plants.value = plantsData;
    console.log('Plantas cargadas:', plantsData);
  } catch (error) {
    console.error('Error al cargar plantas:', error);
    plants.value = [];
  }
};

// Función para cargar líneas de producción
const loadProductionLines = async (plantId) => {
  try {
    if (!plantId) {
      productionLines.value = [];
      return;
    }
    
    const linesData = await maintenanceDynamicPlanService.getProductionLines(plantId);
    productionLines.value = linesData;
    console.log('Líneas de producción cargadas:', linesData);
  } catch (error) {
    console.error('Error al cargar líneas de producción:', error);
    productionLines.value = [];
  }
};

// Manejador de cambio de planta
const onPlantChange = async () => {
  selectedProductionLineId.value = ''; // Resetear línea de producción
  await loadProductionLines(selectedPlantId.value);
  await loadPlans(); // Recargar planes con el nuevo filtro de planta
};

// Manejador de cambio de línea de producción
const onProductionLineChange = () => {
  filterPlans(); // Reaplicar filtros
};

const loadDynamicPlans = async () => {
  try {
    const dynamicPlans = await maintenanceDynamicPlanService.getAllPlans();
    console.log('Planes dinámicos de mantenimiento:', dynamicPlans);
    

    if (dynamicPlans && dynamicPlans.length) {
      dynamicPlans.forEach((plan, index) => {
        console.log(`--- Plan dinámico #${index + 1} ---`);
        console.log('ID:', plan.dynamicPlanId);
        console.log('Nombre:', plan.planName);
        console.log('Máquinas IDs:', plan.machineIds);
        console.log('Parámetro:', plan.parameter);
        console.log('Creador:', plan.userCreator);
        console.log('Tareas:');
        
        if (plan.tasks && plan.tasks.length) {
          plan.tasks.forEach((task, taskIndex) => {
            console.log(`  Tarea ${taskIndex + 1}:`);
            console.log(`    ID: ${task.taskId}`);
            console.log(`    Nombre: ${task.taskName}`);
            console.log(`    Descripción: ${task.taskDescription}`);
            console.log(`    Máquinas: ${JSON.stringify(task.machineIds)}`);
          });
        }
        
        console.log('------------------------');
      });
    }
  } catch (error) {
    console.error('Error al cargar planes dinámicos:', error);
  }
};


const tableColumns = ref([
  { key: 'dynamicPlanId', label: 'ID', type: 'texto' },
  { key: 'planName', label: 'Nombre', type: 'texto' },
  { key: 'parameter', label: 'Parámetro', type: 'texto' },
  { key: 'amount', label: 'Mantenimiento cada', type: 'texto' },
  { key: 'actions', label: 'Acciones', type: 'cta', ctaLabel: 'Ver', ctaVariant: 'primary' }
]);

// Funciones para la búsqueda y filtrado
const onSearch = (query) => {
  searchQuery.value = query;
  filterPlans();
};

const onFilterChange = (filters) => {
  activeFilters.value = filters;
  filterPlans();
};

// Funciones para los planes estáticos
const loadPlans = async () => {
  loading.value = true;
  error.value = '';
  try {
    // Usar el servicio real con el plantLineId seleccionado
    const plantLineId = selectedPlantId.value || null;
    const dynamicPlans = await maintenanceDynamicPlanService.getAllPlans(plantLineId);
    
    // Convertir los planes dinámicos al formato esperado por la tabla
    allPlansData.value = dynamicPlans.map(plan => ({
      dynamicPlanId: plan.dynamicPlanId,
      planName: plan.planName,
      parameter: plan.parameter,
      amount: plan.amount,
      machineIds: plan.machineIds,
      tasks: plan.tasks,
      userCreator: plan.userCreator
    }));
    
    filterPlans(); // Aplicar filtros a los datos cargados
  } catch (err) {
    error.value = err?.message ?? 'Error inesperado';
    allPlansData.value = [];
    filteredPlansData.value = [];
  } finally {
    loading.value = false;
  }
};

// Funciones para el manejo de modales
const openNewPlanModal = () => {
  // Ir directamente al formulario de plan dinámico
  showDynamicForm.value = true;
};

const closeChoosePlanModal = () => {
  showChoosePlanModal.value = false;
};

const openPlanForm = (planType) => {
  if (planType === 'dynamic') {
    showDynamicForm.value = true;
  } else if (planType === 'static') {
    showStaticForm.value = true;
  }
  closeChoosePlanModal();
};

const closeDynamicForm = () => {
  showDynamicForm.value = false;
  lastSurveyAction.value = 'ABANDON';
  lastPlanId.value = 0;
  showSurveyDialog.value = true;
};

const closeStaticForm = () => {
  showStaticForm.value = false;
};

const onPlanCreated = async (plan) => {
  // Recargar los planes después de crear uno nuevo
  await loadPlans();
  await loadDynamicPlans();
  
  lastSurveyAction.value = 'SUCCESS';
  lastPlanId.value = plan?.id || 0;
  showSurveyDialog.value = true;
};

const onRowClick = ({ row }) => { 
  selectedPlan.value = row;
  
  // Preparar datos para el panel de información
  planInfoData.value = [
    { subtitle: 'ID del Plan', info: row.dynamicPlanId },
    { subtitle: 'Nombre', info: row.planName },
    { subtitle: 'Parámetro', info: getParameterName(row.parameter) },
    { subtitle: 'Mantenimiento cada', info: row.amount },
    { subtitle: 'Máquinas', info: row.machineIds ? row.machineIds.join(', ') : 'N/A' },
    { subtitle: 'Creado por', info: row.userCreator }
  ];
  
  // Preparar las tareas para el panel
  planTasksItems.value = [];
  if (row.tasks && Array.isArray(row.tasks)) {
    row.tasks.forEach(task => {
      planTasksItems.value.push({
        model: task.taskDescription || task.taskName || 'Tarea sin descripción'
      });
    });
  }
  
  showDetailPanel.value = true;
};

// Función auxiliar para obtener el nombre del parámetro
const getParameterName = (parameterId) => {
  const parameterMap = {
    '1': 'Kilometraje',
    '2': 'Temperatura',
    '3': 'Presión',
    '4': 'Vibración'
  };
  return parameterMap[parameterId] || parameterId;
};

const closeDetailPanel = () => {
  showDetailPanel.value = false;
  selectedPlan.value = null;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

onMounted(() => {
  loadPlans();
  loadPlants(); // Cargar plantas al iniciar
});
</script>

<style scoped>
.wizard-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.container {
  height: 100%;
  min-height: 100vh;
  box-sizing: border-box;
  background: var(--clr-bg, #f5f7f9);
  transition: background 0.3s;
  padding: 1.5rem;
}

.filters-container {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: var(--clr-surface, #fff);
  border-radius: var(--radius-md, 8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--clr-shadow, rgba(0,0,0,0.1));
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 180px;
}

.filter-group label {
  font-weight: 600;
  color: var(--clr-text, #333);
  font-size: 0.85rem;
  white-space: nowrap;
}

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--clr-border, #ddd);
  border-radius: var(--radius-sm, 4px);
  background-color: var(--clr-surface, #fff);
  color: var(--clr-text, #333);
  font-size: 0.85rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  min-width: 120px;
}

.filter-select:focus {
  outline: none;
  border-color: var(--clr-primary, #007bff);
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.filter-select:disabled {
  background-color: var(--clr-disabled, #f5f5f5);
  color: var(--clr-text-muted, #999);
  cursor: not-allowed;
}

.breadcrumb-header {
  margin-bottom: 2em;
}

.main-container {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 2.5em;
  min-height: 80vh;
  width: 100%;
  transition: gap 0.3s;
}

.search-container {
  display: flex;
  flex-direction: column;
  gap: 2em;
  width: 72%;
  height: 100%;
  transition: width 0.3s ease;
}

.search-container.full-width {
  width: 100% !important;
}

.table-container {
  padding: 1em;
  border: 1px solid var(--clr-shadow, rgba(0,0,0,0.1));
  border-radius: var(--radius-md, 8px);
  height: 100%;
  min-width: 0;
  overflow: hidden;
  transition: box-shadow 0.3s, border 0.3s;
  background-color: var(--clr-surface, #fff);
}

.information-panel-container {
  width: 28%;
  border-radius: var(--radius-md, 8px);
  min-height: 70vh;
  transition: box-shadow 0.3s, border 0.3s, width 0.3s;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  overflow: hidden;
  position: relative;
  background-color: var(--clr-surface, #fff);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.panel-header {
  position: absolute;
  top: 0.5em;
  right: 0.5em;
  z-index: 2;
}

.close-button {
  background: transparent;
  border: none;
  color: var(--clr-text, #333);
  font-size: 1.5em;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.close-button:hover {
  opacity: 1;
}

.loading-indicator {
  text-align: center;
  padding: 2rem;
  color: var(--clr-gris2, #666);
}

.error-message {
  text-align: center;
  padding: 1rem;
  color: var(--clr-error, #f44336);
  background-color: var(--clr-surface, #fff);
  border-radius: var(--radius-md, 8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Tablet: apila los paneles */
@media (max-width: 1024px) {
  .main-container {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5em;
    min-height: unset;
  }
  .search-container,
  .information-panel-container {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
  .information-panel-container {
    margin-top: 0.5em;
    height: auto;
    min-height: 50vh;
  }
  
  .filters-container {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
  }
  
  .filter-group {
    min-width: unset;
    width: 100%;
    justify-content: space-between;
  }
}

/* Móvil */
@media (max-width: 600px) {
  .container {
    padding: 1em 0.2em;
  }
  .breadcrumb-header {
    margin-bottom: 1em;
  }
  .main-container {
    gap: 1em;
  }
  .table-container,
  .information-panel-container {
    border-radius: 12px;
    box-shadow: 0 1px 4px 0 var(--clr-shadow, rgba(0,0,0,0.1));
  }
  .information-panel-container {
    margin-top: 0.5em;
  }
}
</style>
