<template>
    <div class="modal-overlay">
        <div class="modal-container">
            <div class="modal-header">
                <h2>{{ isEdit ? 'Editar Repuesto' : 'Nuevo Repuesto' }}</h2>
                <button class="close-button" @click="handleCancel">×</button>
            </div>
            
            <div class="modal-content">
                <form @submit.prevent="handleSubmit" class="form-container">
                    <div class="form-group">
                        <label for="plantId">Planta</label>
                        <select 
                            id="plantId"
                            v-model="formData.plantId"
                            required
                            :disabled="isEdit"
                            class="form-select"
                        >
                            <option value="" disabled>Selecciona una planta</option>
                            <option 
                                v-for="plant in plants" 
                                :key="plant.id" 
                                :value="plant.id"
                            >
                                {{ plant.name }}
                            </option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="code">Código</label>
                        <input 
                            id="code"
                            v-model="formData.code"
                            type="text"
                            required
                            :disabled="isEdit"
                            placeholder="Ingrese el código"
                        />
                    </div>
                    <div class="form-group">
                        <label for="name">Nombre</label>
                        <input 
                            id="name"
                            v-model="formData.name"
                            type="text"
                            required
                            :disabled="isEdit"
                            placeholder="Ingrese el nombre"
                        />
                    </div>
                    <div class="form-group">
                        <label for="description">Descripción</label>
                        <textarea 
                            id="description"
                            v-model="formData.description"
                            rows="3"
                            placeholder="Ingrese la descripción"
                        ></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="currentStock">Stock Actual</label>
                            <input 
                                id="currentStock"
                                v-model.number="formData.currentStock"
                                type="number"
                                required
                                min="0"
                            />
                        </div>
                        <div class="form-group">
                            <label for="minStock">Stock Mínimo</label>
                            <input 
                                id="minStock"
                                v-model.number="formData.minStock"
                                type="number"
                                required
                                min="0"
                            />
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="unitPrice">Precio Unitario</label>
                        <input 
                            id="unitPrice"
                            v-model.number="formData.unitPrice"
                            type="number"
                            required
                            min="0"
                            step="0.01"
                        />
                    </div>
                </form>
            </div>

            <div class="modal-footer">
                <Button
                    variant="outline"
                    @clicked="handleCancel"
                >
                    Cancelar
                </Button>
                <Button style="background-color: var(--clr-danger);"
                    v-if="isEdit"
                    variant="danger"
                    @clicked="handleDelete"
                >
                    Eliminar
                </Button>
                <Button
                    variant="primary"
                    @clicked="handleSubmit"
                >
                    {{ isEdit ? 'Guardar Cambios' : 'Crear' }}
                </Button>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue';
import Button from '../../../shared/components/button.component.vue';
import { InventoryPartsApiService } from '../services/inventory-parts-api.service';

export default {
    name: 'InventoryPartFormModal',
    
    components: {
        Button
    },

    props: {
        isEdit: {
            type: Boolean,
            default: false
        },
        partData: {
            type: Object,
            default: () => ({})
        },
        currentPlantId: {
            type: [Number, String],
            default: null
        }
    },

    emits: ['submit', 'cancel', 'delete'],

    setup(props, { emit }) {
        const plants = ref([]);
        const formData = ref({
            plantId: '',
            code: '',
            name: '',
            description: '',
            currentStock: 0,
            minStock: 0,
            unitPrice: 0
        });

        // Cargar plantas
        const loadPlants = async () => {
            try {
                const data = await InventoryPartsApiService.getPlants();
                plants.value = data;
                
                // Si hay una planta actual, seleccionarla
                if (props.currentPlantId) {
                    formData.value.plantId = props.currentPlantId;
                } else if (data.length > 0 && !props.isEdit) {
                    formData.value.plantId = data[0].id;
                }
            } catch (error) {
                console.error('Error loading plants:', error);
            }
        };

        const handleSubmit = () => {
            // Validar que el plantId esté presente
            if (!formData.value.plantId) {
                alert('Por favor selecciona una planta');
                return;
            }
            
            emit('submit', {
                ...formData.value,
                id: props.partData?.id
            });
        };

        const handleCancel = () => {
            emit('cancel');
        };

        const handleDelete = () => {
            if (confirm('¿Está seguro de eliminar este repuesto?')) {
                emit('delete', props.partData.id);
            }
        };

        // Cargar datos cuando se monta el componente o cambia partData
        onMounted(() => {
            loadPlants();
            if (props.isEdit && props.partData) {
                formData.value = {
                    plantId: props.partData.plantId || props.currentPlantId || '',
                    code: props.partData.code || '',
                    name: props.partData.name || '',
                    description: props.partData.description || '',
                    currentStock: props.partData.currentStock || 0,
                    minStock: props.partData.minStock || 0,
                    unitPrice: props.partData.unitPrice || 0
                };
            }
        });

        // Watch para actualizar cuando cambia el partData
        watch(() => props.partData, (newVal) => {
            if (props.isEdit && newVal) {
                formData.value = {
                    plantId: newVal.plantId || props.currentPlantId || '',
                    code: newVal.code || '',
                    name: newVal.name || '',
                    description: newVal.description || '',
                    currentStock: newVal.currentStock || 0,
                    minStock: newVal.minStock || 0,
                    unitPrice: newVal.unitPrice || 0
                };
            }
        }, { deep: true });

        return {
            plants,
            formData,
            handleSubmit,
            handleCancel,
            handleDelete
        };
    }
}
</script>

<style scoped lang="scss">
*{
    font-family: var(--font-family-base) !important;
}
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-container {
    background: var(--clr-bg);
    border-radius: var(--radius-lg);
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--clr-border);
}

.modal-header h2 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--clr-text);
}

.close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--clr-text);
    padding: 0.5rem;
}

.modal-content {
    padding: 1rem;
    overflow-y: auto;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1rem;
    border-top: 1px solid var(--clr-border);
}

.form-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-group label {
    font-weight: 500;
    color: var(--clr-text);
}

.form-group input,
.form-group textarea,
.form-group .form-select {
    padding: 0.5rem;
    border: 1px solid var(--clr-primary-100);
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    color: var(--clr-text);
    background-color: var(--clr-surface);
}

.form-group .form-select {
    cursor: pointer;
    appearance: auto;
}

.form-group input:disabled,
.form-group .form-select:disabled {
    background-color: var(--clr-disabled);
    cursor: not-allowed;
}

.form-row {
    display: flex;
    gap: 1rem;
}

.form-row .form-group {
    flex: 1;
}

input[type="number"] {
    -moz-appearance: textfield;
}

input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}
</style>