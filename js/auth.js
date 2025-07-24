// === Настройки авторизации ===
let GOOGLE_CLIENT_ID = localStorage.getItem('googleClientId') || '';
let accessToken = '';

// Сохранить Client ID
function saveClientId() {
  const clientId = document.getElementById('googleClientId').value.trim();
  if (clientId) {
    localStorage.setItem('googleClientId', clientId);
    GOOGLE_CLIENT_ID = clientId;
    showStatus("✅ Client ID сохранён!");
  } else {
    showStatus("❌ Введите Client ID");
  }
}

// Авторизация через Google
function authenticate() {
  if (!GOOGLE_CLIENT_ID) {
    showStatus("❌ Сначала вставь Client ID!");
    return;
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}&` +
    `redirect_uri=https://mavrish123.github.io/mini-fabula/&` +
    `response_type=token&` +
    `scope=https://www.googleapis.com/auth/drive.file`;

  window.location = authUrl;
}

// Очистить авторизацию
function clearAuth() {
  localStorage.removeItem('googleAccessToken');
  localStorage.removeItem('googleTokenExpiry');
  accessToken = '';
  showStatus("✅ Авторизация очищена");
}

// Проверка токена из URL и сохранение
function checkTokenFromUrl() {
  const hash = window.location.hash;
  if (hash) {
    // Получаем токен из URL после авторизации
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    const expiresIn = params.get('expires_in'); // время жизни токена (в секундах)
    
    if (token) {
      accessToken = token;
      // Сохраняем токен и время истечения
      const expiryTime = Date.now() + (expiresIn ? parseInt(expiresIn) * 1000 : 3600000);
      localStorage.setItem('googleAccessToken', token);
      localStorage.setItem('googleTokenExpiry', expiryTime.toString());
      
      showStatus("✅ Авторизация успешна! Токен сохранён.");
      // Очищаем URL от токена
      window.history.replaceState({}, document.title, "/");
      
      // Загрузить папки после авторизации
      setTimeout(() => {
        loadFolders();
      }, 1000);
    }
  } else {
    // Проверяем, есть ли сохранённый токен
    const savedToken = localStorage.getItem('googleAccessToken');
    const expiry = localStorage.getItem('googleTokenExpiry');
    
    if (savedToken && expiry) {
      const expiryTime = parseInt(expiry);
      // Проверяем, не истёк ли токен
      if (Date.now() < expiryTime) {
        accessToken = savedToken;
        showStatus("✅ Авторизация восстановлена из сохранённого токена");
        
        // Загрузить папки
        setTimeout(() => {
          loadFolders();
        }, 1000);
      } else {
        // Токен истёк
        localStorage.removeItem('googleAccessToken');
        localStorage.removeItem('googleTokenExpiry');
        showStatus("⏰ Токен истёк. Пожалуйста, авторизуйтесь снова");
      }
    }
  }
}
