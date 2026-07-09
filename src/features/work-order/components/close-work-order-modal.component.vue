<template>
  <Dialog
    v-model:visible="visible"
    header="Cerrar Orden de Trabajo"
    :style="{ width: '400px' }"
    :modal="true"
    class="p-fluid"
    @hide="closeModal"
  >
    <div class="p-4" :class="{ 'checklist-completed': isValid }">
      <p class="mb-4 text-color-secondary">
        Para cerrar la orden, debes completar la siguiente checklist:
      </p>

      <div class="flex align-items-center mb-3">
        <Checkbox v-model="checklist.isAreaCleaned" :binary="true" inputId="chkArea" />
        <label for="chkArea" class="ml-2">El área de trabajo quedó limpia.</label>
      </div>

      <div class="flex align-items-center mb-3">
        <Checkbox v-model="checklist.areToolsReturned" :binary="true" inputId="chkTools" />
        <label for="chkTools" class="ml-2">Las herramientas fueron devueltas.</label>
      </div>

      <div class="flex align-items-center mb-4">
        <Checkbox v-model="checklist.isOperationsVerified" :binary="true" inputId="chkOps" />
        <label for="chkOps" class="ml-2">Las operaciones fueron verificadas.</label>
      </div>

      <Message v-if="errorMessage" severity="error" :closable="false">{{ errorMessage }}</Message>
      
      <div v-if="isValid" class="success-message">
        <i class="pi pi-check-circle mr-2"></i>
        ¡Todo listo para cerrar la orden!
      </div>
    </div>

    <template #footer>
      <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="closeModal" :disabled="loading" />
      <Button label="Cerrar Orden" icon="pi pi-check" @click="submit" :disabled="!isValid || loading" :loading="loading" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Message from 'primevue/message';
import { WorkOrderService } from '../services/work-order.service';
import { TelemetryService } from '@/core/services/telemetry.service';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  orderId: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['update:modelValue', 'completed']);

const visible = ref(props.modelValue);
const loading = ref(false);
const errorMessage = ref('');

const checklist = ref({
  isAreaCleaned: false,
  areToolsReturned: false,
  isOperationsVerified: false
});

const startTime = ref(Date.now());
let isSubmitted = false;

watch(() => props.modelValue, (newVal) => {
  visible.value = newVal;
  if (newVal) {
    resetForm();
    startTime.value = Date.now();
    isSubmitted = false;
  } else if (!isSubmitted) {
    // Si se cierra el modal sin enviar
    const duration = Math.floor((Date.now() - startTime.value) / 1000);
    TelemetryService.recordMetric({
      experimentName: 'US08-R',
      variant: 'Treatment',
      actionType: 'Order_Start_Attempt',
      durationMilliseconds: duration * 1000,
      isSuccess: false,
      additionalData: JSON.stringify({ orderId: props.orderId, abandoned: true })
    });
  }
});

watch(visible, (newVal) => {
  emit('update:modelValue', newVal);
});

const isValid = computed(() => {
  return checklist.value.isAreaCleaned && 
         checklist.value.areToolsReturned && 
         checklist.value.isOperationsVerified;
});

const resetForm = () => {
  checklist.value = {
    isAreaCleaned: false,
    areToolsReturned: false,
    isOperationsVerified: false
  };
  errorMessage.value = '';
};

const closeModal = () => {
  visible.value = false;
};

const submit = async () => {
  if (!isValid.value) return;
  
  loading.value = true;
  errorMessage.value = '';
  
  const duration = Math.floor((Date.now() - startTime.value) / 1000);

  try {
    await WorkOrderService.completeOrder(props.orderId, checklist.value);
    isSubmitted = true;
    
    TelemetryService.recordMetric({
        experimentName: 'US08-R',
        variant: 'Treatment',
        actionType: 'Order_Start_Attempt',
        durationMilliseconds: duration * 1000,
        isSuccess: true,
        additionalData: JSON.stringify({ orderId: props.orderId })
    });

    emit('completed');
    closeModal();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Error al completar la orden';
    
    TelemetryService.recordMetric({
        experimentName: 'US08-R',
        variant: 'Treatment',
        actionType: 'Order_Start_Attempt',
        durationMilliseconds: duration * 1000,
        isSuccess: false,
        additionalData: JSON.stringify({ orderId: props.orderId, error: errorMessage.value })
    });
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.checklist-completed {
  animation: success-pulse 0.5s ease-out;
  background-color: rgba(34, 197, 94, 0.05);
  border-radius: 8px;
  transition: background-color 0.3s ease;
}

@keyframes success-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

.success-message {
  color: var(--clr-success, #22c55e);
  font-weight: 600;
  text-align: center;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fade-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes fade-in {
  from { 
    opacity: 0; 
    transform: translateY(10px) scale(0.9); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0) scale(1); 
  }
}
</style>
