// === Работа с файлами ===
let currentFileName = 'fabula_story.txt';
let currentFileId = null; // Новый ID текущего файла

// Показать файлы в папке
async function showFilesInFolder(folderId) {
  if (!accessToken) return;

  showStatus("⏳ Загрузка файлов...");

  try {
    let query;
    if (folderId === 'root') {
      query = 'mimeType=\'text/plain\' and name contains \'fabula\' and \'root\' in parents';
    } else {
      query = `mimeType='text/plain' and '${folderId}' in parents`;
    }

    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?' +
      `q=${encodeURIComponent(query)}&` +
      'fields=files(id,name,modifiedTime)&' +
      'orderBy=modifiedTime desc',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const data = await response.json();
    
    const folderFiles = document.getElementById('folderFiles');
    folderFiles.innerHTML = '';
    
    if (data.files && data.files.length > 0) {
      data.files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div onclick="loadFileFromDrive('${file.id}', '${file.name}')">
              <strong>${file.name}</strong><br>
              <small>${new Date(file.modifiedTime).toLocaleString('ru-RU')}</small>
            </div>
            <button onclick="deleteFile('${file.id}', '${file.name}')" 
                    style="background-color: #dc3545; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: 12px; cursor: pointer;">
              🗑️
            </button>
          </div>
        `;
        folderFiles.appendChild(fileItem);
      });
    } else {
      folderFiles.innerHTML = '<div style="color: #666; font-size: 14px;">Пустая папка</div>';
    }
    
    showStatus(`✅ Загружено ${data.files ? data.files.length : 0} файлов`);
  } catch (error) {
    console.error(error);
    showStatus("❌ Ошибка загрузки файлов: " + error.message);
  }
}

// Создать файл в выбранной папке
async function createFile() {
  if (!accessToken) {
    showStatus("❌ Сначала авторизуйся через Google!");
    return;
  }

  const fileName = document.getElementById('fileName').value.trim();
  if (!fileName) {
    showStatus("❌ Введите название файла");
    return;
  }

  showStatus("⏳ Создание файла...");

  try {
    // Создаём файл с текущим текстом из редактора
    const currentText = document.getElementById('editor').value || "";
    console.log(`Текст для сохранения:`, currentText);
    
    const blob = new Blob([currentText], { type: 'text/plain' });
    
    const fullFileName = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`;

    const metadata = {
      name: fullFileName,
      mimeType: 'text/plain'
    };

    // Добавляем в выбранную папку, если это не корневая
    if (currentFolderId !== 'root') {
      metadata.parents = [currentFolderId];
    }

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: form
    });

    if (response.ok) {
      const fileData = await response.json();
      showStatus(`✅ Файл "${fullFileName}" создан!`);
      closeCreateFileModal();
      
      // Устанавливаем имя и ID файла
      currentFileName = fullFileName;
      currentFileId = fileData.id;
      
      // Обновляем список файлов в папке
      showFilesInFolder(currentFolderId);
    } else {
      const error = await response.json();
      throw new Error(error.error.message);
    }
  } catch (error) {
    console.error(error);
    showStatus("❌ Ошибка: " + error.message);
  }
}

// Сохранить текущий файл в выбранную папку
async function saveCurrentFileToFolder() {
  if (!accessToken) {
    showStatus("❌ Сначала авторизуйся через Google!");
    return;
  }

  const text = document.getElementById('editor').value;
  const blob = new Blob([text], { type: 'text/plain' });

  showStatus("⏳ Сохранение файла...");

  try {
    // Проверяем, есть ли у нас ID текущего файла
    if (currentFileId) {
      // Обновляем существующий файл
      await updateExistingFile(currentFileId, currentFileName, blob);
    } else {
      // Создаём новый файл с уникальным именем
      await createNewFileWithUniqueName(blob);
    }
  } catch (error) {
    console.error(error);
    showStatus("❌ Ошибка: " + error.message);
  }
}

// Обновить существующий файл
async function updateExistingFile(fileId, fileName, blob) {
  try {
    const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain'
      },
      body: blob
    });

    if (response.ok) {
      showStatus(`✅ Файл ${fileName} успешно обновлён!`);
      // Обновить список файлов в текущей папке
      showFilesInFolder(currentFolderId);
    } else {
      const errorText = await response.text();
      console.error('Ошибка обновления:', errorText);
      throw new Error(`Ошибка обновления файла: ${response.status}`);
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Создать новый файл с уникальным именем
async function createNewFileWithUniqueName(blob) {
  try {
    // Генерируем уникальное имя файла с датой
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `fabula_${timestamp}.txt`;

    const metadata = {
      name: fileName,
      mimeType: 'text/plain'
    };

    // Добавляем в выбранную папку, если это не корневая
    if (currentFolderId !== 'root') {
      metadata.parents = [currentFolderId];
    }

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: form
    });

    if (response.ok) {
      const fileData = await response.json();
      showStatus(`✅ Файл ${fileName} успешно сохранён в папку!`);
      currentFileName = fileName;
      currentFileId = fileData.id; // Сохраняем ID нового файла
      // Обновить список файлов в текущей папке
      showFilesInFolder(currentFolderId);
    } else {
      const error = await response.json();
      throw new Error(error.error.message);
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Сохранить в Google Drive
async function saveToGoogleDrive() {
  if (!accessToken) {
    showStatus("❌ Сначала авторизуйся через Google!");
    return;
  }

  const text = document.getElementById('editor').value;
  const blob = new Blob([text], { type: 'text/plain' });

  showStatus("⏳ Загрузка в Google Drive...");

  try {
    // Проверяем, есть ли у нас ID текущего файла
    if (currentFileId) {
      // Обновляем существующий файл
      await updateExistingFile(currentFileId, currentFileName, blob);
    } else {
      // Создаём новый файл с уникальным именем
      await createNewFileWithUniqueName(blob);
    }
  } catch (error) {
    console.error(error);
    showStatus("❌ Ошибка: " + error.message);
  }
}

// Загрузить файл из Google Drive
async function loadFileFromDrive(fileId, fileName) {
  try {
    showStatus(`⏳ Загрузка файла ${fileName}...`);
    console.log(`Загрузка файла: ${fileName}, ID: ${fileId}`);
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    console.log(`Статус ответа: ${response.status}`);
    
    if (response.ok) {
      const text = await response.text();
      console.log(`Получен текст длиной: ${text.length} символов`);
      
      // Проверяем, существует ли элемент editor
      const editor = document.getElementById('editor');
      if (editor) {
        editor.value = text;
        console.log('Текст установлен в редактор');
      } else {
        console.error('Элемент editor не найден!');
        throw new Error('Элемент редактора не найден');
      }
      
      currentFileName = fileName;
      currentFileId = fileId; // Сохраняем ID файла
      showStatus(`✅ Файл ${fileName} загружен!`);
      console.log(`Файл ${fileName} успешно загружен`);
      
      // Скрыть список файлов, если он открыт
      const fileList = document.getElementById('fileList');
      if (fileList) {
        fileList.style.display = 'none';
      }
    } else {
      const errorText = await response.text();
      console.error(`Ошибка сервера: ${response.status}`, errorText);
      throw new Error(`Ошибка загрузки файла: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('Полная ошибка:', error);
    showStatus("❌ Ошибка загрузки файла: " + error.message);
  }
}

// Показать список файлов из Google Drive
async function listGoogleDriveFiles() {
  if (!accessToken) {
    showStatus("❌ Сначала авторизуйся через Google!");
    return;
  }

  showStatus("⏳ Загрузка списка файлов...");

  try {
    // Запрашиваем файлы с расширением .txt
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?' +
      'q=mimeType=\'text/plain\' and name contains \'fabula\'&' +
      'fields=files(id,name,modifiedTime)&' +
      'orderBy=modifiedTime desc',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const data = await response.json();
    
    if (data.files && data.files.length > 0) {
      displayFileList(data.files);
      showStatus(`✅ Найдено ${data.files.length} файлов`);
    } else {
      showStatus("📭 Нет сохранённых файлов");
    }
  } catch (error) {
    console.error(error);
    showStatus("❌ Ошибка загрузки списка файлов: " + error.message);
  }
}

// Отобразить список файлов
function displayFileList(files) {
  const fileListDiv = document.getElementById('fileList');
  const filesContainer = document.getElementById('filesContainer');
  
  filesContainer.innerHTML = '';
  
  files.forEach(file => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
      <strong>${file.name}</strong><br>
      <small>${new Date(file.modifiedTime).toLocaleString('ru-RU')}</small>
    `;
    fileItem.onclick = () => loadFileFromDrive(file.id, file.name);
    filesContainer.appendChild(fileItem);
  });
  
  fileListDiv.style.display = 'block';
}

// Показать файлы в текущей папке
function showCurrentFolderFiles() {
  showFilesInFolder(currentFolderId);
}

// Сохранить локально
function saveLocally() {
  const text = document.getElementById('editor').value;
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = currentFileName;
  a.click();
  showStatus("💾 Файл сохранён локально");
}

// Удалить файл
async function deleteFile(fileId, fileName) {
  if (confirm(`Точно удалить файл "${fileName}"?`)) {
    try {
      showStatus(`⏳ Удаление файла "${fileName}"...`);
      
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        showStatus(`✅ Файл "${fileName}" удалён!`);
        // Обновить список файлов в текущей папке
        showFilesInFolder(currentFolderId);
        // Если это текущий открытый файл - очистить редактор
        if (currentFileName === fileName) {
          document.getElementById('editor').value = '';
          currentFileName = 'fabula_story.txt';
          currentFileId = null;
        }
      } else {
        const error = await response.json();
        throw new Error(error.error.message || 'Ошибка удаления файла');
      }
    } catch (error) {
      console.error(error);
      showStatus("❌ Ошибка удаления: " + error.message);
    }
  }
}

// Удалить папку
async function deleteFolder(folderId, folderName) {
  if (confirm(`Точно удалить папку "${folderName}"? Все файлы в ней будут удалены!`)) {
    try {
      showStatus(`⏳ Удаление папки "${folderName}"...`);
      
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        showStatus(`✅ Папка "${folderName}" удалена!`);
        // Обновить список папок
        loadFolders();
        // Если это текущая папка - переключиться на корневую
        if (currentFolderId === folderId) {
          selectFolder('root', document.querySelector('.folder-item[data-id="root"]'));
        }
      } else {
        const error = await response.json();
        throw new Error(error.error.message || 'Ошибка удаления папки');
      }
    } catch (error) {
      console.error(error);
      showStatus("❌ Ошибка удаления: " + error.message);
    }
  }
}
