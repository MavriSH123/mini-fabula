// === Работа с папками ===
let currentFolderId = 'root';
let folders = [];
let expandedFolders = new Set(); // Для отслеживания развернутых папок

// Загрузить список папок
async function loadFolders() {
  if (!accessToken) return;

  try {
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?' +
      'q=mimeType=\'application/vnd.google-apps.folder\' and name contains \'fabula\'&' +
      'fields=files(id,name)',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const data = await response.json();
    folders = data.files || [];
    displayFolders();
  } catch (error) {
    console.error(error);
    showStatus("❌ Ошибка загрузки папок: " + error.message);
  }
}

// Переключить состояние папки (свернуть/развернуть)
function toggleFolder(folderId) {
  if (expandedFolders.has(folderId)) {
    expandedFolders.delete(folderId);
  } else {
    expandedFolders.add(folderId);
  }
  displayFolders();
  
  // Если папка развернута - загрузить файлы
  if (expandedFolders.has(folderId)) {
    loadFilesForFolder(folderId);
  }
}

// Загрузить файлы для конкретной папки
async function loadFilesForFolder(folderId) {
  if (!accessToken) return;

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
    
    // Сохраняем файлы для этой папки
    window.folderFilesCache = window.folderFilesCache || {};
    window.folderFilesCache[folderId] = data.files || [];
    
    displayFolders(); // Обновляем отображение
  } catch (error) {
    console.error(error);
    showStatus("❌ Ошибка загрузки файлов: " + error.message);
  }
}

// Отобразить папки в дереве
function displayFolders() {
  const folderTree = document.getElementById('folderTree');
  
  // Очищаем, кроме корневой папки
  const rootItem = folderTree.querySelector('[data-id="root"]');
  const isActive = rootItem && rootItem.classList.contains('active');
  folderTree.innerHTML = '';
  
  // Добавляем корневую папку
  const rootFolderItem = document.createElement('div');
  rootFolderItem.className = 'folder-item';
  rootFolderItem.setAttribute('data-id', 'root');
  rootFolderItem.onclick = () => selectFolder('root', rootFolderItem);
  
  rootFolderItem.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; cursor: pointer;">
        <span style="margin-right: 5px;">${expandedFolders.has('root') ? '📂' : '📁'}</span>
        <span>Все файлы</span>
      </div>
      <div>
        <button onclick="event.stopPropagation(); toggleFolder('root')" 
                style="background-color: #6c757d; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: 12px; cursor: pointer; margin-right: 5px;">
          ${expandedFolders.has('root') ? '−' : '+'}
        </button>
      </div>
    </div>
  `;
  
  if (isActive) {
    rootFolderItem.classList.add('active');
  }
  folderTree.appendChild(rootFolderItem);
  
  // Показываем файлы корневой папки, если она развернута
  if (expandedFolders.has('root')) {
    const filesContainer = document.createElement('div');
    filesContainer.className = 'folder-files';
    filesContainer.style.marginLeft = '20px';
    filesContainer.style.maxHeight = '200px';
    filesContainer.style.overflowY = 'auto';
    
    // Загружаем файлы, если еще не загружены
    if (!window.folderFilesCache || !window.folderFilesCache['root']) {
      loadFilesForFolder('root');
    } else {
      displayFilesInContainer(filesContainer, window.folderFilesCache['root'], 'root');
    }
    
    folderTree.appendChild(filesContainer);
  }

  // Добавляем остальные папки
  folders.forEach(folder => {
    const displayName = folder.name.replace('fabula_', '');
    
    const folderItem = document.createElement('div');
    folderItem.className = 'folder-item';
    folderItem.setAttribute('data-id', folder.id);
    folderItem.style.marginTop = '5px';
    
    folderItem.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; cursor: pointer;" onclick="selectFolder('${folder.id}', this.closest('.folder-item'))">
          <span style="margin-right: 5px;">${expandedFolders.has(folder.id) ? '📂' : '📁'}</span>
          <span>${displayName}</span>
        </div>
        <div>
          <button onclick="event.stopPropagation(); toggleFolder('${folder.id}')" 
                  style="background-color: #6c757d; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: 12px; cursor: pointer; margin-right: 5px;">
            ${expandedFolders.has(folder.id) ? '−' : '+'}
          </button>
          <button onclick="event.stopPropagation(); deleteFolder('${folder.id}', '${displayName}')" 
                  style="background-color: #dc3545; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: 12px; cursor: pointer;">
            🗑️
          </button>
        </div>
      </div>
    `;
    
    folderTree.appendChild(folderItem);
    
    // Показываем файлы папки, если она развернута
    if (expandedFolders.has(folder.id)) {
      const filesContainer = document.createElement('div');
      filesContainer.className = 'folder-files';
      filesContainer.style.marginLeft = '20px';
      filesContainer.style.maxHeight = '200px';
      filesContainer.style.overflowY = 'auto';
      
      // Загружаем файлы, если еще не загружены
      if (!window.folderFilesCache || !window.folderFilesCache[folder.id]) {
        loadFilesForFolder(folder.id);
      } else {
        displayFilesInContainer(filesContainer, window.folderFilesCache[folder.id], folder.id);
      }
      
      folderTree.appendChild(filesContainer);
    }
  });
}

// Отобразить файлы в контейнере
function displayFilesInContainer(container, files, folderId) {
  container.innerHTML = '';
  
  if (files && files.length > 0) {
    files.forEach(file => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.style.margin = '3px 0';
      fileItem.style.padding = '5px';
      fileItem.style.fontSize = '13px';
      
      fileItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; cursor: pointer; flex: 1;" onclick="loadFileFromDrive('${file.id}', '${file.name}')">
            <span style="margin-right: 5px;">📄</span>
            <div>
              <div><strong>${file.name}</strong></div>
              <div style="font-size: 11px; color: #666;">${new Date(file.modifiedTime).toLocaleString('ru-RU')}</div>
            </div>
          </div>
          <button onclick="event.stopPropagation(); deleteFile('${file.id}', '${file.name}')" 
                  style="background-color: #dc3545; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: 10px; cursor: pointer; margin-left: 10px;">
            🗑️
          </button>
        </div>
      `;
      
      container.appendChild(fileItem);
    });
  } else {
    container.innerHTML = '<div style="color: #666; font-size: 12px; padding: 5px;">Пустая папка</div>';
  }
}

// Выбрать папку
function selectFolder(folderId, element) {
  // Убрать активный класс у всех папок
  document.querySelectorAll('.folder-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Добавить активный класс выбранной папке
  if (element) {
    element.classList.add('active');
  }
  
  currentFolderId = folderId;
  
  // Показать действия с папкой
function showFolderActions() {
  const folderActions = document.getElementById('folderActions');
  folderActions.style.display = 'block';
}

// Открыть модальное окно создания файла
function openCreateFileModal() {
  if (!accessToken) {
    showStatus("❌ Сначала авторизуйся через Google!");
    return;
  }

  document.getElementById('createFileModal').style.display = 'block';
}

// Выбрать папку (обновлённая версия)
function selectFolder(folderId, element) {
  // Убрать активный класс у всех папок
  document.querySelectorAll('.folder-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Добавить активный класс выбранной папке
  if (element) {
    element.classList.add('active');
  }
  
  currentFolderId = folderId;
  
  // Показать действия с папкой
  showFolderActions();
  
  showStatus(`📁 Выбрана папка: ${folderId === 'root' ? 'Все файлы' : 'папка'}`);
  
  // Автоматически разворачиваем папку при выборе
  if (!expandedFolders.has(folderId)) {
    expandedFolders.add(folderId);
    displayFolders();
    loadFilesForFolder(folderId);
  }
}
