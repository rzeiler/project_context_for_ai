/**
 * Service zur Analyse, Verarbeitung und Generierung von Projektkontexten mit KI-Optimierung.
 */
export class ProjectScannerService {
  // Standard-Filter, falls der User nichts eingibt
  static DEFAULT_IGNORED_DIRECTORIES = ["bin", "obj", ".vs", ".git", "node_modules", "Properties"];
  static DEFAULT_IGNORED_FILES = ["AssemblyInfo.cs"];

  /**
   * Durchsucht Verzeichnisse rekursiv unter Berücksichtigung dynamischer Filter.
   */
  static async scanMultipleDirectories(dirHandles, customFilters = []) {
    let allFiles = [];
    
    // Kombiniere Standard-Filter mit den Usereingaben aus dem UI
    const ignoredDirs = [...this.DEFAULT_IGNORED_DIRECTORIES, ...customFilters];
    const ignoredFiles = [...this.DEFAULT_IGNORED_FILES, ...customFilters];

    for (const dirHandle of dirHandles) {
      if (!dirHandle) continue;
      await this._scanDirectoryRecursive(dirHandle, allFiles, dirHandle.name, ignoredDirs, ignoredFiles);
    }
    
    return allFiles;
  }

  static async _scanDirectoryRecursive(dirHandle, fileList, currentPath, ignoredDirs, ignoredFiles) {
    for await (const entry of dirHandle.values()) {
      const relativePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

      if (entry.kind === "directory") {
        // Prüfen, ob der Ordnername (case-insensitive) ignoriert werden soll
        if (ignoredDirs.some(d => d.toLowerCase() === entry.name.toLowerCase())) continue;
        await this._scanDirectoryRecursive(entry, fileList, relativePath, ignoredDirs, ignoredFiles);
      } 
      else if (entry.kind === "file") {
        const isCsFile = entry.name.endsWith(".cs");
        const isIgnored = ignoredFiles.some(f => f.toLowerCase() === entry.name.toLowerCase());

        if (isCsFile && !isIgnored) {
          entry.relativePath = relativePath;
          fileList.push(entry);
        }
      }
    }
  }

  /**
   * Generiert den bereinigten Dateiinhalt inklusive Inhaltsverzeichnis (Feature 2)
   * und gibt den neuen State sowie Datei-Statistiken zurück.
   */
  static async generateAndWriteContext(csFiles, outputFileHandle) {
    if (!outputFileHandle) throw new Error("Keine Ausgabedatei ausgewählt.");

    // --- FEATURE 2: INHALTSVERZEICHNIS GENERIEREN ---
    let combinedContent = `// ====================================================\n`;
    combinedContent += `// AUTO-GENERATED PROJECT CONTEXT FOR AI\n`;
    combinedContent += `// Generiert am: ${new Date().toLocaleString()}\n`;
    combinedContent += `// Anzahl Dateien: ${csFiles.length}\n`;
    combinedContent += `// ====================================================\n`;
    combinedContent += `// PROJEKT-STRUKTUR / INHALTSVERZEICHNIS:\n`;
    
    csFiles.forEach(fileHandle => {
      combinedContent += `//  [-] ${fileHandle.relativePath}\n`;
    });
    combinedContent += `// ====================================================\n\n`;

    const newStateMap = new Map();

    // Dateien verarbeiten und bereinigen
    for (const fileHandle of csFiles) {
      const file = await fileHandle.getFile();
      newStateMap.set(fileHandle.relativePath, file.lastModified);

      let text = await file.text();
      
      // KI-Optimierung (Noise-Reduction)
      text = text.replace(/^using\s+[A-Za-z0-9_.]+;\r?\n/gm, "");
      text = text.replace(/^\s*\/\/\/.*$/gm, ""); 
      text = text.replace(/(\r?\n){3,}/g, "\n\n");

      combinedContent += `// START_FILE: ${fileHandle.relativePath}\n`;
      combinedContent += `// ----------------------------------------------------\n`;
      combinedContent += text.trim();
      combinedContent += `\n// END_FILE: ${fileHandle.relativePath}\n`;
      combinedContent += `// ====================================================\n\n`;
    }

    // In Datei schreiben
    const writable = await outputFileHandle.createWritable();
    await writable.write(combinedContent);
    await writable.close();

    // --- FEATURE 4: STATISTIKEN BERECHNEN ---
    const totalCharacters = combinedContent.length;
    // Ungefähre Byte-Größe (UTF-8)
    const totalBytes = new Blob([combinedContent]).size; 

    return {
      newStateMap,
      stats: {
        code: combinedContent,
        tokens: Math.ceil(totalCharacters / 4), // Grobe LLM-Schätzung
        bytes: totalBytes
      }
    };
  }

  /**
   * Prüft unverändert auf Dateiänderungen
   */
  static async hasChanges(currentFiles, knownFilesState) {
    if (currentFiles.length !== knownFilesState.size) return true;

    for (const fileHandle of currentFiles) {
      try {
        const file = await fileHandle.getFile();
        const knownLastModified = knownFilesState.get(fileHandle.relativePath);

        if (knownLastModified === undefined || knownLastModified !== file.lastModified) {
          return true;
        }
      } catch (e) {
        return true; 
      }
    }
    return false;
  }
}