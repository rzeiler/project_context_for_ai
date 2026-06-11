<script setup>
import { ref, onUnmounted, watch, computed, defineEmits } from "vue";
import { ProjectScannerService } from "../services/ProjectScannerService.js";

// 1. Definiere die Emits explizit (falls noch nicht geschehen)
const emit = defineEmits(['processing']);

const directoryHandles = ref([]);
const outputFileHandle = ref(null);
const outputFileName = ref("");
const messages = ref([]);
const isProcessing = ref(false);

const pollingInterval = ref(null);
const knownFilesState = ref(new Map());

// FEATURE 1 & 4: UI Zustände für Filter & Statistiken
const ignoredInput = ref("Migrations, .Test, Debug.cs");
const fileStats = ref({ tokens: 0, bytes: 0 });
const triggerSaveFlash = ref(false); // FEATURE 3: Flash-Effekt Trigger

const opts = {
  suggestedName: "project_context.cs",
  types: [{ description: "C-Sharp Context File", accept: { "text/plain": [".cs"] } }],
};

// Formatiert den String aus dem Input-Feld in ein sauberes Array
const parsedCustomFilters = computed(() => {
  if (!ignoredInput.value.trim()) return [];
  return ignoredInput.value.split(",").map(item => item.trim()).filter(Boolean);
});

// Rechnet Bytes in lesbare KB/MB um
const formattedSize = computed(() => {
  const bytes = fileStats.value.bytes;
  if (bytes === 0) return "0 KB";
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`;
});

const logMessage = (msg) => {
  messages.value.push({ 
    id: crypto.randomUUID(), 
    timestamp: new Date(), 
    message: msg 
  });
  
  // Wenn mehr als 5 Logs vorhanden sind, entferne die ältesten (vordersten) Einträge
  if (messages.value.length > 5) {
    messages.value.splice(0, messages.value.length - 5);
  }
};

const addDirectory = async () => {
  try {
    const handle = await window.showDirectoryPicker({ mode: "read" });
    if (directoryHandles.value.some(h => h.name === handle.name)) return;
    directoryHandles.value.push(handle);
    logMessage(`Ordner hinzugefügt: ${handle.name}`);
  } catch (err) { }
};

const removeDirectory = (index) => {
  const removed = directoryHandles.value.splice(index, 1);
  logMessage(`Ordner entfernt: ${removed[0].name}`);
};

const selectOutputFile = async () => {
  try {
    outputFileHandle.value = await window.showSaveFilePicker(opts);
    outputFileName.value = outputFileHandle.value.name;
    logMessage(`Ausgabedatei ausgewählt: ${outputFileName.value}`);
  } catch (err) { }
};

const generateContextFile = async (isAutoTriggered = false) => {
  if (directoryHandles.value.length === 0 || !outputFileHandle.value) return;

  // Event feuern: Processing gestartet, noch kein Code da
  emit('processing', { loading: true, code: null });
  isProcessing.value = true;

  try {
    const csFiles = await ProjectScannerService.scanMultipleDirectories(directoryHandles.value, parsedCustomFilters.value);
    const result = await ProjectScannerService.generateAndWriteContext(csFiles, outputFileHandle.value);

    knownFilesState.value = result.newStateMap;
    fileStats.value = result.stats; 

    triggerSaveFlash.value = true;
    setTimeout(() => { triggerSaveFlash.value = false; }, 800);

    logMessage(isAutoTriggered ? "Kontext-Datei automatisch aktualisiert." : `Erfolgreich erstellt: '${outputFileName.value}'`);

    // Event feuern: Verarbeitung fertig, Code übergeben!
    emit('processing', { loading: false, code: result.stats.code });

  } catch (err) {
    console.error(err);
    logMessage(`Fehler: ${err.message || "Verarbeitung fehlgeschlagen."}`);
    // Event feuern: Fehlerfall
    emit('processing', { loading: false, code: null });
  } finally {
    isProcessing.value = false;
  }
};

// Polling-Loop
const startDirectoryPolling = () => {
  if (pollingInterval.value) clearInterval(pollingInterval.value);

  pollingInterval.value = setInterval(async () => {
    if (directoryHandles.value.length === 0 || !outputFileHandle.value || isProcessing.value) return;

    try {
      const currentFiles = await ProjectScannerService.scanMultipleDirectories(directoryHandles.value, parsedCustomFilters.value);
      const changesDetected = await ProjectScannerService.hasChanges(currentFiles, knownFilesState.value);

      if (changesDetected) {
        await generateContextFile(true);
      }
    } catch (err) {
      console.error("Fehler beim Ordner-Polling:", err);
    }
  }, 3000);
};

watch([directoryHandles, outputFileHandle], ([dirs, out]) => {
  if (dirs && dirs.length > 0 && out) {
    generateContextFile().then(() => startDirectoryPolling());
  }
}, { deep: true });

onUnmounted(() => {
  if (pollingInterval.value) clearInterval(pollingInterval.value);
});
</script>

<template>
  <div class="card">
    <div class="filter-section">
      <label for="txt-filter">🚫 Ignorierte Muster (kommagetrennt):</label>
      <input id="txt-filter" v-model="ignoredInput" type="text" placeholder="z.B. Migrations, .Test, MockService.cs"
        @change="generateContextFile(false)" />
    </div>

    <div class="folder-list" v-if="directoryHandles.length > 0">
      <div v-for="(handle, index) in directoryHandles" :key="handle.name" class="folder-item">
        <span>📁 {{ handle.name }}</span>
        <button class="btn-delete" @click="removeDirectory(index)" type="button">🗑️</button>
      </div>
    </div>

    <div class="actions">
      <button class="btn-add" @click="addDirectory" type="button">➕ Quellordner hinzufügen</button>
      <button v-if="directoryHandles.length > 0" class="btn-save" @click="selectOutputFile" type="button">
        💾 {{ outputFileName || "Speichern unter..." }}
      </button>
      <button v-if="directoryHandles.length > 0 && outputFileHandle" @click="generateContextFile(false)"
        :disabled="isProcessing" class="btn-start" type="button">
        {{ isProcessing ? "Verarbeite..." : "Jetzt manuell aktualisieren" }}
      </button>
    </div>


    <div class="status-container" v-if="directoryHandles.length > 0 && outputFileHandle">
      <div class="polling-badge" :class="{ 'flash-success': triggerSaveFlash }">
        <span class="pulsing-dot"></span>
        Automatische Überwachung aktiv
      </div>

      <div class="stats-badge">
        <span>📊 <strong>{{ fileStats.tokens.toLocaleString() }}</strong> Tokens</span>
        <span class="separator">|</span>
        <span>Size: <strong>{{ formattedSize }}</strong></span>
        <span class="separator">|</span>
        <span>Dateien: <strong>{{ knownFilesState.size }}</strong></span>
      </div>
    </div>
  </div>

  <div class="box">
    <transition-group name="log" tag="ul">
      <li v-for="item in messages" :key="item.id">
        <strong>{{ item.timestamp.toLocaleTimeString() }}</strong> : {{ item.message }}
      </li>
    </transition-group>
  </div>
</template>

<style scoped>
.actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 10px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  align-items: flex-start;
}

/* Feature 1 Styling */
.filter-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
  text-align: left;
}

.filter-section label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #555;
}

.filter-section input {
  padding: 0.6rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
  width: 100%;
  box-sizing: border-box;
}

.folder-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.folder-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9f9f9;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border-left: 10px solid #8b5bb8;
}

.btn-delete {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
}

.btn-add {
  background-color: #e0e0e0;
  border: 1px solid #ccc;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.btn-start {
  background-color: #8b5bb8;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
  border-radius: 4px;
}

.btn-save {
  background-color: #6bca97;
  color: rgb(0, 0, 0);
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
  border-radius: 4px;
}

#txt-filter {
  display: block;
  width: 100%;
  padding: .375rem .75rem;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: #333;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-clip: padding-box;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  transition: border-color .15s ease-in-out, box-shadow .15s ease-in-out;
}


.btn-start:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.status-container {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 15px;
  justify-content: center;
}

/* Pulsating Dot Badge & Feature 3 (Flash) */
.polling-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #2e7d32;
  background-color: #e8f5e9;
  padding: 6px 12px;
  border-radius: 12px;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

/* FEATURE 3: Flash-Effekt */
.polling-badge.flash-success {
  animation: flashGreen 0.8s ease-out;
}

@keyframes flashGreen {
  0% {
    background-color: #a5d6a7;
    color: #1b5e20;
    transform: scale(1.03);
  }

  100% {
    background-color: #e8f5e9;
    color: #2e7d32;
    transform: scale(1);
  }
}

.pulsing-dot {
  width: 8px;
  height: 8px;
  background-color: #4caf50;
  border-radius: 50%;
  display: inline-block;
  animation: pulse 2s infinite ease-in-out;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
  }

  70% {
    transform: scale(1);
    box-shadow: 0 0 0 8px rgba(76, 175, 80, 0);
  }

  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
}

/* Feature 4: Stats Styling */
.stats-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #455a64;
  background-color: #eceff1;
  padding: 6px 12px;
  border-radius: 12px;
}

.stats-badge .separator {
  color: #b0bec5;
}

/* Logs */
.box {
  box-shadow: 0px 0px 10px 10px inset #fff;
  position: relative;
  z-index: 2;
  margin-top: 1.5rem;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  text-align: left;
  border-left: 1px solid #aaa;
  padding: 5px 20px 10px 10px;
  position: relative;
}

li::before {
  margin-left: -16.5px;
  margin-top: 4px;
  content: ' ';
  width: 10px;
  height: 10px;
  position: absolute;
  border-radius: 50%;
  border: 1px solid #aaa;
  background-color: #eee;
}

li:last-child {
  color: #8b5bb8;
}

li:last-child::before {
  width: 6px;
  height: 6px;
  background-color: #fff;
  border: 3px solid #8b5bb8;
}

.log-enter-active,
.log-leave-active {
  transition: opacity 0.5s, transform 0.5s ease-in-out;
}

.log-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.log-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>