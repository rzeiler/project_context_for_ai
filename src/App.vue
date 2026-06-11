<script setup>
import { ref } from "vue";
const processing = ref(false);
const generatedCode = ref(""); // Neuer State für den Code im Hintergrund

import processor from './components/Processor.vue'
import PWABadge from './components/PWABadge.vue'

const handleEvent = (data) => {
  processing.value = data.loading;
  if (data.code) {
    generatedCode.value = data.code;
  }
};

</script>

<template>
  <pre v-if="generatedCode" class="code-background">{{ generatedCode }}</pre>
  <div class="container">
    <div class="logo " :class="{ 'rotating-text': processing }" title="Processor Rocket">
      &#128640;
    </div>
    <processor @processing="handleEvent" />
  </div>
  <div class="love">Made with <span style="color: #e25555;">&hearts;</span> by Ralf</div>
  <PWABadge />
</template>


<style scoped>
/* Hier betten wir den Code subtil im Hintergrund ein */
.code-background {
  position: fixed;
  top: 0;
  left: 0;
  /* width: 100vw; und height: 100vh; fliegen raus! */
  right: 0;   /* Streckt das Element exakt bis zum rechten Rand */
  bottom: 0;  /* Streckt das Element exakt bis zum unteren Rand */
  margin: 0;
  padding: 10px 30px; /* Genug Platz, damit der Text nicht direkt im Schatten klebt */
  
  overflow: hidden; 
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.85rem;
  line-height: 1.2;
  color: rgba(139, 91, 184, 0.5); 
  text-align: left;
  white-space: pre-wrap;
  word-break: break-all;
  user-select: none; 
  pointer-events: none; 
  z-index: 0; 

  /* Dein Innenschatten */
  box-shadow: inset 0px 0px 50px rgba(255, 255, 255, .8);
  
  /* Verhindert, dass Padding das Element über den Rand hinausschiebt */
  box-sizing: border-box; 
}

/* Wichtig: Container anheben, damit er über dem Code liegt */
.container {
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.9); /* Leicht transparentes Weiß */
  backdrop-filter: blur(5px); /* Macht den Code dahinter leicht unscharf für bessere Lesbarkeit */
  border: 1px solid rgba(189, 189, 189, .5);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0px 0px 50px 100px rgba(255, 255, 255, .8);
  margin-bottom: 2rem;
}

.love {
  text-shadow: -1px 10px #fff, 0 1px #fff, 1px 0 #fff, 0 -1px #fff;
  position: sticky;
  bottom: 10px;
    z-index: 2;
}

.logo {
  font-size: 400%;
  padding: 10px 20px 10px 20px;
  will-change: filter;
  transition: all 300ms;
  cursor: default;
  text-shadow: 10px 10px 10px #646cffaa;
  vertical-align: text-top;
  line-height: 60px;
}

.logo:hover {

  text-shadow: 10px 20px 10px #646cffaa;
  filter: drop-shadow(0 0 2em #646cffaa);
}


@keyframes bounce-7 {
  0% {
    transform: scale(1, 1) translateY(0);
  }

  10% {
    transform: scale(1.1, .9) translateY(0);
  }

  30% {
    transform: scale(.9, 1.1) translateY(-100px);
  }

  50% {
    transform: scale(1.05, .95) translateY(0);
  }

  57% {
    transform: scale(1, 1) translateY(-20px);
  }

  64% {
    transform: scale(1, 1) translateY(0);
  }

  100% {
    transform: scale(1, 1) translateY(0);
  }
}

.rotating-text {
  display: inline-block;
  animation-duration: 1.5s;
  animation-name: bounce-7;
  animation-timing-function: cubic-bezier(0.280, 0.840, 0.420, 1);

}
</style>
