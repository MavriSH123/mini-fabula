// === Основная логика приложения ===

// Загрузить текст при открытии страницы
document.addEventListener('DOMContentLoaded', function() {
  const savedText = localStorage.getItem('fabulaText');
  if (savedText) {
    document.getElementById('editor').value = savedText;
  }

  // Проверить токен при загрузке страницы
  checkTokenFromUrl();

  // Автосохранение каждые 10 секунд
  setInterval(() => {
    const text = document.getElementById('editor').value;
    localStorage.setItem('fabulaText', text);
  }, 10000);
});
