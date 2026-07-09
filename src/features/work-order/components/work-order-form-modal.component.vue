<script>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import ButtonComponent from '@/shared/components/button.component.vue';
import { WorkOrderService } from '../services/work-order.service';
import { InventoryPartsApiService } from '@/features/inventory-parts/services/inventory-parts-api.service';

export default {
  name: 'WorkOrderFormModal',
  components: {
    ButtonComponent
  },
  props: {
    isEdit: {
      type: Boolean,
      default: false
    },
    orderData: {
      type: Object,
      default: null
    },
    selectedProductionLine: {
      type: Number,
      default: null
    },
    selectedPlantId: {
      type: [Number, String],
      default: null
    }
  },
  emits: ['submit', 'delete', 'cancel'],
  setup(props, { emit }) {
    const { t } = useI18n();

    const formData = ref({
      code: '',
      date: '',
      productionLineId: '',
      machineIds: [],
      tasks: [],
      requiredParts: []
    });

    const availableMachines = ref([]);
    const loading = ref(false);
    const newTask = ref('');

    const inventoryParts = ref([]);
    const selectedPartId = ref('');
    const requiredQty = ref(1);

    const loadMachines = async (productionLineId) => {
      try {
        if (!productionLineId) {
          availableMachines.value = [];
          return;
        }
        
        loading.value = true;
        const machines = await WorkOrderService.getMachines(productionLineId);
        availableMachines.value = machines;
      } catch (error) {
        console.error('Error cargando maquinarias:', error);
        availableMachines.value = [];
      } finally {
        loading.value = false;
      }
    };

    const addTask = () => {
      if (newTask.value.trim()) {
        formData.value.tasks.push(newTask.value.trim());
        newTask.value = '';
      }
    };

    const removeTask = (index) => {
      formData.value.tasks.splice(index, 1);
    };

    const loadInventoryParts = async () => {
      try {
        const plantId = props.selectedPlantId || 1;
        const parts = await InventoryPartsApiService.getParts(plantId);
        inventoryParts.value = parts;
      } catch (error) {
        console.error('Error cargando repuestos de inventario:', error);
      }
    };

    onMounted(async () => {
      // Usar la línea de producción seleccionada del componente padre
      if (props.selectedProductionLine) {
        formData.value.productionLineId = props.selectedProductionLine;
        await loadMachines(props.selectedProductionLine);
      }
      
      await loadInventoryParts();
      
      if (props.orderData) {
        formData.value = {
          ...formData.value,
          id: props.orderData.id,
          code: props.orderData.code || '',
          date: props.orderData.date || '',
          productionLineId: props.orderData.productionLineId || props.selectedProductionLine,
          machineIds: [...(props.orderData.machineIds || [])],
          tasks: [...(props.orderData.tasks || [])],
          requiredParts: [...(props.orderData.requiredParts || [])]
        };
        
        // Cargar máquinas para la línea de producción de la orden
        if (formData.value.productionLineId) {
          await loadMachines(formData.value.productionLineId);
        }
      }
    });

    const toggleMachine = (machineId, event) => {
      const isChecked = event.target.checked;
      if (isChecked) {
        if (!formData.value.machineIds.includes(machineId)) {
          formData.value.machineIds.push(machineId);
        }
      } else {
        formData.value.machineIds = formData.value.machineIds.filter(id => id !== machineId);
      }
    };

    const handleSubmit = () => {
      const formDataForBackend = {
        ...formData.value,
        // Asegurar que los arrays estén presentes
        machineIds: formData.value.machineIds || [],
        tasks: formData.value.tasks || []
      };

      emit('submit', formDataForBackend);
    };

    const handleCancel = () => {
      emit('cancel');
    };

    const handleDelete = () => {
      if (confirm(t('workOrder.form.confirmDelete'))) {
        if (props.orderData?.id) {
          emit('delete', props.orderData.id);
        }
      }
    };

    const addRequiredPart = () => {
      if (!selectedPartId.value || requiredQty.value < 1) return;
      
      const existingIndex = formData.value.requiredParts.findIndex(
        item => item.inventoryPartId === Number(selectedPartId.value)
      );
      
      if (existingIndex !== -1) {
        formData.value.requiredParts[existingIndex].quantity += Number(requiredQty.value);
      } else {
        formData.value.requiredParts.push({
          inventoryPartId: Number(selectedPartId.value),
          quantity: Number(requiredQty.value)
        });
      }
      
      selectedPartId.value = '';
      requiredQty.value = 1;
    };

    const removeRequiredPart = (index) => {
      formData.value.requiredParts.splice(index, 1);
    };

    const getPartName = (partId) => {
      const part = inventoryParts.value.find(p => p.id === partId);
      return part ? part.name : `Repuesto #${partId}`;
    };

    return {
      formData,
      availableMachines,
      loading,
      newTask,
      addTask,
      removeTask,
      toggleMachine,
      handleSubmit,
      handleCancel,
      handleDelete,
      inventoryParts,
      selectedPartId,
      requiredQty,
      addRequiredPart,
      removeRequiredPart,
      getPartName
    };
  }
};
</script>

<template>
  <div class="modal-overlay">
    <div class="modal-container">
      <div class="modal-header">
        <h2>{{ isEdit ? $t('workOrder.form.title.edit') : $t('workOrder.form.title.new') }}</h2>
        <button class="close-button" @click="handleCancel" :aria-label="$t('workOrder.form.actions.cancel')">×</button>
      </div>

      <div class="modal-content">
        <form @submit.prevent="handleSubmit" class="form-container">
          <div class="form-group">
            <label for="code">{{ $t('workOrder.form.fields.code.label') }}</label>
            <input
              id="code"
              v-model="formData.code"
              type="text"
              required
              :disabled="isEdit"
              :placeholder="$t('workOrder.form.fields.code.placeholder')"
            />
          </div>

          <div class="form-group">
            <label for="date">{{ $t('workOrder.form.fields.date.label') }}</label>
            <input
              id="date"
              v-model="formData.date"
              type="date"
              required
            />
          </div>

          <div class="form-group">
            <label for="productionLineId">{{ $t('workOrder.form.fields.productionLine.label') }}</label>
            <input
              id="productionLineId"
              v-model="formData.productionLineId"
              type="text"
              disabled
              class="disabled-input"
            />
            <small class="hint">{{ $t('workOrder.form.fields.productionLine.hint') }}</small>
          </div>

          <div class="form-group">
            <label>{{ $t('workOrder.form.fields.machines.label') }}</label>
            <div v-if="loading" class="loading-machines">
              <span class="loading-text">{{ $t('workOrder.form.fields.machines.loading') }}</span>
            </div>
            <div v-else-if="availableMachines.length === 0" class="no-machines">
              <span class="no-machines-text">{{ $t('workOrder.form.fields.machines.noMachines') }}</span>
            </div>
            <div v-else class="machines-checkboxes">
              <div v-for="machine in availableMachines" :key="machine.id" class="checkbox-item">
                <input
                  type="checkbox"
                  :id="`machine_${machine.id}`"
                  :checked="formData.machineIds.includes(machine.id)"
                  @change="toggleMachine(machine.id, $event)"
                />
                <label :for="`machine_${machine.id}`">
                  <div class="machine-info">
                    <span class="machine-name">{{ machine.name }}</span>
                    <span class="machine-details">{{ machine.model }} - {{ machine.manufacturer }}</span>
                    <span class="machine-status" :class="`status-${machine.status.toLowerCase()}`">
                      {{ machine.status }}
                    </span>
                  </div>
                </label>
              </div>
            </div>
            <small class="hint">{{ $t('workOrder.form.fields.machines.hint') }}</small>
          </div>

          <div class="form-group">
            <label>{{ $t('workOrder.form.fields.tasks.label') }}</label>
            <div class="tasks-container">
              <div class="task-input">
                <input
                  v-model="newTask"
                  type="text"
                  :placeholder="$t('workOrder.form.fields.tasks.placeholder')"
                  @keyup.enter="addTask"
                />
                <button type="button" class="add-task-button" @click="addTask">
                  {{ $t('workOrder.form.fields.tasks.add') }}
                </button>
              </div>
              
              <div v-if="formData.tasks.length > 0" class="tasks-list">
                <div v-for="(task, index) in formData.tasks" :key="index" class="task-item">
                  <span class="task-text">{{ task }}</span>
                  <button type="button" class="remove-task-button" @click="removeTask(index)">
                    ×
                  </button>
                </div>
              </div>
              
              <div v-else class="empty-tasks">
                <span class="empty-icon">📝</span>
                <p>{{ $t('workOrder.form.fields.tasks.emptyState') }}</p>
              </div>
            </div>
          </div>

          <!-- Nueva Sección de Repuestos Requeridos (US11-R) -->
          <div class="form-group">
            <label>Repuestos Requeridos</label>
            <div class="required-parts-container">
              <div class="part-add-row flex gap-2 mb-3">
                <select v-model="selectedPartId" class="part-select flex-1">
                  <option value="">-- Seleccionar Repuesto --</option>
                  <option v-for="part in inventoryParts" :key="part.id" :value="part.id">
                    {{ part.name }} (Código: {{ part.code }}) - Stock: {{ part.currentStock }}
                  </option>
                </select>
                <input
                  v-model.number="requiredQty"
                  type="number"
                  min="1"
                  placeholder="Cant"
                  style="width: 80px;"
                  class="qty-input"
                />
                <button type="button" class="add-part-button button-add" @click="addRequiredPart">
                  Agregar
                </button>
              </div>

              <!-- Listado de repuestos agregados -->
              <div v-if="formData.requiredParts.length > 0" class="parts-list">
                <div v-for="(item, index) in formData.requiredParts" :key="index" class="part-item flex justify-content-between align-items-center mb-2">
                  <div class="part-item-details">
                    <span class="part-item-name font-semibold" style="color: var(--clr-text);">{{ getPartName(item.inventoryPartId) }}</span>
                    <span class="part-item-qty text-sm text-color-secondary ml-2" style="margin-left: 8px; color: var(--clr-grey-200);">({{ item.quantity }} requeridos)</span>
                  </div>
                  <button type="button" class="remove-part-button" style="background: none; border: none; font-size: 20px; color: var(--clr-grey-200); cursor: pointer;" @click="removeRequiredPart(index)">
                    ×
                  </button>
                </div>
              </div>
              <div v-else class="empty-parts text-center p-3">
                <span class="empty-icon" style="font-size: 24px;">⚙️</span>
                <p style="margin: 4px 0 0; font-size: 14px; color: var(--clr-grey-200);">No se han asignado repuestos a esta orden.</p>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <ButtonComponent
          variant="outline"
          @clicked="handleCancel"
        >
          {{ $t('workOrder.form.actions.cancel') }}
        </ButtonComponent>
        
        <ButtonComponent
          v-if="isEdit"
          variant="danger"
          @clicked="handleDelete"
          :aria-label="$t('workOrder.form.actions.delete')"
        >
          {{ $t('workOrder.form.actions.delete') }}
        </ButtonComponent>
        
        <ButtonComponent
          variant="primary"
          @clicked="handleSubmit"
        >
          {{ isEdit ? $t('workOrder.form.actions.save') : $t('workOrder.form.actions.create') }}
        </ButtonComponent>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-container {
    background: var(--clr-bg);
    border-radius: var(--radius-md);
    box-shadow: 0 4px 10px var(--clr-shadow);
    border: 1px solid var(--clr-grey-200);
    width: 700px;
    max-width: 95vw;
    max-height: 90vh;
    overflow-y: auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--clr-primary-300);

    h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
        color: var(--clr-primary-500);
        letter-spacing: -0.5px;
    }

    .close-button {
        background: none;
        border: none;
        font-size: 1.8rem;
        cursor: pointer;
        color: var(--clr-text);
        opacity: 0.7;
        transition: all 0.2s ease;
        padding: 4px;
        border-radius: 4px;

        &:hover {
            opacity: 1;
            background-color: var(--clr-grey-100);
        }
    }
}

.modal-content {
    .form-container {
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;

        label {
            font-weight: 500;
            color: var(--clr-text);
            font-size: 14px;
            margin-bottom: 4px;
        }

        input, select {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid var(--clr-grey-200);
            border-radius: 4px;
            background: var(--clr-bg);
            color: var(--clr-text);
            font-size: 14px;
            transition: all 0.2s ease;
            box-sizing: border-box;

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

            &::placeholder {
                color: var(--clr-grey-200);
            }
        }

        .disabled-input {
            background: var(--clr-primary-100);
            border-color: var(--clr-primary-300);
            color: var(--clr-primary-500);
            font-weight: 500;
        }
    }

    .loading-machines,
    .no-machines {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 32px;
        background: var(--clr-surface);
        border: 1px solid var(--clr-grey-200);
        border-radius: var(--radius-md);

        .loading-text,
        .no-machines-text {
            color: var(--clr-grey-200);
            font-size: 14px;
        }
    }

    .machines-checkboxes {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 12px;
        margin-top: 8px;

        .checkbox-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px 16px;
            border: 1px solid var(--clr-grey-200);
            border-radius: 4px;
            background: var(--clr-bg);
            transition: all 0.2s ease;
            cursor: pointer;

            &:hover {
                border-color: var(--clr-primary-300);
                background: var(--clr-primary-100);
            }

            input[type="checkbox"] {
                width: auto;
                margin: 0;
                margin-top: 2px;
                cursor: pointer;

                &:checked {
                    accent-color: var(--clr-primary-500);
                }
            }

            label {
                margin: 0;
                cursor: pointer;
                flex: 1;
            }

            .machine-info {
                display: flex;
                flex-direction: column;
                gap: 4px;

                .machine-name {
                    font-size: 14px;
                    color: var(--clr-text);
                    font-weight: 500;
                }

                .machine-details {
                    font-size: 12px;
                    color: var(--clr-grey-200);
                }

                .machine-status {
                    font-size: 11px;
                    font-weight: 500;
                    padding: 2px 6px;
                    border-radius: 10px;
                    text-transform: uppercase;
                    width: fit-content;

                    &.status-operational {
                        background: var(--clr-success-100);
                        color: var(--clr-success-500);
                    }

                    &.status-maintenance {
                        background: var(--clr-warning-100);
                        color: var(--clr-warning-500);
                    }

                    &.status-offline {
                        background: var(--clr-danger-100);
                        color: var(--clr-danger-500);
                    }
                }
            }
        }
    }

    .tasks-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .task-input {
        display: flex;
        gap: 12px;

        input {
            flex: 1;
        }

        .add-task-button {
            background: var(--clr-primary-500);
            color: var(--clr-bg);
            border: none;
            border-radius: 4px;
            padding: 12px 16px;
            cursor: pointer;
            font-weight: 500;
            font-size: 14px;
            transition: all 0.2s ease;
            white-space: nowrap;

            &:hover {
                background: var(--clr-primary-400);
            }
        }
    }

    .tasks-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .task-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--clr-surface);
        border: 1px solid var(--clr-grey-200);
        border-radius: 4px;
        transition: all 0.2s ease;

        &:hover {
            border-color: var(--clr-primary-300);
        }

        .task-text {
            flex: 1;
            color: var(--clr-text);
            font-size: 14px;
        }

        .remove-task-button {
            background: none;
            border: none;
            color: var(--clr-danger-500);
            font-size: 18px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s ease;

            &:hover {
                background-color: var(--clr-danger-050);
            }
        }
    }

    .empty-tasks {
        background: var(--clr-surface);
        border: 2px dashed var(--clr-grey-200);
        border-radius: var(--radius-md);
        padding: 32px;
        text-align: center;
        color: var(--clr-grey-200);

        .empty-icon {
            font-size: 48px;
            display: block;
            margin-bottom: 16px;
        }

        p {
            margin: 0;
            font-size: 14px;
        }
    }

    .hint {
        color: var(--clr-grey-200);
        font-size: 12px;
        margin-top: 4px;
        display: block;
    }
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 16px;
    padding-top: 24px;
    border-top: 1px solid var(--clr-grey-100);
}

.required-parts-container {
    background: var(--clr-surface, #ffffff);
    border: 1px solid var(--clr-grey-200, #e5e7eb);
    border-radius: var(--radius-md, 8px);
    padding: 16px;
}

.part-select {
    padding: 10px 14px;
    border: 2px solid var(--clr-grey-200);
    border-radius: 4px;
    background: var(--clr-bg);
    color: var(--clr-text);
    font-size: 14px;
}

.qty-input {
    padding: 10px;
    border: 2px solid var(--clr-grey-200);
    border-radius: 4px;
    background: var(--clr-bg);
    color: var(--clr-text);
    text-align: center;
    font-size: 14px;
}

.button-add {
    background-color: var(--clr-primary-500, #2563eb);
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
    
    &:hover {
        background-color: var(--clr-primary-600, #1d4ed8);
    }
}

.part-item {
    background-color: var(--clr-grey-050, #f9fafb);
    border: 1px solid var(--clr-grey-200, #e5e7eb);
    border-radius: 6px;
    padding: 10px 16px;
}

.flex {
    display: flex;
}

.flex-1 {
    flex: 1;
}

.gap-2 {
    gap: 8px;
}

.mb-2 {
    margin-bottom: 8px;
}

.mb-3 {
    margin-bottom: 12px;
}

.justify-content-between {
    justify-content: space-between;
}

.align-items-center {
    align-items: center;
}

.font-semibold {
    font-weight: 600;
}

.text-sm {
    font-size: 12px;
}

.text-center {
    text-align: center;
}

.p-3 {
    padding: 12px;
}
</style>

