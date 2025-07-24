// === Работа с папками ===
let currentFolderId = 'root';
let folders = [];

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

// Отобразить папки в дереве
function displayFolders() {
  const folderTree = document.getElementById('folderTree');
  
  // Очищаем, кроме корневой папки
  const rootItem = folderTree.querySelector('[data-id="root"]');
  const isActive = rootItem.classList.contains('active');
  folderTree.innerHTML = '';
  folderTree.appendChild(rootItem);
  if (isActive) {
    rootItem.classList.add('active');
  }

  folders.forEach(folder => {
    // Убираем префикс "fabula_" из отображаемого имени
    const displayName = folder.name.replace('fabula_', '');
    
    const folderItem = document.createElement('div');
    folderItem.className = 'folder-item';
    folderItem.setAttribute('data-id', folder.id);
    folderItem.onclick = () => selectFolder(folder.id, folderItem);
    
    folderItem.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          📁 ${displayName}
        </div>
        ${folder.id !== 'root' ? `
          <button onclick="event.stopPropagation(); deleteFolder('${folder.id}', '${displayName}')" 
                  style="background-color: #dc3545; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: 12px; cursor: pointer;">
            🗑️
          </button>
        ` : ''}
      </div>
    `;
    
    folderTree.appendChild(folderItem);
  });
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
  document.getElementById('folderActions').style.display = 'block';
  
  showStatus(`📁 Выбрана папка: ${folderId === 'root' ? 'Все файлы' : 'папка'}`);
  
  // Показать файлы в выбранной папке
  showFilesInFolder(folderId);
}
