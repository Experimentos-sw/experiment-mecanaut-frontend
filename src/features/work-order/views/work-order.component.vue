<script>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import RecordTableComponent from '@/shared/components/record-table.component.vue';
import InformationPanel from '@/shared/components/information-panel/information-panel.component.vue';
import InfoContainer from '@/shared/components/information-panel/info-container.component.vue';
import InfoSection from '@/shared/components/information-panel/info-section.component.vue';
import ButtonComponent from '@/shared/components/button.component.vue';
import WorkOrderFormModal from '../components/work-order-form-modal.component.vue';
import AssignTechniciansModal from '../components/assign-technicians-modal.component.vue';
import CloseWorkOrderModal from '../components/close-work-order-modal.component.vue';
import InventoryAlertModalComponent from '../components/inventory-alert-modal.component.vue';
import { WorkOrderService } from '../services/work-order.service';
import { PlantApiService } from '@/features/asset-management/services/plant-api.service';
import { ProductionLineApiService } from '@/features/asset-management/services/production-line-api.service';

export default {
  components: {
    RecordTableComponent,
    InformationPanel,
    InfoContainer,
    InfoSection,
    ButtonComponent,
    WorkOrderFormModal,
    AssignTechniciansModal,
    CloseWorkOrderModal,
    InventoryAlertModal: InventoryAlertModalComponent
  },
  setup() {
    // Estado
    const workOrders = ref([]);
    const selectedOrder = ref(null);
    const showInfoPanel = ref(false);
    const showCreateModal = ref(false);
    const showEditModal = ref(false);
    const showAssignTechniciansModal = ref(false);
    const showCloseOrderModal = ref(false);
    const showInventoryAlertModal = ref(false);
    const selectedPlant = ref(null);
    const selectedProductionLine = ref(null);
    const loading = ref(false);
    const loadingInfoPanel = ref(false);
    const loadingStart = ref(false);
    const missingParts = ref([]);

    // Datos para filtros
    const plants = ref([]);
    const productionLines = ref([]);

    // Datos para el panel de información
    const infoData = ref([]);
    const technicianData = ref([]);

    const { t } = useI18n();

    const columns = [
      { key: 'code', label: t('workOrder.table.code'), type: 'texto', searchable: true },
      { key: 'date', label: t('workOrder.table.date'), type: 'texto' },
      { key: 'type', label: t('workOrder.table.type'), type: 'texto', filterable: true },
      { key: 'status', label: t('workOrder.table.status'), type: 'texto', filterable: true },
      { key: 'assign', label: '', type: 'cta', ctaLabel: t('workOrder.table.assign'), ctaVariant: 'primary' },
      { key: 'details', label: '', type: 'cta', ctaLabel: t('workOrder.table.details'), ctaVariant: 'outline' }
    ];

    // Métodos
    const loadPlants = async () => {
      try {
        const data = await PlantApiService.getPlants();
        plants.value = data;
        // Si hay plantas, seleccionar la primera por defecto
        if (data.length > 0 && !selectedPlant.value) {
          selectedPlant.value = data[0].id;
        }
      } catch (error) {
        console.error('Error loading plants:', error);
      }
    };

    const loadProductionLines = async (plantId) => {
      try {
        if (!plantId) {
          productionLines.value = [];
          return;
        }
        const data = await ProductionLineApiService.getProductionLines(plantId);
        productionLines.value = data;
        // Resetear la selección de línea de producción
        selectedProductionLine.value = null;
      } catch (error) {
        console.error('Error loading production lines:', error);
      }
    };

    const loadWorkOrders = async () => {
      try {
        loading.value = true;
        let data;
        
        if (selectedProductionLine.value) {
          // Si hay línea de producción seleccionada, filtrar por ella
          data = await WorkOrderService.getOrders(selectedProductionLine.value);
        } else {
          // Si no hay línea seleccionada, cargar todas las órdenes
          data = await WorkOrderService.getOrders();
        }
        
        workOrders.value = data;
      } catch (error) {
        console.error('Error loading work orders:', error);
      } finally {
        loading.value = false;
      }
    };

    const updateInfoPanel = async (order) => {
      loadingInfoPanel.value = true;
      
      try {
        infoData.value = [
          { subtitle: t('workOrder.infoPanel.sections.generalInfo.code'), info: order.code },
          { subtitle: t('workOrder.infoPanel.sections.generalInfo.date'), info: order.date },
          { subtitle: t('workOrder.infoPanel.sections.generalInfo.type'), info: order.type },
          { subtitle: t('workOrder.infoPanel.sections.generalInfo.status'), info: order.status },
          { subtitle: t('workOrder.infoPanel.sections.generalInfo.productionLine'), info: order.productionLine }
        ];

        // Obtener información completa de los técnicos
        if (order.technicianIds && order.technicianIds.length > 0) {
          try {
            const allTechnicians = await WorkOrderService.getTechnicians();
            const assignedTechnicians = allTechnicians.filter(tech => 
              order.technicianIds.includes(tech.id)
            );
            
            if (assignedTechnicians.length > 0) {
              technicianData.value = assignedTechnicians.map(tech => ({
                subtitle: tech.fullName,
                info: `${tech.username} - ${tech.email}`
              }));
            } else {
              technicianData.value = [{
                subtitle: t('workOrder.infoPanel.sections.technicians.noTechnicians'),
                info: ''
              }];
            }
          } catch (error) {
            console.error('Error obteniendo información de técnicos:', error);
            technicianData.value = [{
              subtitle: t('workOrder.infoPanel.sections.technicians.noTechnicians'),
              info: ''
            }];
          }
        } else {
          technicianData.value = [{
            subtitle: t('workOrder.infoPanel.sections.technicians.noTechnicians'),
            info: ''
          }];
        }
      } finally {
        loadingInfoPanel.value = false;
      }
    };

    const handleCreate = async (formData) => {
      try {
        await WorkOrderService.createOrder(formData);
        showCreateModal.value = false;
        await loadWorkOrders();
      } catch (error) {
        console.error('Error al crear:', error);
      }
    };

    const handleEdit = async (formData) => {
      try {
        if (formData.id) {
          await WorkOrderService.updateOrder(formData.id, formData);
          showEditModal.value = false;
          selectedOrder.value = null;
          await loadWorkOrders();
        }
      } catch (error) {
        console.error('Error al actualizar:', error);
      }
      closePanel();
    };

    const handleAssignTechnicians = async (payload) => {
      try {
        console.log('Asignando técnicos:', payload);
        console.log('Order ID:', payload.orderId);
        console.log('Technician IDs:', payload.technicianIds);
        
        await WorkOrderService.assignTechnicians(payload.orderId, payload.technicianIds);
        console.log('Técnicos asignados exitosamente');
        
        showAssignTechniciansModal.value = false;
        selectedOrder.value = null;
        await loadWorkOrders();
      } catch (error) {
        console.error('Error al asignar técnicos:', error);
        console.error('Error details:', error.response?.data);
      }
    };

    const handleDelete = async (id) => {
      try {
        if (confirm(t('workOrder.form.confirmDelete'))) {
          await WorkOrderService.deleteOrder(id);
          showEditModal.value = false;
          selectedOrder.value = null;
          await loadWorkOrders();
        }
      } catch (error) {
        console.error('Error al eliminar:', error);
      }
      closePanel();
    };

    const handleComplete = async () => {
      showCloseOrderModal.value = false;
      selectedOrder.value = null;
      await loadWorkOrders();
      closePanel();
    };

    const handleStartOrder = async (orderId) => {
      try {
        loadingStart.value = true;
        
        // 1. Verificar stock
        const verification = await WorkOrderService.verifyStock(orderId);
        const hasMissingParts = verification.some(part => !part.hasSufficientStock);

        if (hasMissingParts) {
          missingParts.value = verification.filter(part => !part.hasSufficientStock);
          showInventoryAlertModal.value = true;
          return;
        }

        // 2. Si no hay faltantes, iniciar la orden
        await WorkOrderService.startOrder(orderId);
        
        // Recargar orden seleccionada
        const updatedOrder = await WorkOrderService.getOrder(orderId);
        selectedOrder.value = updatedOrder;
        await updateInfoPanel(updatedOrder);
        await loadWorkOrders();
      } catch (error) {
        console.error('Error al iniciar orden:', error);
        alert(error.response?.data?.message || 'Error al iniciar la orden de trabajo');
      } finally {
        loadingStart.value = false;
      }
    };

    const closePanel = () => {
      showInfoPanel.value = false;
      setTimeout(() => {
        selectedOrder.value = null;
      }, 300);
    };

    const handleCtaClick = async (event) => {
      const item = event.row;
      const columnKey = event.column.key;

      if (columnKey === 'assign') {
        selectedOrder.value = item;
        showAssignTechniciansModal.value = true;
      } else if (columnKey === 'details') {
        selectedOrder.value = item;
        await updateInfoPanel(item);
        showInfoPanel.value = true;
      }
    };

    const handleNewClick = () => {
      showCreateModal.value = true;
    };

    const handlePlantChange = async () => {
      await loadProductionLines(selectedPlant.value);
      await loadWorkOrders();
    };

    const handleProductionLineChange = async () => {
      await loadWorkOrders();
    };

    // Lifecycle hooks
    onMounted(async () => {
      await loadPlants();
      if (selectedPlant.value) {
        await loadProductionLines(selectedPlant.value);
      }
      await loadWorkOrders();
    });

    return {
      workOrders,
      selectedOrder,
      showInfoPanel,
      showCreateModal,
      showEditModal,
      showAssignTechniciansModal,
      showInventoryAlertModal,
      selectedPlant,
      selectedProductionLine,
      plants,
      productionLines,
      loading,
      loadingInfoPanel,
      loadingStart,
      missingParts,
      columns,
      infoData,
      technicianData,
      handleCreate,
      handleEdit,
      handleAssignTechnicians,
      handleDelete,
      handleCtaClick,
      handleNewClick,
      handlePlantChange,
      handleProductionLineChange,
      handleComplete,
      handleStartOrder,
      showCloseOrderModal,
      closePanel
    };
  }
};
</script>

<template>
  <div class="container">
    <div class="header-main">
      <h1>{{ $t('workOrder.title') }}</h1>
      <div class="divider"></div>
    </div>
    
    <div class="main-content">
      <div class="left-container">
        <!-- Filtros de Planta y Línea de Producción -->
        <div class="filters-section">
          <div class="filter-group">
            <label for="plant">{{ $t('workOrder.filters.plant') }}</label>
            <select 
              id="plant" 
              v-model="selectedPlant"
              @change="handlePlantChange"
              class="filter-select"
            >
              <option value="">{{ $t('workOrder.filters.selectPlant') }}</option>
              <option v-for="plant in plants" :key="plant.id" :value="plant.id">
                {{ plant.name }}
              </option>
            </select>
          </div>

          <div class="filter-group">
            <label for="productionLine">{{ $t('workOrder.filters.productionLine') }}</label>
            <select 
              id="productionLine" 
              v-model="selectedProductionLine"
              @change="handleProductionLineChange"
              class="filter-select"
              :disabled="!selectedPlant"
            >
              <option value="">{{ $t('workOrder.filters.allLines') }}</option>
              <option v-for="line in productionLines" :key="line.id" :value="line.id">
                {{ line.name }}
              </option>
            </select>
          </div>
        </div>

        <RecordTableComponent
          :columns="columns"
          :data="workOrders"
          :searchable-columns="['code']"
          :search-placeholder="$t('workOrder.search.placeholder')"
          :show-new-button="true"
          :new-label="$t('workOrder.search.newOrder')"
          :loading="loading"
          @cta-click="handleCtaClick"
          @new-click="handleNewClick"
        />
      </div>
      
      <div class="right-container" :class="{ 'show-panel': showInfoPanel }">
        <InformationPanel
          v-if="showInfoPanel && selectedOrder"
          :header-text="$t('workOrder.infoPanel.orderPrefix') + selectedOrder.code"
          :show-header="true"
          :show-primary-button="false"
        >
          <InfoContainer :title="$t('workOrder.infoPanel.sections.generalInfo.title')" :title-type="2">
            <InfoSection
              :info-type="2"
              :data="infoData"
            />
          </InfoContainer>

          <InfoContainer :title="$t('workOrder.infoPanel.sections.technicians.title')" :title-type="2">
            <div v-if="loadingInfoPanel" class="loading-technicians">
              <span class="loading-text">{{ $t('workOrder.form.assignTechnicians.loading') }}</span>
            </div>
            <InfoSection
              v-else
              :info-type="2"
              :data="technicianData"
            />
          </InfoContainer>

          <div class="panel-actions">
            <!-- Botón para iniciar orden si está pendiente -->
            <ButtonComponent
              v-if="selectedOrder.status === 'Pending'"
              variant="primary"
              size="sm"
              icon-left="pi pi-play"
              :disabled="loadingStart"
              @clicked="handleStartOrder(selectedOrder.id)"
            >
              Iniciar Orden
            </ButtonComponent>

            <!-- Botón para cerrar orden si está en progreso -->
            <ButtonComponent
              v-if="selectedOrder.status === 'InProgress'"
              variant="primary"
              size="sm"
              icon-left="pi pi-check"
              @clicked="showCloseOrderModal = true"
            >
              Cerrar Orden
            </ButtonComponent>

            <ButtonComponent
              variant="warning"
              size="sm"
              icon-left="pi pi-times"
              @clicked="closePanel"
            >
              {{ $t('workOrder.infoPanel.close') }}
            </ButtonComponent>
          </div>
        </InformationPanel>
      </div>
    </div>

    <!-- Modales -->
    <WorkOrderFormModal
      v-if="showCreateModal"
      :is-edit="false"
      :order-data="null"
      :selected-production-line="selectedProductionLine"
      :selected-plant-id="selectedPlant"
      @submit="handleCreate"
      @cancel="showCreateModal = false"
    />

    <WorkOrderFormModal
      v-if="showEditModal"
      :is-edit="true"
      :order-data="selectedOrder"
      :selected-production-line="selectedProductionLine"
      :selected-plant-id="selectedPlant"
      @submit="handleEdit"
      @delete="handleDelete"
      @cancel="showEditModal = false"
    />

    <AssignTechniciansModal
      v-if="showAssignTechniciansModal"
      :order-data="selectedOrder"
      @submit="handleAssignTechnicians"
      @cancel="showAssignTechniciansModal = false"
    />

    <CloseWorkOrderModal
      v-if="showCloseOrderModal"
      v-model="showCloseOrderModal"
      :order-id="selectedOrder?.id"
      @completed="handleComplete"
    />

    <InventoryAlertModal
      v-if="showInventoryAlertModal"
      v-model="showInventoryAlertModal"
      :missing-parts="missingParts"
    />
  </div>
</template>

<style scoped lang="scss">
* {
  font-family: var(--font-family-base);
}

.container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  height: 100%;
}

.header-main {
  align-items: center;
  width: 100%;
  margin-bottom: 20px;

  h1 {
    color: var(--clr-text);
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
  }

  .divider {
    margin-top: 1rem;
    height: 2px;
    background: var(--clr-primary-300);
    width: 100%;
    border-radius: 2px;
  }
}

.main-content {
  display: flex;
  gap: 20px;
  height: calc(100% - 80px);
}

.left-container {
  flex: 3;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.filters-section {
  display: flex;
  gap: 20px;
  padding: 20px;
  background: var(--clr-surface);
  border: 1px solid var(--clr-grey-200);
  border-radius: var(--radius-md);
  box-shadow: 0 2px 4px var(--clr-shadow);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;

  label {
    font-weight: 500;
    color: var(--clr-text);
    font-size: 14px;
  }

  .filter-select {
    padding: 12px 16px;
    border: 2px solid var(--clr-grey-200);
    border-radius: 4px;
    background: var(--clr-bg);
    color: var(--clr-text);
    font-size: 14px;
    transition: all 0.2s ease;

    &:focus {
      outline: none;
      border-color: var(--clr-primary-500);
      box-shadow: 0 0 0 2px var(--clr-primary-100);
    }

    &:disabled {
      background: var(--clr-grey-050);
      cursor: not-allowed;
      color: var(--clr-grey-200);
    }
  }
}

.right-container {
  flex: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow: hidden;
  transition: all 0.3s ease;
  width: 0;
  
  &.show-panel {
    flex: 1;
    width: auto;
  }
}

.panel-actions {
  display: flex;
  gap: 0.5rem;
}

.loading-technicians {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px;
  background: var(--clr-surface);
  border: 1px solid var(--clr-grey-200);
  border-radius: var(--radius-md);

  .loading-text {
    color: var(--clr-grey-200);
    font-size: 14px;
  }
}

:deep(.button-component) {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}
</style>
