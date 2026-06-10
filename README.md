# 📑 AI Project Scanner (Context Generator)

Ein schlankes, browserbasiertes Entwickler-Werkzeug, das Quellcode-Verzeichnisse scannt und deren Struktur sowie Inhalte in einer einzigen, strukturierten Datei (`project_context.cs`) zusammenfasst. 

Ideal, um großen Projekten schnell einen vollständigen Kontext zu verpassen, bevor man sie an Large Language Models (LLMs) wie ChatGPT, Claude oder Gemini für Code-Reviews, Refactorings oder Feature-Implementierungen übergibt.

---

## 🚀 Features

* **Multi-Verzeichnis-Scan:** Wähle über die native Browser-Schnittstelle einen oder mehrere Projektordner gleichzeitig aus.
* **Echtzeit-Überwachung (Live Polling):** Das Tool überwacht deine Ordner im Hintergrund. Sobald du eine Datei im Code-Editor änderst oder speicherst, wird die Kontextdatei automatisch aktualisiert.
* **Intelligentes Filtern:** Ignoriere standardmäßig oder via Komma-Trennung im UI Ordner wie `Migrations`, `.Test` oder spezifische Dateien, um das Token-Limit deiner KI-Prompts zu schonen.
* **Live-Statistiken:** Zeigt dir sofort die ungefähre Token-Anzahl, Dateigröße und die Anzahl der erfassten Dateien an.
* **Projekt-Verwaltung:** Speichere, lade, benenne oder lösche deine Projekt-Konfigurationen bequem über ein verschachteltes Desktop-Dropdown-Menü (`Neu`, `Öffnen`, `Speichern`, `Löschen`).

---

## 🛠️ Technologie-Stack

* **Framework:** Vue 3 (Composition API mit `<script setup>`)
* **Architektur:** Modularisiert mittels *Vue Composables* (`useProjectScanner`) für saubere Trennung von UI und Logik.
* **Browser-APIs:** * `File System Access API` (`showDirectoryPicker`, `showSaveFilePicker`) für den direkten, sicheren lokalen Festplattenzugriff ohne Server-Backend.
  * `LocalStorage` zur persistenten Speicherung der Projektprofile.

---

## 📖 Bedienungsanleitung

### 1. Filter einstellen
* Trage im Textfeld *Ignorierte Muster* alle Ordner oder Dateiendungen ein, die **nicht** im KI-Kontext landen sollen (z.B. `Debug.cs, Release, .json`). Trenne die Begriffe einfach mit einem Komma.

 

### 2. Automatische Überwachung nutzen
* Sobald mindestens ein Ordner geladen und eine Ausgabedatei ausgewählt ist, springt die **Automatische Überwachung** (grüne Badge) an.
* Jede Änderung an deinen `.cs`-Dateien in den ausgewählten Ordnern triggert nun im Hintergrund ein automatisches Update der Kontextdatei. Ein visueller "Flash-Effekt" auf der Badge signalisiert dir den erfolgreichen Schreibvorgang.
* Alternativ kannst du den Prozess jederzeit über den Button **"Jetzt manuell aktualisieren"** erzwingen.

---

## 🔒 Sicherheitshinweis

Dieses Tool läuft **zu 100 % lokal in deinem Browser**. Es werden zu keinem Zeitpunkt Code-Inhalte, Pfade oder Projektdaten an externe Server übertragen. Der Zugriff auf deine Ordner erfolgt über die Sandbox-Sicherheitsrichtlinien moderner Browser und erlischt automatisch, sobald du den Browser-Tab schließt oder die Seite neu lädst.