<template>
  <Dialog
    v-model:visible="visible"
    header="Alerta de Inventario"
    :style="{ width: '500px' }"
    :modal="true"
    class="p-fluid"
    @hide="closeModal"
  >
    <div class="p-4">
      <div class="alert-header mb-4 flex align-items-center">
        <i class="pi pi-exclamation-triangle text-amber-500 text-3xl mr-3"></i>
        <div>
          <h3 class="text-lg font-bold text-amber-700 m-0">Stock Insuficiente</h3>
          <p class="text-sm text-color-secondary mt-1 m-0">
            No se puede iniciar la orden debido a repuestos faltantes en el inventario.
          </p>
        </div>
      </div>

      <div class="missing-parts-list">
        <div v-for="part in missingParts" :key="part.inventoryPartId" class="part-item p-3 mb-2 flex justify-content-between align-items-center">
          <div class="part-info">
            <span class="part-name font-semibold block text-color">{{ part.name }}</span>
            <span class="part-code text-xs text-color-secondary block">{{ part.partNumber }}</span>
          </div>
          <div class="part-stock text-right">
            <span class="stock-badge font-bold px-2 py-1">
              {{ part.availableQuantity }} disp. / {{ part.requiredQuantity }} req.
            </span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="Entendido" icon="pi pi-check" class="p-button-warning" @click="closeModal" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  missingParts: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue']);

const visible = ref(props.modelValue);

watch(() => props.modelValue, (newVal) => {
  visible.value = newVal;
});

watch(visible, (newVal) => {
  emit('update:modelValue', newVal);
});

const closeModal = () => {
  visible.value = false;
};
</script>

<style scoped>
.alert-header {
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: rgba(245, 158, 11, 0.1);
  border-left: 4px solid #f59e0b;
  border-radius: 4px;
}

.part-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 1rem;
}

.stock-badge {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-radius: 4px;
  font-size: 0.85rem;
  padding: 0.25rem 0.5rem;
}

.font-semibold {
  font-weight: 600;
}

.block {
  display: block;
}

.text-xs {
  font-size: 0.75rem;
}

.text-lg {
  font-size: 1.125rem;
}

.font-bold {
  font-weight: 700;
}

.mr-3 {
  margin-right: 0.75rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.mt-1 {
  margin-top: 0.25rem;
}

.m-0 {
  margin: 0;
}

.flex {
  display: flex;
}

.align-items-center {
  align-items: center;
}

.justify-content-between {
  justify-content: space-between;
}

.text-amber-500 {
  color: #f59e0b;
}

.text-amber-700 {
  color: #b45309;
}

.text-3xl {
  font-size: 1.875rem;
}
</style>
