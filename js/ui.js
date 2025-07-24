// === Интерфейс и модальные окна ===

// Открыть модальное окно создания папки
function openCreateFolderModal() {
  if (!accessToken) {
    showStatus("❌ Сначала авторизуйся через Google!");
    return;
  }
  document.getElementById('createFolderModal').style.display = 'block';
  document.getElementById('folderName').focus();
}

// Закрыть модальное окно создания папки
function closeCreateFolderModal() {
  document.getElementById('createFolderModal').style.display = 'none';
  document.getElementById('folderName').value = '';
}

// Создать папку
async function createFolder() {
  if (!accessToken) {
    showStatus("❌ Сначала авторизуйся через Google!");
    return;
  }

  const folderName = document.getElementById('folderName').value.trim();
  if (!folderName) {
    showStatus("❌ Введите название папки");
    return;
  }

  showStatus("⏳ Создание папки...");

  try {
    const metadata = {
      name: 'fabula_' + folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };

    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (response.ok) {
      showStatus(`✅ Папка "${folderName}" создана!`);
      closeCreateFolderModal();
      loadFolders(); // Обновить список папок
    } else {
      const error = await response.json();
      throw new Error(error.error.message);
    }
  } catch (error) {
    console.error(error);
    showStatus("❌ Ошибка: " + error.message);
  }
}

// Открыть модальное окно создания файла
function openCreateFileModal() {
  if (!accessToken) {
    showStatus("❌ Сначала авторизуйся через Google!");
    return;
  }
  document.getElementById('createFileModal').style.display = 'block';
  document.getElementById('fileName').focus();
}

// Закрыть модальное окно создания файла
function closeCreateFileModal() {
  document.getElementById('createFileModal').style.display = 'none';
  document.getElementById('fileName').value = '';
}

// Закрытие модального окна при клике вне его
window.onclick = function(event) {
  const modals = ['createFolderModal', 'createFileModal'];
  modals.forEach(modalId => {
    const modal = document.getElementById(modalId);
    if (event.target == modal) {
      if (modalId === 'createFolderModal') {
        closeCreateFolderModal();
      } else if (modalId === 'createFileModal') {
        closeCreateFileModal();
      }
    }
  });
}

// Показать статус
function showStatus(message) {
  document.getElementById('status').innerText = message;
}
